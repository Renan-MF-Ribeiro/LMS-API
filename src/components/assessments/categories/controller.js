const { Category } = require('./model')
const { Evaluation } = require('../model')
const { Question } = require('../questions/model')
const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')

module.exports = {

    async returnCategories (req, res) {
        try {
            const { id } = req.params
            const { skip, limit } = _functions.pagination(req)
            const { order, sort } = _functions.ordernation(req)

            const total = await Category
                .find({
                    idEvaluation: { $eq: id },
                    deleted: { $eq: 0 },
                }).countDocuments()

            const categories = await Category
                .find({
                    idEvaluation: { $eq: id },
                    deleted: { $eq: 0 },
                })
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: categories,
                total,
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'categories', 'returnCategories')
        }
    },

    async createCategory (req, res) {
        try {
            const { idEvaluation, description } = req.body
            const verify = await Category
                .find(
                    {
                        description: { $eq: description },
                        idEvaluation: { $eq: idEvaluation },
                        active: { $eq: 1 },
                        deleted: 0,
                    },
                )

            if (verify.length === 0) {
                const category = await Category.create(req.body)
                const { categories } = await Evaluation.findOne({ _id: { $eq: idEvaluation } })
                categories.push(category._id)
                await Evaluation.findByIdAndUpdate(idEvaluation, { categories })
                _messages.success(res, req, 'Cadastrado com sucesso', 'Exclusão de dados', 'categories', 'createCategory', category, [], true, 'CREATE')
            } else {
                _messages.badRequest(res, req, 'Já existe uma categoria cadastrada com essa descrição para essa avaliação', 'Já existe uma categoria cadastrada com essa descrição', 'categories', 'createCategory')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'categories', 'createCategory')
        }
    },

    async updateCategory (req, res) {
        try {
            const { _id } = req.body
            const oldData = await Category.findByIdAndUpdate(_id, req.body)
            const newData = await Category.find({ _id: { $eq: _id } })
            _messages.success(res, req, 'Atualizado com sucesso', 'Atualização de dados', 'categories', 'updateCategory', newData, oldData, true, 'UPDATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'categories', 'updateCategory')
        }
    },

    async returnCategoriesActives (req, res) {
        try {
            const { id } = req.params
            const categories = await Category
                .find({ idEvaluation: { $eq: id }, active: { $eq: 1 }, deleted: { $eq: 0 } })
            _messages.success(res, req, categories)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'categories', 'returnCategoriesActives')
        }
    },

    async deleteCategory (req, res) {
        try {
            const { id } = req.params
            const question = await Question.find({
                idCategory: { $eq: id },
                deleted: { $eq: 0 },
            })

            // if (question.length === 0) {
            await Category.findByIdAndUpdate(id, { deleted: 1 })
            await Question.updateMany({ idCategory: { $eq: id }, deleted: { $eq: 0 } }, { deleted: 1 })
            _messages.success(res, req, 'Excluído com sucesso', 'Exclusão de dados', 'categories', 'deleteCategory', [], [], true, 'DELETE')
            // } else {
            //    _messages.badRequest(res, req, 'Existe questões para essa categoria', 'Não é possível realizar a exclusão, pois existem questões vinculadas a categoria', 'categories', 'deleteCategory')
            // }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'categories', 'deleteCategory')
        }
    },
}
