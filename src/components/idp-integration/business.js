const _ = require("lodash");

const { log } = require("../../utils/logger");
const { getRequestStrategyName } = require("../../utils/passport");

const { IdpIntegrationModel } = require("./models");

async function fetchIdpProfilesFromRequestWithSamlObject(req) {
    const strategyName = getRequestStrategyName(req);
    const idpProfiles = new Set();

    const idpIntegrations = await IdpIntegrationModel.find({
        strategyName,
        active: true,
    });

    for (const idpIntegration of idpIntegrations) {
        const samlValue = idpIntegration.keyField.split(',').reduce((acc, key) => {
            if (acc !== null && acc !== undefined && acc !== '') return acc;
            return _.get(req.samlUserObject, key, null);
        }, null);

        if (samlValue) {
            const values = samlValue.split(idpIntegration.valueSeparator ?? ',');

            values.forEach(value => {
                const currentIdpProfile = idpIntegration.profiles
                    .filter(idpProfile => idpProfile.name === value);

                const profiles = currentIdpProfile.flatMap(configuration => configuration.profiles);

                profiles.forEach(profile => idpProfiles.add(profile));
            });
        }
    }

    if (!idpProfiles.size) {
        log('fetchIdpProfilesFromRequestWithSamlObject no idpProfiles found');
        return { strategyName, idpProfiles: null };
    }

    const idpProfilesArray = Array.from(idpProfiles);

    log('fetchIdpProfilesFromRequestWithSamlObject idpProfiles', idpProfilesArray);

    return { strategyName, idpProfiles: idpProfilesArray };
}

module.exports = { fetchIdpProfilesFromRequestWithSamlObject };