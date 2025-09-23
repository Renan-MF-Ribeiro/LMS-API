
require('dotenv').config();

const mongoose = require('mongoose');
const _ = require('lodash');

const { writeDebugJson } = require('./utils');

const UPDATE_MISSING = false;

async function connectDatabases() {
    try {
        const connectionOpts = { useNewUrlParser: true, useUnifiedTopology: true };

        const connections = await Promise.all([
            mongoose.createConnection(process.env.DB_I18N_PROD, connectionOpts),
            mongoose.createConnection(process.env.DB_I18N_HML, connectionOpts)
        ]);

        return connections;
    } catch (error) {
        console.error('Error connecting to databases:', error);

        throw new Error('Database connection failed');
    }
}

// FONT: https://stackoverflow.com/questions/31683075/how-to-do-a-deep-comparison-between-2-objects-with-lodash
function compareTranslations(prodObj, hmlObj) {
    const result = {
        different: [],
        missingProd: [],
        missingHml: []
    };

    _.reduce(prodObj, function (result, value, key) {
        if (hmlObj.hasOwnProperty(key)) {
            if (_.isEqual(value, hmlObj[key])) {
                return result;
            } else {
                if (typeof (prodObj[key]) != typeof ({}) || typeof (hmlObj[key]) != typeof ({})) {
                    //dead end.
                    result.different.push(key);
                    return result;
                } else {
                    const deeper = compareTranslations(prodObj[key], hmlObj[key]);

                    result.different = result.different.concat(_.map(deeper.different, (sub_path) => {
                        return key + "." + sub_path;
                    }));

                    result.missingHml = result.missingHml.concat(_.map(deeper.missingHml, (sub_path) => {
                        return key + "." + sub_path;
                    }));

                    result.missingProd = result.missingProd.concat(_.map(deeper.missingProd, (sub_path) => {
                        return key + "." + sub_path;
                    }));
                    return result;
                }
            }
        } else {
            result.missingHml.push(key);
            return result;
        }
    }, result);

    _.reduce(hmlObj, function (result, value, key) {
        if (prodObj.hasOwnProperty(key)) {
            return result;
        } else {
            result.missingProd.push(key);
            return result;
        }
    }, result);

    return result;
}

async function compareContexts(dbConnections, context) {
    [prodConn, hmlConn] = dbConnections;

    const prodLocalesCollection = prodConn.collection('locales');
    const hmlLocalesCollection = hmlConn.collection('locales');

    const prodContext = await prodLocalesCollection.findOne({ context, clientId: 0 });
    const hmlContext = await hmlLocalesCollection.findOne({ context, clientId: 0 });

    return compareTranslations(prodContext.translations, hmlContext.translations);
}

async function setMissingTranslations({
    context,
    missingTranslations,
    fromConnection,
    toConnection,
}) {
    const fromLocalesCollection = fromConnection.collection('locales');
    const toLocalesCollection = toConnection.collection('locales');
    const fromContext = await fromLocalesCollection.findOne({ context, clientId: 0 });
    const toContext = await toLocalesCollection.findOne({ context, clientId: 0 });

    for (const path of missingTranslations) {
        const fromValue = _.get(fromContext.translations, path);
        const toValue = _.get(toContext.translations, path);

        if (toValue) {
            console.log(`Warning: Path ${path} already exists in context ${context}, skipping insert.`);
            continue;
        }

        await toLocalesCollection.updateOne(
            { context, clientId: 0 },
            { $set: { [`translations.${path}`]: fromValue } }
        );
    }
}

async function run() {
    const dbConnections = await connectDatabases();

    const [prodConn, hmlConn] = dbConnections;

    const contexts = ['adm', 'home', 'public', 'api'];

    for (const context of contexts) {
        const { missingHml, missingProd } = await compareContexts(dbConnections, context);

        await writeDebugJson(`compare-dictionaries-${context}`, { missingHml, missingProd });

        if (!UPDATE_MISSING) continue;

        if (missingHml.length > 0) {
            console.log(`Inserting ${missingHml.length} missing translations into HML for context ${context}`);

            await setMissingTranslations({
                context,
                missingTranslations: missingHml,
                fromConnection: prodConn,
                toConnection: hmlConn,
            });
        }

        if (missingProd.length > 0) {
            console.log(`Inserting ${missingProd.length} missing translations into PROD for context ${context}`);

            await setMissingTranslations({
                context,
                missingTranslations: missingProd,
                fromConnection: hmlConn,
                toConnection: prodConn,
            });
        }
    }

    console.log('Comparison and update completed.');

    await Promise.all(dbConnections.map(conn => conn.close()));

    process.exit(0);
}

run();