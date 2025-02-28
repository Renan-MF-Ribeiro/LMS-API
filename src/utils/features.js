const { Features } = require("../components/theme/features/model");
const { log } = require("./logger");

async function getDbCurrentFeatures(req) {
    if (req?.features) return req.features;

    log('GETTING DB CURRENT FEATURES');
    const features = await Features.findOne({}, {}, {
        sort: { _id: -1 }
    }).lean();

    if (req) req.features = features;

    return features ?? null
}

module.exports = {
    getDbCurrentFeatures,
}
