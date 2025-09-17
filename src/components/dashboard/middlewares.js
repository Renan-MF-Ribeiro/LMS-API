const ApiError = require("../../errors/ApiError");
const { getUserByToken } = require("../../utils/functions");
const { Log } = require("../logs/model");

async function requestUserMiddleware(req, res, next) {
    const user = await getUserByToken(req);

    if (!user) throw new ApiError("User not found", 401);

    req.user = user;

    next();
}

async function logRequestMiddleware(req, res, next) {
    const originalSend = res.send;

    const type = (req.method === 'DELETE' || req.url.includes('delete'))
        ? 'DELETE'
        : req.method === 'POST'
            ? 'CREATE'
            : req.method === 'PUT'
                ? 'UPDATE'
                : null;

    res.send = async function (responseBody) {
        try {
            await Log.create({
                dataOld: req.body,
                dataNew: responseBody,
                user: req.user._id,
                type: type,
                message: 'Atualização de dados',
                component: 'dashboard',
                route: req.url,
                ip: req.ip
            });
        } catch (err) {
            console.error('Error logging dashboard request:', err);
        }

        return originalSend.call(this, responseBody);
    };

    next();
}

module.exports = {
    requestUserMiddleware,
    logRequestMiddleware
};
