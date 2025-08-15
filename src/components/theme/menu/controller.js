const { Menu } = require('./model')
const _messages = require('../../../utils/messages')
const { validateMenuAccess, verifyDefaultItems } = require('./bussiness')
const {
    getUserByToken
} = require('../../../utils/functions');
module.exports = {
    async update(req, res) {
        let menu = await Menu.findOne({ _id: req.body._id }).sort({ createdAt: -1 })

        if (menu) {
            menu = await Menu.findByIdAndUpdate(menu._id, req.body)
        } else {
            menu = await Menu.create(req.body)
        }

        removeFromCache('/theme/menu', true);

        return _messages.success(res, req, menu)
    },

    async getMenu(req, res) {
        const data = await Menu.find({}).sort({ index: 1 });

        _messages.success(res, req, data);
    },

    async getFilteredMenu(req, res) {
        const data = await verifyDefaultItems()
        const user = await getUserByToken(req)
        const menu = await validateMenuAccess(data, req, user.groupsAD)
        
        _messages.success(res, req, menu);
    }
}
