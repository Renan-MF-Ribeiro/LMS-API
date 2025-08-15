const _messages = require('../../../utils/messages')
const { uploadVimeoAsync } = require('../../../utils/files')
const { Welcome } = require('./model')
const { removeFromCache } = require('../../../utils/cache/store')

module.exports = {
    async getConfig(req, res) {
        const welcome = await Welcome.findOne({ __t: 'welcome', deleted: { $ne: true } })
            .select('-createdAt -updatedAt -__v ')

        return _messages.success(res, req, welcome)
    },

    async createOrUpdate(req, res) {
        const body = JSON.parse(req.fields.body);
        const fileArray = Object.keys(req.files).map(key => req.files[key]);
        const welcomeVideoIndex = fileArray.findIndex(el => el.name === body.welcomeVideo);

        const welcome = (await Welcome.findOne({ __t: 'welcome', deleted: { $ne: true } }))
            ?? (await Welcome.create({ ...body, __t: 'welcome', deleted: false }));

        if (body.welcomeVideo.startsWith('http')) {
            welcome.welcomeVideo = body.welcomeVideo;
        } else {
            welcome.welcomeVideo = await uploadVimeoAsync(fileArray[welcomeVideoIndex]);
        }

        await welcome.save();

        removeFromCache('/theme/welcome');

        return _messages.success(res, req, welcome);
    }
}