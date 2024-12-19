const { Avatar } = require('./model');
const { DOMAIN, AZURE_BLOB_URL } = process.env;
const _messages = require('../../../utils/messages');
const { azureBlob } = require('../../../utils/files');

module.exports = {
    async getAllAvatars(req, res) {
        try {
            const avatars = await Avatar.find({ active: true }, '-active');

            _messages.success(res, req, avatars);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'avatars',
                'getAllAvatars'
            );
        }
    },
    async findAvatar(req, res) {
        const { id } = req.params;
        try {
            const avatar = await Avatar.findOne({ _id: id, active: true }, '-active');
            if (!avatar) {
                return _messages.notFound(res, req, null, 'Este avatar não existe');
            }
            _messages.success(res, req, avatar);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'avatars',
                'findAvatar'
            );
        }
    },
    async createAvatar(req, res) {
        const body = JSON.parse(req.fields?.payload) ?? null;

        try {
            if (Object.keys(req?.files)?.length > 0) {
                const key = Object.keys(req.files)[0];
                const file = req.files[key];

                let pathAzure = await azureBlob(file, 'avatars', false, 'lmsassetsanon');
                body.image = pathAzure.replace(AZURE_BLOB_URL, DOMAIN);
            } 

            const avatar = await Avatar.create(body);
            _messages.success(res, req, avatar);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'avatars',
                'createAvatar'
            );
        }
    },

    async updateAvatar(req, res) {
        const body = req.body;
        const { id } = req.params;

        try {
            const doesAvatarExist = await Avatar.findById({ _id: id });
            if (!doesAvatarExist) {
                return _messages.notFound(res, req, null, 'Este avatar não existe');
            }

            if (Object.keys(req?.files)?.length > 0) {
                const key = Object.keys(req.files)[0];
                const file = req.files[key];

                let pathAzure = await azureBlob(file, 'avatars', false, 'lmsassetsanon');
                body.image = pathAzure.replace(AZURE_BLOB_URL, DOMAIN);
            } 
            const avatar = await Avatar.findByIdAndUpdate(id, body, { new: true });

            return _messages.success(res, req, avatar);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'avatars',
                'updateAvatar'
            );
        }
    },

    async deleteAvatar(req, res) {
        const { id } = req.params;

        try {
            const doesAvatarExist = await Avatar.findById({ _id: id });
            if (!doesAvatarExist) {
                return _messages.notFound(res, req, null, 'Este avatar não existe');
            }

            const avatar = await Avatar.findOneAndUpdate({ _id: id }, set({ active: false }), {
                $new: true,
            });
           return  _messages.success(res, req, avatar);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'avatars',
                'updateAvatar'
            );
        }
    },
};
