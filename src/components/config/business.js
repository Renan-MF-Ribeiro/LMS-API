const {
    ConfigModel,
    SegmentationConfigModel,
    MessengerConfigModel,
    CronConfigModel,
    UsersDataConfigModel,
    CompanyConfigModel,
    MatrixConfigModel,
    MATRIX_VISIBILITY_MODE,
    ChatIAConfigModel,
    DashboardConfigModel,
} = require('./model');

const { getUserByToken } = require('../../utils/functions');
const { User } = require('../users/model');

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
        const segmentation = _segmentation || (await module.exports.getSegmentation());

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

    isSegmentationException(user, segmentation) {
        return segmentation.exceptions.some((e) => user[e.issuer] === e.value);
    },

    async handleSegmentationOnCreate(req, payload) {
        const user = await getUserByToken(req);
        const issuer = req.segmentation.rule.issuer;

        if (user?.[issuer]) {
            (payload || req.body).owner = user[issuer];
        }
    },

    handleSegmentationOnQuery(req, field, ...queries) {
        if (!req?.segmentation.isException) {
            const _field = field === 'issuer' ? req.segmentation.rule.issuer : 'owner';

            queries.forEach((query) => {
                if (!query?.$or) {
                    query.$or = [
                        {
                            [_field]: {
                                $exists: false,
                            },
                        },
                    ];
                }

                query.$or.push({
                    [_field]: {
                        $eq: req.segmentation.owner,
                    },
                });
            });
        }
    },

    async getMessengerConfig() {
        const config = await MessengerConfigModel.findOne().sort({ _id: -1 });

        if (config) return config.value;

        console.log('Creating messenger config');
        return (await MessengerConfigModel.create({}))?.value;
    },

    async getCronConfig() {
        const config = await CronConfigModel.findOne().sort({ _id: -1 });

        if (config) return config.value;

        console.log('Creating cron config');
        return (await CronConfigModel.create({}))?.value;
    },

    async getUsersDataConfig() {
        const config = await UsersDataConfigModel.findOne().sort({ _id: -1 });

        if (config) return config.value;

        console.log('Creating users data config');
        return (await UsersDataConfigModel.create({}))?.value;
    },

    async getCompanyConfig() {
        const config = await CompanyConfigModel.findOne().sort({ _id: -1 });

        if (config) return config.value;

        console.log('Creating company config');
        return (await CompanyConfigModel.create({}))?.value;
    },

    async getMatrixConfig() {
        const config = await MatrixConfigModel.findOne();

        return config || (await MatrixConfigModel.create({}));
    },

    async getChatIAConfig() {
        const config = await ChatIAConfigModel.findOne();

        return config || (await ChatIAConfigModel.create({}));
    },
    
    async getDashboardConfig() {
        const config = await DashboardConfigModel.findOne();

        return config || (await DashboardConfigModel.create({}));
    },

    async findUsersByMatrixConfig(applier, searchBy, limit) {
        const { value } = await module.exports.getMatrixConfig();
        const query = {
            $and: [
                {
                    status: /^ativo$/i,
                },
                {
                    _id: { $ne: applier._id },
                },
            ],
        };

        if (searchBy) {
            query.$and.push({
                $or: [
                    { name: { $regex: searchBy, $options: 'i' } },
                    { email: { $regex: searchBy, $options: 'i' } },
                    { networkLogin: { $regex: searchBy, $options: 'i' } },
                ],
            });
        }
        
        if (value.visibilityMode === MATRIX_VISIBILITY_MODE.MANAGER) {
            query.$and.push({ managerRegistration: applier.registration });
        }
        // TODO
        // else if (value.visibilityMode === MATRIX_VISIBILITY_MODE.ELIGIBILITY) {
        //     const tags = applier.groupsAD.filter((tag) => !String(tag).startsWith('PERFIL_'));
        //     query.$and.push({ groupsAD: { $in: tags } });
        // }
        if(limit){
            return User.find(query).limit(limit);
        }
        return User.find(query);
    },
};
