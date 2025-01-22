const _ = require("lodash");

const { log } = require("../../utils/logger");
const { getRequestStrategyName } = require("../../utils/passport");

const { IdpIntegrationModel } = require("./models");

async function fetchIdpProfilesFromRequestWithSamlObject(req) {
    const strategyName = getRequestStrategyName(req);
    const idpProfiles = new Set();

    log('fetchIdpProfilesFromRequestWithSamlObject strategyName', strategyName);

    const idpIntegrations = await IdpIntegrationModel.find({
        strategyName,
        active: true,
    });

    const matchedKeysAndValues = [];

    for (const idpIntegration of idpIntegrations) {
        log('fetchIdpProfilesFromRequestWithSamlObject idpIntegration', idpIntegration.name);
        const samlValue = idpIntegration.keyField.split(',').reduce((acc, key) => {
            if (acc !== null && acc !== undefined && acc !== '') return acc;
            const value = _.get(req.samlUserObject, key, null);

            if (value) {
                matchedKeysAndValues.push({ key, value });
            }

            return value;
        }, null);

        log('fetchIdpProfilesFromRequestWithSamlObject samlValue', samlValue ?? 'not found');

        if (samlValue) {
            const values = samlValue.split(idpIntegration.valueSeparator ?? ',');

            values.forEach(value => {
                log('fetchIdpProfilesFromRequestWithSamlObject value', value);
                const currentIdpProfile = idpIntegration.profiles
                    .filter(idpProfile => idpProfile.name === value);

                const profiles = currentIdpProfile.flatMap(configuration => configuration.profiles);

                log('fetchIdpProfilesFromRequestWithSamlObject profiles', profiles);

                profiles.forEach(profile => idpProfiles.add(profile));
            });
        }
    }

    if (!idpProfiles.size) {
        log('fetchIdpProfilesFromRequestWithSamlObject no idpProfiles found');
        return { strategyName, idpProfiles: null, matchedKeysAndValues };
    }

    const idpProfilesArray = Array.from(idpProfiles);

    log('fetchIdpProfilesFromRequestWithSamlObject matchedKeysAndValues', matchedKeysAndValues);

    log('fetchIdpProfilesFromRequestWithSamlObject idpProfiles', idpProfilesArray);

    return { strategyName, idpProfiles: idpProfilesArray, matchedKeysAndValues };
}

module.exports = { fetchIdpProfilesFromRequestWithSamlObject };