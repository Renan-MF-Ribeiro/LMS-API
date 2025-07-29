const { Features } = require('./model')
const _messages = require('../../../utils/messages')
const { getDbCurrentFeatures } = require('../../../utils/features')
const { getAppMaxFileSize } = require('../../../utils/files');
const { removeFromCache } = require('../../../utils/cache/store');

module.exports = {
    async update(req, res) {
        let features = await getDbCurrentFeatures(req);

        if (features?._id) {
            features = await Features.findByIdAndUpdate(features._id, req.body, { new: true })
        } else {
            features = await Features.create(req.body)
        }

        removeFromCache('/theme/features');

        if (features.mentoring && !(await Channel.countDocuments({ type: 'mentoring' }))) {
            await Channel.create({
                enabled: true,
                tags: ['ELEGE_geral'],
                banners: [],
                idSections: [],
                title: 'Mentorias',
                position: 99,
                type: 'mentoring'
            });
        }

        if (features.news && !(await Channel.countDocuments({ type: 'news' }))) {
            await Channel.create({
                enabled: true,
                tags: ['ELEGE_geral'],
                banners: [],
                idSections: [],
                title: 'Notícias',
                position: 99,
                type: 'news'
            });
        }


        return _messages.success(res, req, features)
    },

    async getFeatures(req, res) {
        const features = await getDbCurrentFeatures(req);
        const maxFileSize = getAppMaxFileSize();

        features.maxFileSize = maxFileSize.size;
        features.maxFileSizeBytes = maxFileSize.bytes;

        _messages.success(res, req, features);
    }
}
