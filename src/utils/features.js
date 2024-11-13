const { Features } = require("../components/theme/features/model");
const { log } = require("./logger");

const FEATURES_APP_KEY = 'features';

async function getDbCurrentFeatures(app) {
    log('GETTING DB CURRENT FEATURES');
    const features = await Features.findOne({}, {}, {
        sort: { _id: -1 }
    });

    return features ?? null
}

function getAppCurrentFeatures(app) {
    return app.get(FEATURES_APP_KEY);
}

function setAppCurrentFeatures(app, features) {
    log('SETTING APP CURRENT FEATURES');
    app.set(FEATURES_APP_KEY, features);
}

module.exports = {
    getDbCurrentFeatures,
    setAppCurrentFeatures,
    getAppCurrentFeatures,
}