const { generateSASToken } = require("./auth");

async function addSASTokenToResponse(res) {
    const isLocal = process.env.DOMAIN.includes('localhost');

    const { token, expiresOn } = generateSASToken();

    res.cookie('SAS', token, {
        httpOnly: false,
        secure: !isLocal,
        sameSite: isLocal ? 'lax' : 'none',
        expires: expiresOn,
        priority: 'high',
    });

    return { token }
}

module.exports = {
    addSASTokenToResponse,
}