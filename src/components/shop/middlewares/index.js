const ApiError = require('../../../errors/ApiError');
const { getUserByToken } = require('../../../utils/functions');
const { getTagsElegiblesByToken } = require('../../sections/business');

async function shopMiddleware(req, res, next) {
    const isFeatureEnabled = Boolean(req.features?.gamefication && req.features?.gameficationCoins);

    if (!isFeatureEnabled) {
        throw new ApiError('Feature not enabled', 403, undefined, { skipDbLog: true });
    }

    req.user = await getUserByToken(req);

    if (!req.user) {
        throw new ApiError('Unauthorized', 401);
    }

    req.eligibilities = (await getTagsElegiblesByToken(req) ?? [])
        .concat(req.user?.groupsAD ?? [])
        .map(tag => tag.value ?? tag);

    next();
}

module.exports = {
    shopMiddleware,
};