const { Menu } = require('./model')
const _messages = require('../../../utils/messages')
const { validateMenuAccess, verifyDefaultItems } = require('./bussiness')
const {
    getUserByToken
} = require('../../../utils/functions');
module.exports = {
    async update (req, res) {
        try {

            let menu = await Menu.findOne({ _id: req.body._id }).sort({ createdAt: -1 })
            if (menu) {
                menu = await Menu.findByIdAndUpdate(menu._id, req.body)
            } else {
                menu = await Menu.create(req.body)
            }

            return _messages.success(res, req, menu)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'menu',
                'createOrUpdate',
            )
        }

    },

    async getMenu (req, res) {
        try {
            const data = await Menu.find({}).sort({ index: 1 });
            _messages.success(res, req, data);
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Menu',
                'getMenu',
            )
        }
    },

    async getFilteredMenu (req, res) {
        try {

            const data = await verifyDefaultItems()
            const user = await getUserByToken(req)
            const menu = await validateMenuAccess(data, req, user.groupsAD)
            _messages.success(res, req, menu);
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Menu',
                'getFilteredMenu',
            )
        }
    }
}
