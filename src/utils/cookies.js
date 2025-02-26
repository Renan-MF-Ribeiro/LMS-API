const { generateSASToken } = require("./auth");

function getTokenDomain() {
    return process.env.DOMAIN.includes('localhost')
        ? undefined
        : `${process.env.DOMAIN.replace(/https?:\/\//g, '')}`;
}

function getCookieProps() {
    const isLocal = process.env.DOMAIN.includes('localhost');

    return {
        domain: getTokenDomain(),
        httpOnly: false,
        secure: !isLocal,
        sameSite: isLocal ? 'lax' : 'none',
        priority: 'high',
        encode: String,
    };
}

async function addSASTokenToResponse(res) {
    const { token, expiresOn } = generateSASToken();

    res.cookie('SAS', token, {
        ...getCookieProps(),
        expires: expiresOn,
    });

    return { token }
}

async function clearSASTokenFromResponse(res) {
    res.cookie('SAS', '', {
        ...getCookieProps(),
        expires: new Date(0),
    });
}

function saveStrategyOnCookie(req, res, next) {
    res.cookie('strategyName', req.query.strategy ?? 'saml', {
        ...getCookieProps(),
    });
    next();
}

module.exports = {
    getCookieProps,
    addSASTokenToResponse,
    clearSASTokenFromResponse,
    saveStrategyOnCookie
}