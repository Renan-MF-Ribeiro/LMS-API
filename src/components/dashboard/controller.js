const { DashConfig } = require('./model')
const _messages = require('../../utils/messages')
const { pagination, ordernation } = require('../../utils/functions')
const { getDashboardConfig } = require('../config/business')
const ApiError = require('../../errors/ApiError')


module.exports = {
    async create(req, res) {
        const data = req.body
        const dashConfig = await DashConfig.create(data)
        _messages.success(res, req, dashConfig)
    },

    async list(req, res) {
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
    },

    async update(req, res) {
        const data = req.body
        const dashConfig = await DashConfig.findByIdAndUpdate(data._id, data, { new: true })
        _messages.success(res, req, dashConfig)
    },

    async delete(req, res) {
        const { id } = req.body
        const dashConfig = await DashConfig.findByIdAndDelete(id)
        _messages.success(res, req, dashConfig)
    },

    async getDashboardTabs(req, res) {
        const dashboardConfig = await getDashboardConfig();

        if (!dashboardConfig.value.tabs) {
            throw new ApiError('No dashboard tabs found', 500);
        }

        res.json({ tabs: dashboardConfig.value.tabs });
    }
}
