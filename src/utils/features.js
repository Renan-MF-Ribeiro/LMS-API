const { Features } = require("../components/theme/features/model");

async function getCurrentFeatures() {
    console.log('GETTING CURRENT FEATURES...');

    const features = await Features.findOne({}, {}, {
        sort: { _id: -1 }
    });

    return features ?? null
}

async function isFeatureEnabled(featureName) {
    const currentFeatures = await getCurrentFeatures();

    return Boolean(currentFeatures?.[featureName]) === true;
}

module.exports = {
    getCurrentFeatures,
    isFeatureEnabled,
}