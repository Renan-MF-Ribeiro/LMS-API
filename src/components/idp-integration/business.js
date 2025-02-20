const _ = require("lodash");

const { log } = require("../../utils/logger");
const { getRequestStrategyName } = require("../../utils/passport");

const { IdpIntegrationModel } = require("./models");

async function getActiveIdpIntegrations(strategyName) {
    const idpIntegrations = await IdpIntegrationModel.find({
        active: true,
        ...(strategyName && { strategyName })
    });

    return idpIntegrations;
}

async function fetchIdpProfilesFromRequestObject(req) {
    const strategyName = getRequestStrategyName(req);
    const idpProfiles = new Set();

    log('fetchIdpProfilesFromRequestObject strategyName', strategyName);

    const idpIntegrations = await getActiveIdpIntegrations();

    if (!idpIntegrations?.length) {
        log('fetchIdpProfilesFromRequestObject no active idpIntegrations found');
        return { strategyName, idpProfiles: [], matchedKeysAndValues: [] }
    };

    const filteredIdpIntegrations = idpIntegrations.filter(idpIntegration => idpIntegration.strategyName === strategyName);
    log('fetchIdpProfilesFromRequestObject filteredIdpIntegrations', filteredIdpIntegrations);

    if (!filteredIdpIntegrations?.length) {
        log('fetchIdpProfilesFromRequestWithSamlObject no active idpIntegrations found for strategyName', strategyName);
        return { strategyName, idpProfiles: [], matchedKeysAndValues: [] }
    }

    const matchedKeysAndValues = [];

    for (const idpIntegration of filteredIdpIntegrations) {
        log('fetchIdpProfilesFromRequestObject idpIntegration', idpIntegration.name);
        const samlValue = idpIntegration.keyField.split(',').reduce((acc, key) => {
            if (acc !== null && acc !== undefined && acc !== '') return acc;
            const value = _.get(req.user ?? req.samlUserObject, key, null);
            if (value) {
                matchedKeysAndValues.push({ key, value });
            }

            return value;
        }, null);

        log('fetchIdpProfilesFromRequestObject samlValue', samlValue ?? 'not found');

        if (samlValue) {
            const values = Array.isArray(samlValue) ? samlValue : samlValue.split(idpIntegration.valueSeparator ?? ',');

            values.forEach(value => {
                log('fetchIdpProfilesFromRequestObject value', value);
                const currentIdpProfile = idpIntegration.profiles
                    .filter(idpProfile => idpProfile.name === value);

                const profiles = currentIdpProfile.flatMap(configuration => configuration.profiles);

                log('fetchIdpProfilesFromRequestObject profiles', profiles);

                profiles.forEach(profile => idpProfiles.add(profile));
            });
        }
    }

    const idpProfilesArray = Array.from(idpProfiles);

    log('fetchIdpProfilesFromRequestObject matchedKeysAndValues', matchedKeysAndValues);

    log('fetchIdpProfilesFromRequestObject idpProfiles', idpProfilesArray);

    return { strategyName, idpProfiles: idpProfilesArray, matchedKeysAndValues };
}

module.exports = { fetchIdpProfilesFromRequestObject, getActiveIdpIntegrations };