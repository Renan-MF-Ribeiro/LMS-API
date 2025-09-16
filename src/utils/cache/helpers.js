const environment = require("../../environment");

const defaultCacheUnit = 15 * 60; // 15 minutes in seconds

function getCacheTTLmsFromUnit(unit = defaultCacheUnit) {
    return unit * environment.CACHE_UNIT;
}

module.exports = {
    defaultCacheUnit,
    getCacheTTLmsFromUnit
};