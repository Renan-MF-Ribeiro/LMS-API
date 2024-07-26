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


module.exports = {
    async createEvaluation (req, res) {
        try {
            const { description } = req.body

            const evaluationCheck = await Evaluation.find({
                description: { $eq: description },
                deleted: { $eq: 0 },
            }).countDocuments()

            if (evaluationCheck < 1) {
                const evaluation = await Evaluation
                    .create(req.body)

                _messages.success(res, req, evaluation, 'Criação de dados', 'assessments', 'createEvaluation', evaluation, [], true, 'CREATE')
            } else {
                _messages.badRequest(res, req, 'Avaliação já está cadastrada', 'Essa avaliação já está cadastrada', 'assessments', 'createEvaluation')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'createEvaluation')
        }
    },

    async returnEvaluation (req, res) {
        try {
            const { id } = req.params
            const user = await _functions.getUserByToken(req)
            const { order, sort } = _functions.ordernation(req)
            const { idEvaluation } = await Item.findOne({ _id: { $eq: id } }, 'idEvaluation')
            const { description, attempts, duration, categories } = await Evaluation
                .findOne({
                    _id: { $eq: idEvaluation },
                    deleted: { $eq: 0 },

                })
                .populate({ path: 'categories', match: { deleted: { $eq: 0 }, active: { $eq: 1 }, } })

            const timeDuration = await HistoricEvaluation.find({
                user: { $eq: user._id },
                idEvaluation: { $eq: idEvaluation }
            })
                .sort({ [order]: sort })

            var result = null
            var amountOfQuestions = null
            const totalQuestions = await Question.countDocuments({
                idEvaluation: { $eq: idEvaluation },
                deleted: { $eq: false },
            })

            if (timeDuration.length) {
                const { amountQuestionsCorrect } = timeDuration[0]
                amountOfQuestions = timeDuration[0].amountOfQuestions
                result = await _business.calculateRatingEvaluation(amountQuestionsCorrect, amountOfQuestions)
            } else {
                amountOfQuestions = 0
                for (const category of categories) {
                    if (category.amountOfQuestions < 0) {
                        const amountOfQuestionsByCategory = await Question.countDocuments({
                            idCategory: { $eq: category._id },
                            deleted: { $eq: 0 },
                            active: { $eq: 1 }
                        })
                        amountOfQuestions += amountOfQuestionsByCategory
                    } else {
                        amountOfQuestions += category.amountOfQuestions
                    }
                }
            }
            const attemptsNotCompleted = timeDuration.filter(historic => historic.lessonStatus == SCORMLessonStatus.NOT_ATTEMPTED)
            const attemptsCompleted = timeDuration.filter(historic => historic.lessonStatus != SCORMLessonStatus.NOT_ATTEMPTED)

            const obj = {
                description,
                attempts,
                duration,
                amountOfQuestions: amountOfQuestions > totalQuestions ? totalQuestions : amountOfQuestions,
                attemptsHistory: attemptsCompleted.length,
                historicDuration: attemptsNotCompleted.length > 0 ? attemptsNotCompleted[0].duration : null,
                values: result != null ? result.values : { correct: 0, incorrect: 0 },
            }

            _messages.success(res, req, obj)
        } catch (error) {
            console.error(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'returnEvaluation')
        }
    },

    async returnEvaluationWithDetails (req, res) {
        try {
            const { id } = req.params
            const { userId } = req.query
            const { idEvaluation, passingScore } = await Item.findOne({ _id: { $eq: id } })
            const historicEvaluation = await HistoricEvaluation.find({ user: { $eq: userId }, idEvaluation: { $eq: idEvaluation }, item: { $eq: id } }).populate({
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
            _messages.success(res, req, allAttempts)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'returnEvaluation')
        }
    },

    async getAllEvaluations (req, res) {
        try {
            const { skip, limit } = _functions.pagination(req)
            const { order, sort } = _functions.ordernation(req)
            const searchBy = req.query.searchBy

            const total = await Evaluation.find(searchBy ? {
                $or: [
                    { description: { $regex: searchBy, $options: 'i' } },
                ],
                deleted: { $eq: 0 },
            } : {
                deleted: { $eq: 0 },
            }).countDocuments()

            const evaluations = await Evaluation
                .find(searchBy ? {
                    $or: [
                        { description: { $regex: searchBy, $options: 'i' } },
                    ],
                    deleted: { $eq: 0 },
                } : {
                    deleted: { $eq: 0 },
                })
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: evaluations,
                total,
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
            const evaluation = await Evaluation.findById(id)

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
            const dataFile = await _files.readXLSX(file.path)
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



    async questionResponse (req, res) {
        try {
            const { _id, idQuestion, idAlternative } = req.body
            const { answers, amountQuestionsCorrect } = await HistoricEvaluation.findOne({ _id: { $eq: _id } })
            const { rigthAnswer } = await Question.findOne({ _id: { $eq: idQuestion } })
            let arrAnswers = [...answers]
            let correct = false
            let amountCorrect = amountQuestionsCorrect

            if (idAlternative === rigthAnswer?.toString()) {
                correct = true
                amountCorrect++
            }

            const questionAnswered = arrAnswers.find(answer => answer.idQuestion == idQuestion)
            if (questionAnswered) {

                arrAnswers = arrAnswers.map(answer => {
                    if (answer.idQuestion == idQuestion) {
                        answer.idAlternative = idAlternative
                        answer.updatedAt = _functions.getDateToday()
                        answer.correct = correct
                    }
                    return answer
                })

                amountCorrect = arrAnswers.filter((answer) => answer.correct).length
            } else {

                arrAnswers.push({
                    idQuestion,
                    idAlternative,
                    correct,
                    createdAt: _functions.getDateToday(),
                })

            }

            await HistoricEvaluation.findByIdAndUpdate(_id, {
                answers: arrAnswers,
                amountQuestionsAnswered: arrAnswers.length,
                amountQuestionsCorrect: amountCorrect,
            })


            return _messages.success(res, req, null)
        } catch (error) {
            console.error(error)
            return _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'questionResponse')
        }
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
        try {
            const { itemID } = req.body
            const user = await _functions.getUserByToken(req)
            const { passingScore, idEvaluation, title } = await Item.findOne({ _id: { $eq: itemID } })

            const history = await HistoricEvaluation.find({ user: { $eq: user._id }, idEvaluation: { $eq: idEvaluation } }).sort({ createdAt: 'desc' })
            const historic = history[0]
            const { attempts, feedback } = await Evaluation.findOne({ _id: { $eq: idEvaluation } })
            const result = await _business.calculateRatingEvaluation(historic.amountQuestionsCorrect, historic.amountOfQuestions)
            const questions = await _business.returnsQuestionsAnswered(historic.answers, feedback)
            result.questions = questions
            result.finished = true
            result.passingScore = passingScore
            result.attemptsHistory = history.length
            result.attempts = attempts
            result.title = title


            const tracking = await Tracking.findOne({ item: itemID, userLogin: user.networkLogin });
            await processExamTracking(historic, passingScore, attempts, tracking)

            _messages.success(res, req, result)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'finalizeEvaluation')
        }
    },


    async getAllQuestions (req, res) {
        try {
            const { id, idItem } = req.params
            const user = await _functions.getUserByToken(req)

            const historicEvaluationArray = await HistoricEvaluation.find({
                item: idItem,
                user: user._id,
                lessonStatus: { $eq: SCORMLessonStatus.NOT_ATTEMPTED }
            })
                .sort({ createdAt: 'desc' })
                .limit(1)

            const historicEvaluation = historicEvaluationArray[0]
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
                let categories = await Category.find({ idEvaluation: id, deleted: 0, active: 1 })

                let questionsAnswers = null

                const evaluation = await Evaluation.findById(id)

                if (evaluation.randomQuestions) {
                    categories = _functions.returnSliceDataRandom(categories, 0, categories.length)
                }

                const { questions, amount } = await _business.returnQuestionsByCategory(categories)

                const questionHistoric = []
                for (question of questions) {
                    const categorie = question.filter(q => q._id)

                    questionHistoric.push(...categorie)
                }

                const { _id } = await HistoricEvaluation.create({
                    idEvaluation: id,
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

        }
        catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'evaluations',
                'getAllQuestions')
        }
    },

    async getQuestionById (req, res) {
        try {
            const { id } = req.params
            const question = await Question
                .findOne(
                    { _id: { $eq: id } },
                    ['description', 'idCategory'],
                )
                .populate('alternatives', 'description')

            const { randomQuestions } = await Category.findById(question.idCategory).select('randomQuestions')

            if (randomQuestions) {
                question['alternatives'] = _functions.returnSliceDataRandom(question['alternatives'], 0, question['alternatives'].length)
            }

            return _messages.success(res, req, question)
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'evaluations',
                'getQuestionById')
        }

    }
}
