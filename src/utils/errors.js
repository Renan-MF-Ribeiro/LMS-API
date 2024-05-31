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
};
