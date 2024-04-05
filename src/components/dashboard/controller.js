const { DashConfig } = require('./model')
const _messages = require('../../utils/messages')
const { pagination, ordernation } = require('../../utils/functions')


module.exports = {
    async create(req, res) {
        try {
            const data = req.body
            const dashConfig = await DashConfig.create(data)
            _messages.success(res, req, dashConfig)
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'dashboard', 'create')
        }
    },

    async list(req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const total = await DashConfig.find(
                searchBy
                    ? {
                        title: { $regex: searchBy, $options: 'i' },
                    }
                    : {}
            ).countDocuments();

            const configs = await DashConfig.find(
                searchBy
                    ? {
                        title: { $regex: searchBy, $options: 'i' },
                    }
                    : {}
            )
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));
            _messages.success(res, req, {
                data: configs,
                total,
            })
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'dashboard', 'list')
        }
    },

    async update(req, res) {
        try {
            const data = req.body
            console.log(data)
            const dashConfig = await DashConfig.findByIdAndUpdate(data._id, data)
            _messages.success(res, req, dashConfig)
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'dashboard', 'update')
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.body
            const dashConfig = await DashConfig.findByIdAndDelete(id)
            _messages.success(res, req, dashConfig)
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'dashboard', 'update')
        }
    },
}
