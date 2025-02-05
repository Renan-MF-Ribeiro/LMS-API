const { generateSASToken } = require("./auth");

function getTokenDomain() {
    return process.env.DOMAIN.includes('localhost')
        ? undefined
        : `.${process.env.DOMAIN.replace(/https?:\/\//g, '')}`;
}

async function addSASTokenToResponse(res) {
    const isLocal = process.env.DOMAIN.includes('localhost');

    const { token, expiresOn } = generateSASToken();

    res.cookie('SAS', token, {
        domain: getTokenDomain(),
        httpOnly: false,
        secure: !isLocal,
        sameSite: isLocal ? 'lax' : 'none',
        expires: expiresOn,
        priority: 'high',
    });

    return { token }
}

async function clearSASTokenFromResponse(res) {
    const isLocal = process.env.DOMAIN.includes('localhost');

    res.cookie('SAS', '', {
        domain: getTokenDomain(),
        httpOnly: false,
        secure: !isLocal,
        sameSite: isLocal ? 'lax' : 'none',
        expires: new Date(0),
        priority: 'high',
    });
}

module.exports = {
    addSASTokenToResponse,
    clearSASTokenFromResponse,
}