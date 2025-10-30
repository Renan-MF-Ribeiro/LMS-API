const { ConfigLogin } = require("../theme/login-config/model");

async function userRegisterMustBeEnabled(req, res, next) {
    const loginConfig = await ConfigLogin.findOne({}).sort({ _id: -1 }).lean();

    if (!loginConfig?.formLogin?.registerUser) {
        return res.status(403).send('Não foi possível cadastrar o usuário');
    }

    next();
}

module.exports = {
    userRegisterMustBeEnabled,
};