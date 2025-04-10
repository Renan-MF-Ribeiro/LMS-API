const { HeaderConfig } = require('./model');
const _messages = require('../../../utils/messages');

module.exports = {
    async getConfig(req, res) {
        try {
            let headerConfig = await HeaderConfig.findOne({ deleted: { $ne: true } }).select('-createdAt -updatedAt -__v ').lean();

            const modulesInHeaderMobile = headerConfig?.modulesInHeaderMobile || [];
            if (headerConfig) {
                if (Array.isArray(modulesInHeaderMobile) && modulesInHeaderMobile.length > 0) {
                    const top = modulesInHeaderMobile.slice(0, 1);
                    const bottom = modulesInHeaderMobile.slice(1, 4);
                    const overflow = modulesInHeaderMobile.filter((_, index) => index > 3);

                    headerConfig = {
                        ...headerConfig,
                        modulesInHeaderMobile: {
                            top,
                            bottom,
                            overflow
                        }
                    };
                }
            }

            return _messages.success(res, req, headerConfig);
        } catch (error) {
            console.error(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'headerConfig',
                'getConfig'
            );
        }
    },

    async CreateOrUpdate(req, res) {
        try {
            const headerConfig = await HeaderConfig.findOne({ deleted: { $ne: true } });
            if (headerConfig) {
                headerConfig.modulesInHeader = req.body.modulesInHeader;
                headerConfig.modulesInHeaderMobile = req.body.modulesInHeaderMobile;
                await HeaderConfig.findByIdAndUpdate(headerConfig._id, headerConfig);
            } else {
                await HeaderConfig.create(req.body);
            }

            return _messages.success(res, req, headerConfig);

        } catch (error) {
            console.error(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'headerConfig',
                'createOrUpdate'
            );
        }
    }
};
