const { ConfigModel, ConfigTypes, SegmentationConfigModel } = require('./model');

module.exports = {
    async getConfiguration(type) {
        return (await ConfigModel.findOne({ type }))?.value ?? null;
    },

    async saveConfiguration(type, value) {
        return await ConfigModel.updateOne({ type }, { value }, { upsert: true, new: true });
    },

    async getSegmentation() {
        const config = await SegmentationConfigModel.findOne();

        return config || (await SegmentationConfigModel.create({}));
    },

    async checkExceptionExists(exception, _segmentation) {
        const segmentation = _segmentation || await module.exports.getSegmentation();

        const isSameName = segmentation.value.exceptions.some((e) => {
            return !e._id.equals(exception?._id) && e.name === exception.name;
        });
        const isSameIssuer = segmentation.value.exceptions.some((e) => {
            return !e._id.equals(exception?._id) && e.issuer === exception.issuer;
        });

        if (isSameName || isSameIssuer) {
            const isSameNameError = 'Já existe uma exceção com esse nome';
            const isSameIssuerError = 'Já existe uma exceção para o campo da carga informado';

            return {
                error: isSameName ? isSameNameError : isSameIssuerError,
            };
        }
    },
};
