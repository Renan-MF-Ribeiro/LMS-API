/* eslint-disable no-async-promise-executor */
require('dotenv').config();
const ldap = require('ldapjs');
const jwt = require('jsonwebtoken');
const twofactor = require('node-2fa');
const { promisify } = require('util');
const { error } = require('../utils/logger');
const {
    PROJECT_SECRET_KEY,
    LDAP_HOST,
    ANALYTICS_SECRET_KEY,
    HAPPPLACE_SSO_KEY,
    MONITORING_SECRET_KEY,
    AZURE_BLOBNAME,
    AZURE_ACCESSKEY,
} = process.env;
var storage = require('@azure/storage-blob');
const { Profile } = require('../components/profiles/model');
const { Group } = require('../components/groups/model');

const _ldapClient = ldap.createClient({
    url: LDAP_HOST,
    timeLimit: 7000,
    reconnect: true,
});
_ldapClient.on('error', (err) => error('Erro LDAP: %o', err));

module.exports = {
    ldapClient: {
        bind: promisify(_ldapClient.bind).bind(_ldapClient),
        search: promisify(_ldapClient.search).bind(_ldapClient),
        unbind: promisify(_ldapClient.unbind).bind(_ldapClient),
    },

    generateToken: (obj) => {
        const token = jwt.sign(
            {
                data: obj,
            },
            PROJECT_SECRET_KEY,
            {
                expiresIn: '6h',
            }
        );

        return token;
    },

    generateMfaToken: (obj) => {
        const token = jwt.sign(
            {
                data: obj,
            },
            PROJECT_SECRET_KEY,
            {
                expiresIn: '6h',
            }
        );

        return token;
    },

    generateSSOToken: (obj) => {
        const token = jwt.sign(
            {
                data: obj,
            },
            PROJECT_SECRET_KEY,
            {
                expiresIn: '6h',
            }
        );
        return token;
    },

    generateHappPlaceToken: (obj) => {
        const token = jwt.sign(
            {
                data: obj,
            },
            HAPPPLACE_SSO_KEY,
            {
                expiresIn: '12h',
            }
        );
        return token;
    },

    generateTokenAnalytics: (obj) => {
        const token = jwt.sign(
            {
                perfil: obj.perfil,
                clientID: obj.clientID,
                dashFilters: obj.filters,
            },
            ANALYTICS_SECRET_KEY,
            {
                expiresIn: '12h',
            }
        );
        return token;
    },

    generateSASToken: () => {
        //PUBLIC_PATH, UPLOADS_PATH, AZURE_STRINGCONN, AZURE_BLOBNAME, AZURE_ACCESSKEY
        const credentials = new storage.StorageSharedKeyCredential(
            AZURE_BLOBNAME,
            AZURE_ACCESSKEY
        );
        const containerName = 'lmsassets';
        const blobSAS = storage
            .generateBlobSASQueryParameters(
                {
                    containerName,
                    AZURE_BLOBNAME,
                    permissions: storage.BlobSASPermissions.parse('r'),
                    startsOn: new Date(Date.now() - 5 * 60 * 1000),
                    expiresOn: new Date(Date.now() + 16 * 60 * 60 * 1000),
                },
                credentials
            )
            .toString();

        return blobSAS;
    },

    decodeToken: (token) => {
        return jwt.decode(token, PROJECT_SECRET_KEY);
    },

    returnIdProfileUser: (profiles) => {
        return new Promise(async (resolve, reject) => {
            try {
                const result = [];
                const numbers = [];

                for (const p in profiles) {
                    const profile = await Profile.findOne({
                        $text: {
                            $search: profiles[p],
                        },
                    });

                    if (profile) {
                        numbers.push(returnNumberOfProfile(profiles[p]));
                        result.push(profile._id);
                    }
                }

                if (result.length > 0) {
                    resolve({
                        result,
                        numbers,
                    });
                } else {
                    reject(new Error('Sem perfil vinculado!'));
                }
            } catch (error) {
                reject(error);
            }
        });
    },

    returnProfileByToken: (token) => {
        return new Promise(async (resolve, reject) => {
            try {
                const result = [];
                let tk = token?.split(' ')[1] || token;
                const data = jwt.decode(tk, PROJECT_SECRET_KEY);
                const profiles = data.data.profiles;

                for (const p in profiles) {
                    const profile = await Profile.findOne({
                        _id: {
                            $eq: profiles[p],
                        },
                    });

                    if (profile) result.push(profile.title);
                }

                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    },

    validateToken: (req) => {
        return new Promise((resolve) => {
            try {
                const token = req.headers?.authorization;
                let tk = token?.split(' ')[1] || token
                jwt.verify(tk, PROJECT_SECRET_KEY, function (err) {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } catch (error) {
                resolve(false);
            }
        });
    },

    validateMonitoringToken: (req) => {
        return new Promise((resolve) => {
            try {
                const token = req.headers.authorization;
                jwt.verify(token, MONITORING_SECRET_KEY, function (err) {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } catch (error) {
                resolve(false);
            }
        });
    },

    validateMfaToken: (req) => {
        return new Promise((resolve) => {
            try {
                const token = req.headers.mfatoken;
                const payload = jwt.decode(token);
                jwt.verify(token, PROJECT_SECRET_KEY, function (err) {
                    if (err || !payload.data.mfa) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } catch (error) {
                resolve(false);
            }
        });
    },

    validateTokenNginx: (token) => {
        return new Promise((resolve) => {
            try {
                // const token = req.headers.authorization
                jwt.verify(token, PROJECT_SECRET_KEY, function (err) {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } catch (error) {
                resolve(false);
            }
        });
    },

    returnIdGroupUser(groups) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = [];

                for (const p in groups) {
                    const group = await Group.findOne({name: groups[p]})

                    if (group) result.push(group._id)
                }
            
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    },

    async generateMultiFactor(name, account) {
        try {
            const newSecret = twofactor.generateSecret({ name, account });

            const newToken = twofactor.generateToken(newSecret.secret);

            return { newSecret, newToken };
        } catch (error) {
            console.log(error);
            return error;
        }
    },

    async validateMultiFactor(secret, token) {
        try {
            const validation = twofactor.verifyToken(secret, token, 5);
            return validation;
        } catch (error) {
            console.log(error);
            return error;
        }
    },
};

function returnNumberOfProfile(profile) {
    let number;
    switch (profile) {
        case 'PERFIL_Integrador':
            number = 1;
            break;
        case 'PERFIL_Instrutor':
            number = 2;
            break;
        case 'PERFIL_Admin':
            number = 3;
            break;
            // Apagar depois o perfil admin
        case 'PERFIL_Gestor_Elegibilidade':
            number = 3;
            break;
        case 'PERFIL_Analista':
            number = 4;
            break;
        case 'PERFIL_Conteudista':
            number = 5;
            break;
        case 'PERFIL_Colaborador':
            number = 6;
            break;
        case 'PERFIL_Colaborador_Livre':
            number = 7;
            break;
        case 'PERFIL_Super_Admin':
            number = 8;
            break;
        case 'PERFIL_Gestor_Usuario':
            number = 9;
            break;
        case 'PERFIL_Gestor_Engajamento':
            number = 10;
            break;
        default:
            number = 0;
            break;
    }

    return number;
}
