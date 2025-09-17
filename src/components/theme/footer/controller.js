const { Footer } = require('./model')
const _messages = require('../../../utils/messages')
const { removeFromCache } = require('../../../utils/cache/store')

module.exports = {
    async update(req, res) {
        let footer = await Footer.findOne({}).sort({ createdAt: -1 })
        if (footer) {
            footer = await Footer.findByIdAndUpdate(footer._id, req.body)
        } else {
            footer = await Footer.create(req.body)
        }

        removeFromCache('/theme/footer');

        return _messages.success(res, req, footer)
    },

    async getFooter(req, res) {
        const data = await Footer.findOne({}).sort({ _id: -1 })
        _messages.success(res, req, data);
    }
}
