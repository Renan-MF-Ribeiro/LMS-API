const { getDbCurrentFeatures } = require("../../utils/features");
const { forbidden } = require("../../utils/messages");

async function userRegisterMustBeEnabled(req, res, next) {
    const features = await getDbCurrentFeatures();

    if (!features?.registerUser) {
        return forbidden(
            res,
            req,
            'Cadastro desabilitado',
            'Não foi possível cadastrar o usuário.',
            'users',
            'signup'
        );
    }

    next();
}

module.exports = {
    userRegisterMustBeEnabled,
};