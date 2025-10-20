const { Evaluation, HistoricEvaluation, LogsEvaluation } = require('./model')
const { Category } = require('./categories/model')
const { Question } = require('./questions/model')
const { Alternative } = require('./alternatives/model')
const { Item } = require('../items/model')
const _messages = require('../../utils/messages')
const _business = require('./business')
const _functions = require('../../utils/functions')
const _files = require('../../utils/files')
const { Tracking, SCORMLessonStatus } = require('../tracking/model')
const { processExamTracking } = require('../tracking/business')
const { User } = require('../users/model')
const { handleSegmentationOnCreate, handleSegmentationOnQuery } = require('../config/business')
const { orderBy } = require('lodash')
const GamificationKafka = require('../gamification/kafka/broker')
const { EVENT_CATEGORY } = require('../gamification/model')
const { Trail } = require('../trails/model');
const { Types } = require('mongoose');
const ApiError = require('../../errors/ApiError');
const { userHasEligibilityForTrails } = require('../../utils/user');

async function checkEvaluationEligibility(userId, idEvaluation) {
    const items = await Item
        .find({ idEvaluation: new Types.ObjectId(idEvaluation), enabled: true, archive: { $ne: true } })
        .sort({ _id: -1 })
        .lean();

    if (!items?.length) throw new ApiError('Não possui elegibilidade e/ou item indisponível', 403);

    const trailsWithItem = await Trail.find({
        'items.itemID': { $in: items.map(i => i._id) },
    }).lean();

    if (!trailsWithItem.length) throw new ApiError('Não possui elegibilidade e/ou item indisponível', 403);

    const { hasEligibility, trails } = await userHasEligibilityForTrails(userId, trailsWithItem.map(t => t._id));

    if (!hasEligibility) throw new ApiError('Não possui elegibilidade e/ou item indisponível', 403);

    return { hasEligibility, trails };
}

async function checkEvaluationAttempts(userId, idEvaluation, idItem) {
    const [evaluation, totalUserAttempts] = await Promise.all([
        Evaluation
            .findOne({
                _id: new Types.ObjectId(idEvaluation),
                deleted: 0
            })
            .select('attempts'),
        HistoricEvaluation
            .countDocuments({
                user: new Types.ObjectId(userId),
                idEvaluation: new Types.ObjectId(idEvaluation),
                item: new Types.ObjectId(idItem),
                lessonStatus: { $ne: 'not attempted' },
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            })
    ]);

    if(!evaluation) throw new ApiError('Avaliação não encontrada', 404);

    const { attempts = 0 } = evaluation;

    if (attempts && attempts > 0 && totalUserAttempts >= attempts) throw new ApiError('Número máximo de tentativas atingido', 403);

    return { attempts, totalUserAttempts };
}

