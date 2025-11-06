const { forbidden } = require("../../utils/messages");
const { ConfigLogin } = require("../theme/login-config/model");
const { getLoginConfig } = require("./business");

async function userRegisterMustBeEnabled(req, res, next) {
    const loginConfig = await getLoginConfig();

    if (
        !loginConfig?.formLogin?.enabled ||
        !loginConfig?.formLogin?.registerUser
    ) {
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