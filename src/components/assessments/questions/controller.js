const { Question } = require('./model')
const { Alternative } = require('../alternatives/model')
const { Category } = require('../categories/model')
const _messages = require('../../../utils/messages')
const _business = require('../business')
const _functions = require('../../../utils/functions')

module.exports = {
    async returnQuestions (req, res) {
        try {
            const { skip, limit } = _functions.pagination(req)
            const { order, sort } = _functions.ordernation(req)
            const { id, categoryId } = req.params
            const searchBy = req.query.searchBy

            const total = await Question
                .find({
                    idEvaluation: { $eq: id },
                    deleted: { $eq: 0 },
                    repealed: { $eq: 0 },
                }).countDocuments()

            const questions = await Question
                .find(
                    searchBy
                        ? Number(categoryId) !== 1
                            ? {
                                idEvaluation: { $eq: id },
                                $or: [
                                    { description: { $regex: searchBy, $options: 'i' } },
                                ],
                                idCategory: { $eq: categoryId },
                                deleted: { $eq: 0 },
                            }
                            : {
                                idEvaluation: { $eq: id },
                                $or: [{ description: { $regex: searchBy, $options: 'i' } }],
                                deleted: { $eq: 0 },
                            }
                        : Number(categoryId) !== 1
                            ? {
                                idCategory: { $eq: categoryId },
                                deleted: { $eq: 0 },
                            }
                            : {
                                idEvaluation: { $eq: id },
                                deleted: { $eq: 0 },
                                repealed: { $eq: 0 },
                            },
                )
                .populate('idCategory', 'description')
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: questions,
                total,
            })
        } catch (error) {
            console.error(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'questions', 'returnQuestions')
        }
    },

    async createQuestion (req, res) {
        try {
            const { idCategory, description, idEvaluation } = req.body
            const verify = await Question.find({
                description: { $eq: description },
                idEvaluation: { $eq: idEvaluation },
                deleted: { $eq: 0 },
            })

            if (verify.length === 0) {
                let alert = ''
                const category = await Category.findOne({
                    _id: { $eq: idCategory },
                })
                const totalQuestions = await Question.find({
                    idCategory: { $eq: idCategory },
                    deleted: { $eq: 0 },
                    repealed: { $eq: 0 },
                })
                if (category.amountOfQuestions > totalQuestions.length + 1) {
                    alert = `${totalQuestions.length + 1} de ${category.amountOfQuestions} questões gravadas para a categoria. É necessário cadastrar no mínimo mais ${category.amountOfQuestions - (totalQuestions.length + 1)} ${category.amountOfQuestions - (totalQuestions.length + 1) > 1 ? 'questões' : 'questão'}.`
                    await Category.findOneAndUpdate({ _id: category._id }, { amountOfQuestions: totalQuestions.length })
                }
                const objQuestion = { ...req.body }
                const { idEvaluation } = await Category.findOne({ _id: { $eq: idCategory } })
                objQuestion.idEvaluation = idEvaluation
                const alternativeCreated = await Question.create(objQuestion)
                const question = await Question.findById(alternativeCreated._id).populate('idCategory', 'description')

                _messages.success(res, req, question, 'questions', 'createQuestion', alternativeCreated, [], true, 'CREATE')
            } else {
                _messages.badRequest(res, req, 'Essa questão já foi cadastrada!', 'Essa questão já foi cadastrada!', 'questions', 'createQuestion')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'questions', 'createQuestion')
        }
    },

    async updateQuestion (req, res) {
        try {
            let alert = ''
            const category = await Category.findOne({
                _id: { $eq: req.body.idCategory },
            })
            const totalQuestions = await Question.find({
                idCategory: { $eq: req.body.idCategory },
                deleted: { $eq: 0 },
                repealed: { $eq: 0 },
            })
            if (category.amountOfQuestions > totalQuestions.length + 1) {
                alert = `${totalQuestions.length + 1} de ${category.amountOfQuestions} questões gravadas para a categoria. É necessário cadastrar no mínimo mais ${category.amountOfQuestions - (totalQuestions.length + 1)} ${category.amountOfQuestions - (totalQuestions.length + 1) > 1 ? 'questões' : 'questão'}.`
            }
            const { _id } = req.body
            await _business.updateAndRepealedQuestion(_id, req.body)
            _messages.success(res, req, alert, 'Atualização de dados', 'questions', 'updateQuestion', [], [], true, 'UPDATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'questions', 'updateQuestion')
        }
    },

    async deleteQuestion (req, res) {
        try {
            const { id } = req.params
            await Question.findByIdAndUpdate(id, { deleted: 1 })
            _messages.success(res, req, 'Deletado com sucesso', 'Exclusão de dados', 'questions', 'deleteQuestion', [], [], true, 'DELETE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'questions', 'deleteQuestion')
        }
    },

    async rigthAnswer (req, res) {
        try {
            const { idQuestion, idAlternative } = req.body

            const foundQuestion = await Question.findOne({ _id: idQuestion })

            let newData = await Question.findByIdAndUpdate(idQuestion, { rigthAnswer: idAlternative }, { new: true })

            await Alternative.findByIdAndUpdate(foundQuestion.rigthAnswer, { correct: false })

            await Alternative.findByIdAndUpdate(idAlternative, { correct: true })


            _messages.success(res, req, 'Atualizado com sucesso', 'Atualização de dados', 'questions', 'rigthAnswer', newData, true, 'UPDATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'questions', 'rigthAnswer')
        }
    },

    async changeStatus (req, res) {
        try {
            const { active, _id } = req.body
            const oldData = await Question.findByIdAndUpdate(_id, { active })
            const newData = await Question.find({ _id: { $eq: _id } })
            _messages.success(res, req, 'Atualizado com sucesso', 'Atualização de dados', 'questions', 'changeStatus', newData, oldData, true, 'UPDATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'questions', 'changeStatus')
        }
    },

    async updateFeedback (req, res) {
        try {
            const { idQuestion, feedback } = req.body


            if (idQuestion) {
                const feedbackBody = { positive: feedback.positive, negative: feedback.negative }
                await Question.findByIdAndUpdate(idQuestion, { feedback: feedbackBody })

                _messages.success(res, req, 'Cadastro com sucesso', 'Criação de dados', 'feedbackQuestion', 'updateFeedback', feedbackBody, [], true, 'UPDATE')
            } else {
                _messages.badRequest(res, req, 'Questão não localizada!', 'Nenhuma questão foi localizada', 'questions', 'updateFeedback')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'questions', 'updateFeedback')
        }
    },

}
