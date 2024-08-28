const { Log } = require('../components/logs/model');
const { User } = require('../components/users/model');
const ApiError = require('../errors/ApiError');
const _messages = require('./messages');

class SCORMUploadError extends Error {
    constructor(message, code) {
        super(message);
        this.message = message;
        this.code = code;
    }

    toJSON() {
        return {
            code: this.code,
            message: this.message,
        };
    }
}

function handleError(res, req, error) {
    console.log(error)
    switch (error?.response?.status) {
        case 400: {
            return _messages.badRequest(res, req, error, error.response.data);
        }

        case 403: {
            return _messages.forbidden(res, req, error, error.response.data);
        }

        case 404: {
            return _messages.notFound(res, req, error, error.response.data);
        }

        case 409: {
            return _messages.conflict(res, req, error, error.response.data);
        }

        default: {
            return _messages.internalServer(
                res,
                req,
                error,
                error.response?.data
            );
        }
    }
}

const errorHandler = async (err, req, res, next) => {
    if (!err.config?.skipDbLog) {
        try {
            let user;
            const token = req.headers.authorization;

            if (token) {
                try {
                    var { data } = _auth.decodeToken(token);
                    user = await User.findOne({ _id: { $eq: data.ref } });
                } catch { }
            }

            const userLogin = req.body?.login ?? user?.networkLogin ?? null;
            const userId = user?._id ?? null;

            const log = await Log.create({
                user: userId,
                type: 'ERROR',
                message: err.message,
                component: 'errorHandler',
                route: req.originalUrl,
                ip: req.ip,
                login: userLogin,
                deviceType: req.body?.deviceType ?? null,
                browserDetails: req.body?.browserDetails ?? req.header?.['user-agent'] ?? null,
            });

            console.error(new Date(), log._id, req.originalUrl, err);
        } catch (saveError) {
            console.error(new Date(), req.originalUrl, err);
            console.error(new Date(), req.originalUrl, 'Unable to save log on database', saveError);
        }
    } else {
        console.error(new Date(), req.originalUrl, err);
    }

    if (err instanceof ApiError) {
        const { message, data } = err.json();
        return res.status(err.statusCode).json({ message, data });
    }

    res.status(500).send('Algo deu errado. Faça um novo acesso');
};

module.exports = {
    SCORM_UPLOAD: {
        INVALID_MANIFEST: new SCORMUploadError(
            'O imsmanifest.xml é inválido.',
            23400
        ),

        NO_MANIFEST: new SCORMUploadError(
            'Pacote não possui imsmanifest.xml.',
            23404
        ),

        INVALID_PACKAGE: new SCORMUploadError('Arquivo corrompido.', 23422),
        UNEXPECTED_IDENTIFIER: new SCORMUploadError(
            'O identificador do item está divergente.',
            23424
        ),
    },
    handleError,
    errorHandler,
};
