class SCORMUploadError extends Error {
    constructor (message, code) {
        super(message)
        this.message = message
        this.code = code
    }

    toJSON () {
        return {
            code: this.code,
            message: this.message,
        }
    }
}

module.exports = {
    SCORM_UPLOAD: {
        INVALID_MANIFEST: new SCORMUploadError(
            'O imsmanifest.xml é inválido.',
            23400,
        ),

        NO_MANIFEST: new SCORMUploadError(
            'Pacote não possui imsmanifest.xml.',
            23404,
        ),

        INVALID_PACKAGE: new SCORMUploadError(
            'Arquivo corrompido.',
            23422,
        ),
    },
}
