const { Evaluation, HistoricEvaluation, LogsEvaluation } = require('./model')
const { Category } = require('./categories/model')
const { Question } = require('./questions/model')
const { ExamTracking } = require('../tracking/model')

const { Alternative } = require('./alternatives/model')
const { Item } = require('../items/model')
const { returnLinkTrailByItem } = require('../trails/controller')
const userModel = require('../users/model')

const xapi = require('../../utils/xApi')
const _messages = require('../../utils/messages')
const _business = require('./business')
const _functions = require('../../utils/functions')
const _files = require('../../utils/files')

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
                .populate('categories')

            const timeDuration = await HistoricEvaluation.find({ user: { $eq: user._id }, idEvaluation: { $eq: idEvaluation } }).sort({ [order]: sort })

            var result = null
            if (timeDuration.length) {
                const { amountQuestionsCorrect, amountOfQuestions } = timeDuration[0]

                result = await _business.calculateRatingEvaluation(amountQuestionsCorrect, amountOfQuestions)
            } else {
                var amountOfQuestions = 0
                for (const category of categories) {
                    amountOfQuestions += category.amountOfQuestions
                }
            }

            const obj = {
                description,
                attempts,
                duration,
                amountOfQuestions,
                attemptsHistory: timeDuration.length,
                historicDuration: timeDuration.length > 0 ? timeDuration[0].duration : null,
                values: result != null ? result.values : { correct: 0, incorrect: 0 },
            }

            _messages.success(res, req, obj)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'returnEvaluation')
        }
    },

    async returnEvaluationWithDetails (req, res) {
        try {
            const { id } = req.params
            const { userId } = req.query
            const { idEvaluation, passingScore } = await Item.findOne({ _id: { $eq: id } })
            const historicEvaluation = await HistoricEvaluation.find({ user: { $eq: userId }, idEvaluation: { $eq: idEvaluation }, item: { $eq: id }}).populate({
            path:'questions',			
            populate: { 
                path:'alternatives',
                model: 'alternatives' 
            }})
            .lean()
            const objHistoricEvaluation = JSON.parse(JSON.stringify(historicEvaluation))
            const allAttempts = []
            for(let evaluation of objHistoricEvaluation){
                let questionObj = {}
                let questions = []
                
                for(let question of evaluation.questions){
                    let correctAnswerWasGiven = false;
                    let alternatives = []
                    let alternativeObj = {}
                    let answerDate
                    let indexOfAnswer
                    for(let answer of evaluation.answers){
                        indexOfAnswer = question.alternatives.findIndex(v => {
                            return String(v._id) == String(answer.idAlternative)
                        })
                        if(indexOfAnswer > -1){
                            answerDate = new Date(answer.createdAt + 'Z')
                            question.alternatives[indexOfAnswer].isUserGuess = true
                        }
                    }
                    
                    question.alternatives.map(v=>{
                        if(v.isUserGuess){
                            correctAnswerWasGiven = v.correct === v.isUserGuess ? true : false;
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
                    questions: questions
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
                const evaluations = await Evaluation.findByIdAndUpdate(_id, req.body)
                const newData = await Evaluation.find({
                    _id: { $eq: _id },
                })
                _messages.success(res, req, evaluations, 'Atualização de dados', 'assessments', 'updateEvaluation', newData, evaluations, true, 'UPDATE')
            } else {
                _messages.badRequest(res, req, 'Avaliação com essa descrição já existe', 'Já existe uma avaliação com essa descrição!', 'assessments', 'updateEvaluation')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'updateEvaluation')
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
                                })

                                if (question.length === 0) {
                                    if (description && description.length <= 500) {
                                        const alternatives = questions[p].slice(positionAlternative, positionCorrectAlternative)
                                        const positionLetter = _functions.returnsLetterPosition(questions[p][positionCorrectAlternative]) // RETORNA A POSIÇÃO DA LETRA DA ALTERNATIVA CORRETA
                                        const idAlternatives = []
                                        const objQuestion = {
                                            idCategory: categoryCreated._id,
                                            idEvaluation,
                                            description,
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
                _messages.success(res, req, 'Importado com sucessos, dados repetidos ou em branco não serão gravados!', 'Importado com sucesso', 'assessments', 'importQuestions', [], [], true, 'CREATE')
            } else {
                _messages.badRequest(res, req, 'Erro de estruturação', 'A estrutura do excel não está adequada para a importação', 'evaluations', 'importQuestions')
            }
            // } else {
            //    _messages.badRequest(res, req, 'Erro de validação', 'Já existe questões ou categorias cadastradas nessa avaliação', 'evaluations', 'importQuestions')
            // }
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'importQuestions')
        }
    },

    async getActivesEvaluations (req, res) {
        try {
            const evaluations = await Evaluation.find({ active: { $eq: 1 } })
            _messages.success(res, req, evaluations)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'getActivesEvluations')
        }
    },

    async startEvaluation (req, res) {
        try {
            const { id, idItem } = req.params
            const user = await _functions.getUserByToken(req)
            const evaluation = await Evaluation.findOne({ _id: { $eq: id } })

            const item = await Item.findById(idItem)

            const evaluationPerformed = await HistoricEvaluation
                .find({
                    idEvaluation: { $eq: id },
                    item: { $eq: idItem },
                    user: { $eq: user._id },
                })

            if (!evaluation.attempts || evaluationPerformed.length < evaluation.attempts) {
                const { categories } = await _business.returnCategoriesOfEvaluation(id)
                const { questions, amount } = await _business.returnRandomQuestionsByCategory(categories)
                if (questions.length > 0) {
                    const { _id } = await _business.insertEvaluationHistory(questions, amount, id, idItem, user._id, evaluation.duration)
                    await LogsEvaluation.create({ idHistoricEvaluation: _id })

                    const completeUser = await userModel.User.findById(user._id)

                    const linkTrailItem = await returnLinkTrailByItem(idItem)
                    const bag = xapi.initTinCan(linkTrailItem.urlTrail, linkTrailItem.urlItem, completeUser)
                    const attempt = evaluationPerformed.length + 1
                    await xapi.sendAttemptAssessment(bag, item, completeUser, attempt)

                    questions[0].number = 1
                    _messages.success(res, req, {
                        question: questions[0],
                        _id,
                    })
                } else {
                    _messages.badRequest(res, req, 'Avaliação sem questão', 'Não é possível iniciar uma avaliação sem questões configuradas', 'evaluations', 'startEvaluation')
                }
            } else {
                _messages.badRequest(res, req, 'Você atingiu o número máximo de tentativas para fazer essa avaliação.', 'Você atingiu o número máximo de tentativas para fazer essa avaliação.', 'evaluations', 'startEvaluation')
            }
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'startEvaluation')
        }
    },

    async questionResponse (req, res) {
        try {
            const { _id, idQuestion, idAlternative, idItem } = req.body
            const { idEvaluation, answers, amountQuestionsCorrect, createdAt } = await HistoricEvaluation.findOne({ _id: { $eq: _id } })
            const { feedback } = await Evaluation.findOne({ _id: { $eq: idEvaluation } })
            const { rigthAnswer } = await Question.findOne({ _id: { $eq: idQuestion } })
            const result = {}
            const arrAnswers = [...answers]
            let correct = false
            let amountCorrect = amountQuestionsCorrect

            if (idAlternative === rigthAnswer.toString()) {
                correct = true
                amountCorrect++
            }

            if (feedback) {
                result.correct = correct
                result.rigthAnswer = rigthAnswer
            } else {
                result.correct = correct
            }

            arrAnswers.push({
                idQuestion,
                idAlternative,
                correct,
                createdAt: _functions.getDateToday(),
            })

            await HistoricEvaluation.findByIdAndUpdate(_id, {
                answers: arrAnswers,
                amountQuestionsAnswered: arrAnswers.length,
                amountQuestionsCorrect: amountCorrect,
            })

            const questionTincan = await Question
                .findOne(
                    { _id: { $eq: idQuestion } },
                    ['description', 'idEvaluation'],
                )
                .populate('alternatives', 'description')

            const allQuestion = await Question
                .find(
                    {
                        idEvaluation: { $eq: questionTincan.idEvaluation },
                        deleted: 0,
                    },

                    ['description'],
                ).sort({ _id: 1 })

            let numPergunta = null
            for (var i = 0; i < allQuestion.length; i++) {
                if (allQuestion[i].id == idQuestion) {
                    numPergunta = (i + 1)
                }
            }

            const arrChoices = []

            const allChoices = await Alternative
                .find(
                    {
                        idQuestion: { $eq: idQuestion },
                        deleted: 0,
                    },

                    ['description'],
                ).sort({ _id: 1 })

            // # Calculando o tempo de resposta do aluno:
            let durationCalc = null

            if (arrAnswers.length > 1) {
                durationCalc = new Date(arrAnswers[arrAnswers.length - 1].createdAt) - new Date(arrAnswers[arrAnswers.length - 2].createdAt)
            } else {
                durationCalc = new Date(_functions.getDateToday()) - new Date(createdAt)
            }

            durationCalc = _functions.duration(durationCalc)

            const correctResponsesPattern = []
            let choiceUser = null

            for (var i = 0; i < allChoices.length; i++) {
                arrChoices.push({
                    id: (i + 1),
                    description: {
                        'en-US': allChoices[i].description,
                    },
                })

                if (rigthAnswer.toString() == allChoices[i]._id) {
                    correctResponsesPattern.push(String(i + 1))
                }

                if (idAlternative == allChoices[i]._id) {
                    choiceUser = String(i + 1)
                }
            }

            const completeUser = await _functions.getUserByToken(req)

            const evaluationPerformed = await HistoricEvaluation
                .find({
                    idEvaluation: { $eq: _id },
                    item: { $eq: idItem },
                    user: { $eq: completeUser._id },
                })

            const attempt = evaluationPerformed.length + 1

            const linkTrailItem = await returnLinkTrailByItem(idItem)
            const bag = xapi.initTinCan(linkTrailItem.urlTrail, linkTrailItem.urlItem, completeUser)

            await xapi.sendAnsweredAssessment(bag, attempt, completeUser, questionTincan.description, numPergunta, arrChoices, correctResponsesPattern, choiceUser, durationCalc)

            _messages.success(res, req, result)
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'questionResponse')
        }
    },

    async nextQuestion (req, res) {
        try {
            const { id } = req.params
            const user = await _functions.getUserByToken(req)
            const { amountQuestionsAnswered, questions, amountOfQuestions, amountQuestionsCorrect, answers, item, duration } = await HistoricEvaluation
                .findOne({ _id: { $eq: id } })

            const { passingScore } = await Item.findOne({ _id: { $eq: item } })
            const result = await _business.calculateRatingEvaluation(amountQuestionsCorrect, amountOfQuestions)

            if (amountQuestionsAnswered === amountOfQuestions) {
                const { idEvaluation, title } = await Item.findOne({ _id: { $eq: item } }, ['idEvaluation', 'title'])
                const { attempts } = await Evaluation.findOne({ _id: { $eq: idEvaluation } })
                const history = await HistoricEvaluation.find({ user: { $eq: user._id }, idEvaluation: { $eq: idEvaluation } })
                const questions = await _business.returnsQuestionsAnswered(answers)
                result.questions = questions
                result.finished = true
                result.passingScore = passingScore
                result.attemptsHistory = history.length
                result.attempts = attempts

                const completeUser = await userModel.User.findById(user._id)

                const linkTrailItem = await returnLinkTrailByItem(String(item))
                const bag = xapi.initTinCan(linkTrailItem.urlTrail, linkTrailItem.urlItem, completeUser)

                await xapi.sendCompleteAssessment(bag, title, (result.values.correct >= passingScore), (result.values.correct / 100), (result.attemptsHistory + 1))

                _messages.success(res, req, result)
            } else {
                const question = await Question
                    .findOne(
                        { _id: { $eq: questions[amountQuestionsAnswered] } },
                        ['description'],
                    )
                    .populate({path:'alternatives', match: { deleted: { $eq: 0 }}, select: 'description deleted'})

                question.number = amountQuestionsAnswered + 1
                _messages.success(res, req, {
                    question: question,
                    duration,
                })
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'nextQuestion')
        }
    },

    async checkEvaluationStarted (req, res) {
        try {
            const { idItem, id } = req.params
            const user = await _functions.getUserByToken(req)
            let started = false

            const historic = await HistoricEvaluation
                .find({
                    idEvaluation: { $eq: id },
                    item: { $eq: idItem },
                    user: { $eq: user._id },
                })
                .sort({ createdAt: 'desc' })
                .limit(1)

            if (historic.length > 0) {
                if (historic[0].amountQuestionsAnswered < historic[0].amountOfQuestions) started = true
                _messages.success(res, req, {
                    _id: historic[0]._id,
                    started,
                })
            } else {
                _messages.success(res, req, {
                    started,
                })
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'checkEvaluation')
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
            const { evaluationID, itemID } = req.body
            const { passingScore } = await Item.findOne({ _id: { $eq: itemID } })
            const user = await _functions.getUserByToken(req)

            const { amountQuestionsCorrect, amountOfQuestions, answers } = await HistoricEvaluation.findOne({
                _id: { $eq: evaluationID },
            })

            await HistoricEvaluation.findByIdAndUpdate(evaluationID, { amountQuestionsAnswered: amountOfQuestions })
            const result = await _business.calculateRatingEvaluation(amountQuestionsCorrect, amountOfQuestions)
            const questions = await _business.returnsQuestionsAnswered(answers)
            result.questions = questions
            result.finished = true
            result.passingScore = passingScore

            if (result.values.correct >= passingScore) {
                await ExamTracking.findOneAndUpdate({ item: itemID, userLogin: user.networkLogin }, { lessonStatus: 'passed' })
            }

            _messages.success(res, req, result)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'evaluations', 'finalizeEvaluation')
        }
    },

}
