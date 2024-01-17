const _messages = require('../../../utils/messages')
const { Alternative } = require('./model')
const { Question } = require('../questions/model')
const { HistoricEvaluation } = require('../model')
const _business = require('../business')
const _functions = require('../../../utils/functions')

module.exports = {

    async createAlternative (req, res) {
        try {
            const { idQuestion, description } = req.body
            const verify = await Alternative
                .find({
                    description: { $eq: description },
                    idQuestion: { $eq: idQuestion },
                    deleted: 0,
                })

            if (verify.length === 0) {
                const alternativeCreated = await Alternative.create(req.body)
                const { alternatives } = await Question.findOne({ _id: { $eq: idQuestion } })
                alternatives.push(alternativeCreated._id)
                await Question.findByIdAndUpdate(idQuestion, { alternatives })

                _messages.success(res, req, 'Cadastro com sucesso', 'Criação de dados', 'alternatives', 'createAlternative', alternativeCreated, [], true, 'CREATE')
            } else {
                _messages.badRequest(res, req, 'Essa alternativa já foi cadastrada para essa questão!', 'Essa alternativa já foi cadastrada para essa questão!', 'alternatives', 'createAlternative')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'alternatives', 'createAlternative')
        }
    },

    async updateAlternative (req, res) {
        try {
            const { _id, description } = req.body
            const verify = await Alternative
                .find({
                    description: { $eq: description },
                    deleted: 0,
                })
            if (verify.length === 0) {
                const oldData = await Alternative.findByIdAndUpdate(_id, req.body)
                const newData = await Alternative.find({ _id: { $eq: _id } })

                const respondida = await HistoricEvaluation.find({ questions: newData[0].idQuestion })

                if (respondida != '') {
                    _business.updateAndRepealedQuestion(newData[0].idQuestion, {})
                }

                _messages.success(res, req, 'Atualizado com sucesso', 'Atualização de dados', 'alternatives', 'updateAlternative', newData, oldData, true, 'UPDATE')
            } else {
                _messages.badRequest(res, req, 'Essa alternativa já foi cadastrada para essa questão!', 'Essa alternativa já foi cadastrada para essa questão!', 'alternatives', 'updateAlternative')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'alternatives', 'updateAlternative')
        }
    },

    async getAlternatives (req, res) {
        try {
            const { skip, limit } = _functions.pagination(req)
            const { order, sort } = _functions.ordernation(req)
            const { id } = req.params

            const total = await Alternative
                .find({
                    idQuestion: { $eq: id },
                    deleted: { $eq: 0 },
                }).countDocuments()

            const alternatives = await Alternative
                .find({
                    idQuestion: { $eq: id },
                    deleted: { $eq: 0 },
                })
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: alternatives,
                total,
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'alternatives', 'getAlternatives')
        }
    },

    async deleteAlternative (req, res) {
        try {
            const { id } = req.params
            await Alternative.findByIdAndUpdate(id, { deleted: 1 })
            _messages.success(res, req, 'Excluído com sucesso', 'Exclusão de dados', 'alternatives', 'deleteAlternative', [], [], true, 'DELETE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'alternatives', 'deleteAlternative')
        }
    },
}