module.exports = {
    async createEvaluation (req, res) {
        try {
            const { description } = req.body

            const evaluationCheck = await Evaluation.find({
                description: { $eq: description },
                deleted: { $eq: 0 },
            }).countDocuments()

            if (evaluationCheck < 1) {

                if (req?.segmentation) {
                    await handleSegmentationOnCreate(req)
                }

                const evaluation = await Evaluation.create(req.body)

                _messages.success(res, req, evaluation, 'Criação de dados', 'assessments', 'createEvaluation', evaluation, [], true, 'CREATE')
            } else {
                _messages.badRequest(res, req, 'Avaliação já está cadastrada', 'Essa avaliação já está cadastrada', 'assessments', 'createEvaluation')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'createEvaluation')
        }
    },

    async returnEvaluation(req, res) {
        const { id } = req.params;

        const user = await _functions.getUserByToken(req);
        const { order, sort } = _functions.ordernation(req);
        const { idEvaluation } = await Item.findOne({ _id: { $eq: id } }, 'idEvaluation');

        await checkEvaluationEligibility(user._id, idEvaluation);

        const query = {
            $and: [{ _id: { $eq: idEvaluation } }, { deleted: { $eq: 0 } }],
        };

        const { description, attempts, duration, categories } = await Evaluation.findOne(
            query
        ).populate({ path: 'categories', match: { deleted: { $eq: 0 }, active: { $eq: 1 } } });

        const historicEvaluation = await HistoricEvaluation.find({
            user: { $eq: user._id },
            idEvaluation: { $eq: idEvaluation },
            item: { $eq: id },
            $or: [
                { expiredCompletion: { $exists: false } },
                { expiredCompletion: { $eq: null } },
            ],
        }).sort({ [order]: sort });

        let result = null;
        let amountOfQuestions = null;
        const totalQuestions = await Question.countDocuments({
            idEvaluation: { $eq: idEvaluation },
            deleted: { $eq: false },
        });

        if (historicEvaluation.length) {
            const { amountQuestionsCorrect } = historicEvaluation[0];
            amountOfQuestions = historicEvaluation[0].amountOfQuestions;
            result = await _business.calculateRatingEvaluation(
                amountQuestionsCorrect,
                amountOfQuestions
            );
        } else {
            amountOfQuestions = 0;
            for (const category of categories) {
                if (category.amountOfQuestions < 0) {
                    const amountOfQuestionsByCategory = await Question.countDocuments({
                        idCategory: { $eq: category._id },
                        deleted: { $eq: 0 },
                        active: { $eq: 1 },
                    });
                    amountOfQuestions += amountOfQuestionsByCategory;
                } else {
                    amountOfQuestions += category.amountOfQuestions;
                }
            }
        }
        const attemptsNotCompleted = historicEvaluation.filter(
            (historic) => historic.lessonStatus == SCORMLessonStatus.NOT_ATTEMPTED
        );
        const attemptsCompleted = historicEvaluation.filter(
            (historic) => historic.lessonStatus != SCORMLessonStatus.NOT_ATTEMPTED
        );

        const obj = {
            description,
            attempts,
            duration,
            amountOfQuestions:
                amountOfQuestions > totalQuestions ? totalQuestions : amountOfQuestions,
            attemptsHistory: attemptsCompleted.length,
            historicDuration:
                attemptsNotCompleted.length > 0 ? attemptsNotCompleted[0].duration : null,
            values: result != null ? result.values : { correct: 0, incorrect: 0 },
        };

        _messages.success(res, req, obj);
    },

    async returnEvaluationWithDetails (req, res) {
        try {
            const { id } = req.params
            const { userId } = req.query
            const { idEvaluation, passingScore } = await Item.findOne({ _id: { $eq: id } })
            const historicEvaluation = await HistoricEvaluation.find({
                user: { $eq: userId },
                idEvaluation: { $eq: idEvaluation },
                item: { $eq: id },
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ]
            }).populate({
                path: 'questions',
                populate: {
                    path: 'alternatives',
                    model: 'alternatives',
                },
            })
                .lean()
            const objHistoricEvaluation = JSON.parse(JSON.stringify(historicEvaluation))
            const allAttempts = []
            for (const evaluation of objHistoricEvaluation) {
                let questionObj = {}
                const questions = []

                for (const question of evaluation.questions) {
                    let correctAnswerWasGiven = false
                    const alternatives = []
                    let alternativeObj = {}
                    let answerDate
                    let indexOfAnswer
                    for (const answer of evaluation.answers) {
                        indexOfAnswer = question.alternatives.findIndex(v => {
                            return String(v._id) == String(answer.idAlternative)
                        })
                        if (indexOfAnswer > -1) {
                            answerDate = new Date(answer.createdAt + 'Z')
                            question.alternatives[indexOfAnswer].isUserGuess = true
                        }
                    }

                    question.alternatives.map(v => {
                        if (v.isUserGuess) {
                            correctAnswerWasGiven = v.correct === v.isUserGuess
                        }
                        alternativeObj = {
                            _id: v._id,
                            description: v.description,
                            idQuestion: v.idQuestion,
                            correct: v.correct,
                            isUserGuess: v.isUserGuess,
                        }
                        alternatives.push(alternativeObj)
                    })

                    questionObj = {
                        _id: question._id,
                        answerDate: answerDate,
                        description: question.description,
                        idQuestion: question.idQuestion,
                        correct: correctAnswerWasGiven,
                        alternatives: alternatives,
                    }
                    questions.push(questionObj)
                }
                const attempt = {
                    score: (100 * evaluation.amountQuestionsCorrect) / evaluation.amountOfQuestions,
                    evalStart: evaluation.createdAt,
                    evalEnd: evaluation.updatedAt,
                    passingScore: passingScore,
                    questions: questions,
                }
                allAttempts.push(attempt)
            }
            _messages.success(res, req, orderBy(allAttempts, ['evalEnd'], ['desc']))
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'returnEvaluation')
        }
    },

    async getAllEvaluations (req, res) {
        try {
            const { skip, limit } = _functions.pagination(req)
            const { order, sort } = _functions.ordernation(req)
            const searchBy = req.query.searchBy

            const query = {
                $and: [{
                    deleted: { $eq: 0 }
                }]
            }

            if (searchBy) {
                query.$and.push({
                    $or: [
                        { description: { $regex: searchBy, $options: 'i' } },
                    ]
                })
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const total = await Evaluation.find(query).countDocuments()

            const evaluations = await Evaluation
                .find(query)
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: evaluations,
                total
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'getAllEvaluations')
        }
    },

    async updateEvaluation (req, res) {
        try {
            const { _id } = req.body
            const evaluationCheck = await Evaluation.find({
                description: { $eq: req.body.description },
                _id: { $ne: req.body._id },
                deleted: { $eq: 0 },
            }).countDocuments()

            if (evaluationCheck < 1) {
                const evaluations = await Evaluation.findByIdAndUpdate(_id, { randomQuestions: req.body.randomQuestions, ...req.body }, { new: true })
                _messages.success(res, req, evaluations, 'Atualização de dados', 'assessments', 'updateEvaluation', evaluations, evaluations, true, 'UPDATE')
            } else {
                _messages.badRequest(res, req, 'Avaliação com essa descrição já existe', 'Já existe uma avaliação com essa descrição!', 'assessments', 'updateEvaluation')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'updateEvaluation')
        }
    },


    async getById (req, res) {
        try {
            const { id } = req.params

            const query = {
                $and: [{
                    _id: id
                }]
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const evaluation = await Evaluation.findOne(query)

            _messages.success(res, req, evaluation,)
        }
        catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'getById')
        }
    },

    async deleteEvaluation (req, res) {
        try {
            const { id } = req.params
            await Evaluation.findByIdAndUpdate(id, { deleted: 1 })

            _messages.success(res, req, 'Excluído com sucesso', 'Exclusão de dados', 'assessments', 'deleteEvaluation', [], [], true, 'DELETE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'deleteEvaluation')
        }
    },

    async importQuestions (req, res) {
        try {
            const { idEvaluation } = req.fields

            const file = req.files.file
            const dataFile = await _files.readXLSXAlternative(file.path)
            const header = dataFile[0] // GUARDA OS CAMPOS REFERENCE AO CABEÇALHO
            const positionQuestion = header.indexOf('Pergunta') // GUARDA POSIÇÃO APENAS PARA CONFERENCIA DA ESTRUTURA DO ARQUIVO
            const positionAlternative = header.indexOf('Alternativa A') // GUARDA POSIÇÃO APENAS PARA CONFERENCIA DA ESTRUTURA DO ARQUIVO
            const positionCategory = header.indexOf('Categoria') // GUARDA A POSIÇÃO CORRESPONDENTE AS CATEGORIAS
            const positionCorrectAlternative = header.indexOf('Alternativa Correta') // GUARDA A POSIÇÃO CORRESPONDENTE A ALTERNATIVA CORRETA
            const positionFeedbackPositive = header.indexOf('Feedback Positivo') // GUARDA A POSIÇÃO CORRESPONDENTE AO FEEDBACK POSITIVO
            const positionFeedbackNegative = header.indexOf('Feedback Negativo') // GUARDA A POSIÇÃO CORRESPONDENTE AO FEEDBACK NEGATIVO

            if (positionCategory >= 0 && positionCorrectAlternative >= 0 && positionQuestion >= 0 && positionAlternative >= 0) {
                const arrData = dataFile.slice(1) // REMOVE CABEÇALHO
                const idCategories = []
                const categories = _business.returnFileCategories(arrData, positionCategory) // RETORNA AS CATEGORIAS
                for (const p in categories) {
                    if (categories[p]) {
                        const questions = _business.returnFileQuestions(dataFile, positionCategory, categories[p])
                        var categoryCreated = await Category.findOne({
                            description: categories[p],
                            idEvaluation: idEvaluation,
                            deleted: 0,
                        })

                        if (categoryCreated == null) {
                            // REALIZA O CADASTRO DA CATEGORIA
                            categoryCreated = await Category.create({
                                description: categories[p],
                                idEvaluation: idEvaluation,
                                amountOfQuestions: questions.length,
                            })
                        }

                        idCategories.push(categoryCreated._id)

                        for (const p in questions) {
                            if (questions[p]) {
                                const description = questions[p][positionQuestion] // TITULO DA QUESTÃO
                                const question = await Question.find({
                                    description: { $eq: description },
                                    idEvaluation: { $eq: idEvaluation },
                                    deleted: 0,
                                    repealed: 0
                                })

                                if (question.length === 0) {
                                    if (description && description.length <= 1000) {
                                        const alternatives = questions[p].slice(positionAlternative, positionCorrectAlternative)
                                        const positionLetter = _functions.returnsLetterPosition(questions[p][positionCorrectAlternative]) // RETORNA A POSIÇÃO DA LETRA DA ALTERNATIVA CORRETA
                                        const idAlternatives = []
                                        const feedback = {
                                            positive: questions[p][positionFeedbackPositive],
                                            negative: questions[p][positionFeedbackNegative],
                                        }
                                        const objQuestion = {
                                            idCategory: categoryCreated._id,
                                            idEvaluation,
                                            description,
                                            feedback
                                        }

                                        // REALIZA O CADASTRO DA QUESTÃO
                                        const questionCreated = await Question.create(objQuestion)

                                        // REALIZA O CADASTRO DAS ALTERNATIVAS
                                        for (const p in alternatives) {
                                            if (alternatives[p]) {
                                                const objAlternative = {
                                                    description: alternatives[p],
                                                    idQuestion: questionCreated._id,
                                                    correct: parseInt(p) === positionLetter,
                                                }

                                                const alternativeCreated = await Alternative.create(objAlternative)

                                                if (parseInt(p) === positionLetter) await Question.findByIdAndUpdate(questionCreated._id, { rigthAnswer: alternativeCreated._id }) // VINCULA A RESPOSTA CORRETA NA QUESTAO

                                                idAlternatives.push(alternativeCreated._id)
                                            }
                                        }

                                        // VINCULA AS ALTERNATIVAS COM A QUESTAO
                                        await Question.findByIdAndUpdate(questionCreated._id, { alternatives: idAlternatives })
                                    }
                                }
                            }
                        }
                    }
                }

                // VINCULA O ID DA CATEGORIA NA AVALIAÇÃO
                await Evaluation.findByIdAndUpdate(idEvaluation, { categories: idCategories })
                return _messages.success(res, req, 'Importado com sucessos, dados repetidos ou em branco não serão gravados!', 'Importado com sucesso', 'assessments', 'importQuestions', [], [], true, 'CREATE')
            } else {
                return _messages.badRequest(res, req, 'Erro de estruturação', 'A estrutura do excel não está adequada para a importação', 'evaluations', 'importQuestions')
            }
            // } else {
            //    _messages.badRequest(res, req, 'Erro de validação', 'Já existe questões ou categorias cadastradas nessa avaliação', 'evaluations', 'importQuestions')
            // }
        } catch (error) {
            console.error(error)
            return _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'importQuestions')
        }
    },

    async getActivesEvaluations (req, res) {
        try {
            const evaluations = await Evaluation.find({ active: { $eq: 1 } })
            return _messages.success(res, req, evaluations)
        } catch (error) {
            return _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'getActivesEvluations')
        }
    },

    async questionResponse(req, res) {
        const { _id: historicEvaluationId, idQuestion, idAlternative } = req.body;

        const user = await _functions.getUserByToken(req);
        
        const [historic, question] = await Promise.all([
            HistoricEvaluation.findOne({ _id: historicEvaluationId, user: user._id }),
            Question.findOne({ _id: idQuestion })
        ]);

        if (!historic || !question) {
            throw new ApiError('Histórico ou questão não encontrados.', 404);
        }

        if (historic.lessonStatus !== 'not attempted') throw new ApiError('Avaliação já finalizada', 403);

        await checkEvaluationAttempts(user._id, historic.idEvaluation, historic.idItem);

        const isCorrect = idAlternative === question.rigthAnswer?.toString();
        const updatedAnswers = [...historic.answers];
        const existingAnswerIndex = updatedAnswers.findIndex((a) => a.idQuestion == idQuestion);
        const today = _functions.getDateToday();

        if (existingAnswerIndex !== -1) {
            updatedAnswers[existingAnswerIndex] = {
                ...updatedAnswers[existingAnswerIndex],
                idAlternative,
                updatedAt: today,
                correct: isCorrect,
            };
        } else {
            updatedAnswers.push({
                idQuestion,
                idAlternative,
                correct: isCorrect,
                createdAt: today,
            });
        }

        const amountCorrect = updatedAnswers.filter((a) => a.correct).length;

        await HistoricEvaluation.findByIdAndUpdate(historicEvaluationId, {
            answers: updatedAnswers,
            amountQuestionsAnswered: updatedAnswers.length,
            amountQuestionsCorrect: amountCorrect,
        });

        return _messages.success(res, req, null);
    },

    async nextQuestion (req, res) {
        try {
            const { id } = req.params
            const { duration } = await HistoricEvaluation.findOne({ _id: { $eq: id } })

            _messages.success(res, req, {
                duration,
            })
        } catch (error) {
            console.error(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'nextQuestion')
        }
    },

    async countdownEvaluation (req, res) {
        try {
            const { evaluationID, duration } = req.body

            const result = await HistoricEvaluation.findByIdAndUpdate(evaluationID, { duration: duration })

            _messages.success(res, req, result)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'finalizeEvaluation')
        }
    },

    async finalizeEvaluation (req, res) {
        const { itemID } = req.body
        
        const [user, item] = await Promise.all([
            _functions.getUserByToken(req),
            Item.findOne({ _id: { $eq: itemID } })
        ]);

        if (!item) throw new ApiError('Item não encontrado', 404);

        const { passingScore, idEvaluation, title } = item;

        const [history, evaluation] = await Promise.all([
            HistoricEvaluation.find({ user: { $eq: user._id }, idEvaluation: { $eq: idEvaluation } }).sort({ createdAt: 'desc' }),
            Evaluation.findOne({ _id: { $eq: idEvaluation } })
        ]);

        if (!history.length) throw new ApiError('Histórico de avaliação não encontrado', 404);
        
        if (!evaluation) throw new ApiError('Avaliação não encontrada', 404);

        const historic = history[0];
        
        if (historic.lessonStatus !== 'not attempted') throw new ApiError('Avaliação já finalizada', 403);
        
        const { attempts, feedback } = evaluation;
        
        const [result, questions] = await Promise.all([
            _business.calculateRatingEvaluation(historic.amountQuestionsCorrect, historic.amountOfQuestions),
            _business.returnsQuestionsAnswered(historic.answers, feedback)
        ]);
        
        result.questions = questions
        result.finished = true
        result.passingScore = passingScore
        result.attemptsHistory = history.length
        result.attempts = attempts
        result.title = title

        const tracking = await Tracking.findOne({
            item: itemID,
            userLogin: user.networkLogin,
            $or: [
                { expiredCompletion: { $exists: false } },
                { expiredCompletion: { $eq: null } },
            ]
        });
        
        const evaluationResult = await processExamTracking(historic, passingScore, attempts, tracking)

        await GamificationKafka.publishEventRuleValidation({
            events: [EVENT_CATEGORY.FINISHED_ITEM, EVENT_CATEGORY.FINISHED_EXAM_ITEM],
            identifier: user.networkLogin,
            meta: {
                tracking,
                evaluationResult,
            },
        });

        _messages.success(res, req, result)
    },

    async getAllQuestions(req, res) {
        const { id: idEvaluation, idItem } = req.params;

        const user = await _functions.getUserByToken(req)

        await checkEvaluationEligibility(user._id, idEvaluation);

        await checkEvaluationAttempts(user._id, idEvaluation, idItem);

        const historicEvaluation = await HistoricEvaluation.findOne({
            item: idItem,
            user: user._id,
            lessonStatus: { $eq: SCORMLessonStatus.NOT_ATTEMPTED }
        })
            .sort({ createdAt: 'desc' })
            .limit(1)

        if (historicEvaluation) {
            const sortedQuestions = await _business.returnQuestionsByCategoryFromHistoric(historicEvaluation.questions)

            questionsAnswers = historicEvaluation.answers
                .map(answer => ({
                    question: answer.idQuestion,
                    alternative: answer.idAlternative
                }))

            const result = {
                questions: sortedQuestions,
                amount: historicEvaluation.amountOfQuestions,
                questionsAnswers: questionsAnswers,
                historicEvaluationId: historicEvaluation._id
            }

            return _messages.success(res, req, result)

        } else {
            let categories = await Category.find({ idEvaluation, deleted: 0, active: 1 })

            let questionsAnswers = null

            const evaluation = await Evaluation.findById(idEvaluation)

            if (evaluation.randomQuestions) {
                categories = _functions.returnSliceDataRandom(categories, 0, categories.length)
            }

            const { questions, amount } = await _business.returnQuestionsByCategory(categories)

            const questionHistoric = questions.flatMap(question => question.filter(q => q._id));

            const { _id } = await HistoricEvaluation.create({
                idEvaluation,
                amountOfQuestions: amount,
                questions: questionHistoric,
                item: idItem,
                user: user._id,
                duration: evaluation.duration,
            })

            await LogsEvaluation.create({ idHistoricEvaluation: _id })

            const result = { questions, amount, questionsAnswers, historicEvaluationId: _id }

            return _messages.success(res, req, result)

        }
    },

    async getQuestionById(req, res) {
        const { id } = req.params

        const question = await Question
            .findOne(
                { _id: { $eq: id } },
                ['description', 'idCategory'],
            )
            .populate({ path: 'alternatives', match: { deleted: { $eq: 0 }, active: { $eq: 1 }, }, select: 'description' })

        const { randomQuestions, idEvaluation } = await Category.findById(question.idCategory).select('randomQuestions idEvaluation');

        const user = await _functions.getUserByToken(req);
        
        await checkEvaluationEligibility(user._id, idEvaluation);

        if (randomQuestions) {
            question['alternatives'] = _functions.returnSliceDataRandom(question['alternatives'], 0, question['alternatives'].length)
        }

        return _messages.success(res, req, question)
    }
}
