/* eslint-disable handle-callback-err */
/* eslint-disable no-async-promise-executor */
const { Block, User, LastLogin } = require('./model');
const moment = require('moment');
const {
    formatDate,
    getDateToday,
    calculateDiffDate,
    pagination,
    ordernation,
    sanitizeCpf
} = require('../../utils/functions');
const { ldapClient, returnIdProfileUser, returnIdGroupUser } = require('../../utils/auth');
const { DashConfig } = require('../dashboard/model');

const { Log } = require('../logs/model');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const _functions = require('../../utils/functions');
const { Group, ClassGroup } = require('../groups/model');
const { CLIENT_ID } = process.env;
const kafka = require('../../utils/kafka');
const { Trail } = require('../trails/model');
const config = require('../../../config.json');
const { Tracking } = require('../tracking/model');
const { ConfigLogin } = require('../theme/login-config/model');
const ApiError = require('../../errors/ApiError');
const emailTemplate = config.messenger.emailTemplate;
require('dotenv').config();

module.exports = {
    async getLoginConfig(selectFields) {
        const lastConfigurationQuery = ConfigLogin.findOne().sort({ createdAt: -1 });

        if (selectFields) {
            lastConfigurationQuery.select(selectFields);
        }

        const lastConfiguration = await lastConfigurationQuery.lean();

        if (!lastConfiguration) {
            throw new ApiError('Configuração de login não encontrada', 500);
        }

        const ssoForm = Array.isArray(lastConfiguration.ssoForm) ? lastConfiguration.ssoForm : [lastConfiguration.ssoForm];

        const openidForm = Array.isArray(lastConfiguration.openidForm) ? lastConfiguration.openidForm : [lastConfiguration.openidForm];

        return {
            ...lastConfiguration,
            ssoForm: ssoForm.map(form => ({
                ...form,
                strategyName: form.strategyName ?? 'saml',
            })),
            openidForm: openidForm.map(form => ({
                ...form,
                strategyName: form.strategyName ?? 'openid',
            })),
        }
    },

    async getSsoFormByStrategyName(strategyName) {
        const loginConfig = await module.exports.getLoginConfig();

        return (
            loginConfig.ssoForm?.find((form) => form.strategyName === strategyName) ||
            loginConfig.openidForm?.find((form) => form.strategyName === strategyName)
        );
    },

    async findUsers(req, { onboarding }) {
        const { skip, limit } = pagination(req);
        const { order, sort } = ordernation(req);
        const searchBy = req.query.searchBy;
        const tag = req.query.tag;
        let onboardingQuery;
        if (tag) {
            onboardingQuery = onboarding
                ? [{ onboarding: { $eq: onboarding } }]
                : [
                    {
                        $or: [
                            {
                                onboarding: { $exists: false },
                                groupsAD: { $in: tag },
                            },
                            {
                                onboarding: { $eq: onboarding },
                                groupsAD: { $in: tag },
                            },
                        ],
                    },
                ];
        } else {
            onboardingQuery = onboarding
                ? [{ onboarding: { $eq: onboarding } }]
                : [
                    {
                        $or: [
                            { onboarding: { $exists: false } },
                            { onboarding: { $eq: onboarding } },
                        ],
                    },
                ];
        }

        const searchByQuery = searchBy
            ? {
                $or: [
                    { name: { $regex: searchBy, $options: 'i' } },
                    { registration: { $regex: searchBy, $options: 'i' } },
                    { email: { $regex: searchBy, $options: 'i' } },
                ],
                $and: onboardingQuery,
            }
            : {
                $and: onboardingQuery,
            };

        const users = await User.find(searchByQuery)
            .sort({ [order]: sort })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        const total = await User.find(searchByQuery).countDocuments();
        const totalActive = await User.find({
            status: 'ATIVO',
            $or: [...onboardingQuery],
        }).countDocuments();
        const totalInactive = await User.find({
            status: 'INATIVO',
            $or: [...onboardingQuery],
        }).countDocuments();

        return {
            data: users,
            total,
            totalActive,
            totalInactive,
        };
    },

    checkAmountOfLocks(id) {
        return new Promise(async (resolve, reject) => {
            try {
                const quantity = await Block.find({
                    user: { $eq: id },
                    unblocked: { $eq: false },
                }).countDocuments();

                resolve(quantity);
            } catch (error) {
                reject(error);
            }
        });
    },

    returnLastLoginAttemp(id) {
        return new Promise(async (resolve, reject) => {
            try {
                const block = await Block.find({
                    user: { $eq: id },
                    unblocked: { $eq: false },
                });

                resolve(block[2].dateTimeBlock);
            } catch (error) {
                reject(error);
            }
        });
    },

    checkLastAttemptTime(dateTimeBlock) {
        return new Promise(async (resolve, reject) => {
            try {
                const lastTimeBlock = formatDate(dateTimeBlock);
                const dateCurrent = getDateToday();
                const resultDiff = calculateDiffDate(dateCurrent, lastTimeBlock, 'minutes');

                resolve(resultDiff);
            } catch (error) {
                reject(error);
            }
        });
    },

    // # Exclusivo para validação no LPAD
    // # TODO: Remover
    signInAndReturnRole(login, password, login2) {
        return new Promise(async (resolve, reject) => {
            try {
                await ldapClient.bind(login, password);
                // const ldapResponse = await ldapClient.bind('cn=read-only-admin,dc=example,dc=com', 'password')

                const opts = {
                    filter: `(sAMAccountName=${login2})`,
                    scope: 'sub',
                    timeLimit: 30000,
                    attributes: ['memberOf'],
                };

                await ldapClient.search('DC=brasil, DC=latam, DC=cea', opts, function (err, res) {
                    res.on('searchEntry', async function (entry) {
                        const ldapUser = entry.object;
                        const groups = ldapUser.memberOf;
                        const namesProfiles = [];
                        const namesGroups = [];

                        for (const p in groups) {
                            const groupsSplit = groups[p].split(',');
                            const cnSplit = groupsSplit[0].split('=')[1];

                            if (cnSplit.indexOf('GL_ACADMODA_PF') >= 0) namesProfiles.push(cnSplit);

                            if (
                                cnSplit.indexOf('GL_ACADMODA_LJ') >= 0 ||
                                cnSplit.indexOf('GL_ACADMODA_EC') >= 0 ||
                                cnSplit.indexOf('GL_APP') >= 0
                            )
                                namesGroups.push(cnSplit);
                        }

                        const profilesIDS = await returnIdProfileUser(namesProfiles);
                        const groupsIDS = await returnIdGroupUser(namesGroups);

                        resolve({
                            token: {
                                profiles: profilesIDS.result,
                                numbers: profilesIDS.numbers,
                                groups: groupsIDS,
                            },
                            names: namesProfiles.concat(namesGroups),
                        });
                    });

                    res.on('error', function (err) {
                        reject(err);
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    returnDateSinceFirstLogin(userID) {
        return new Promise(async (resolve, reject) => {
            try {
                const userLastLogin = await LastLogin.find({ user: userID });
                const userFirstLogin = userLastLogin[0].createdAt;
                const today = new Date();
                const firstLogin = new Date(userFirstLogin);
                let daysSinceFirstLogin = Math.floor((firstLogin - today) / (24 * 3600 * 1000));
                daysSinceFirstLogin *= -1;
                resolve(daysSinceFirstLogin);
            } catch (error) {
                reject(error);
            }
        });
    },

    updateGroupsOfUser(userID, groups) {
        return new Promise(async (resolve, reject) => {
            try {
                await User.findByIdAndUpdate(userID, { groupsAD: groups });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    updateLastLoginUser(userID) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await LastLogin.findOne({ user: userID });
                if (user) {
                    await LastLogin.updateOne({ user: userID }, { lastLogin: getDateToday() });
                } else {
                    await LastLogin.create({
                        user: userID,
                        lastLogin: getDateToday(),
                    });
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    lastLoggedInUsers(userID) {
        return new Promise(async (resolve, reject) => {
            try {
                const arrUsers = [];
                const users = await LastLogin.find().populate('users');
                for (const user of users) {
                    const diff = calculateDiffDate(getDateToday(), user.lastLogin, 'minutes');
                    if (diff <= 35) arrUsers.push(user);
                }
                resolve(arrUsers);
            } catch (error) {
                reject(error);
            }
        });
    },

    ldapSearch(login, name) {
        return new Promise(async (resolve, reject) => {
            const opts = {
                filter: `(sAMAccountName=${login})`,
                scope: 'sub',
                timeLimit: 30000,
                attributes: ['memberOf'],
            };

            let response = null;

            await ldapClient.search('DC=brasil, DC=latam, DC=cea', opts, function (err, res) {
                res.on('searchEntry', function (entry) {
                    entry = entry.object;
                    response = entry;
                    resolve(response);
                });

                res.on('error', function (err) {
                    reject(err);

                    Log.create({
                        user: null,
                        type: 'CREATE',
                        message: `ROTINA AD - ${name} - ${err.message}`,
                        component: 'CRON_GROUP',
                        dataNew: [],
                        dataOld: [],
                        route: null,
                        ip: null,
                        login: null,
                        groups: [],
                    });
                });

                res.on('end', function (result) {
                    resolve(response);
                });
            });
        });
    },

    async processDashFilters(user) {
        let userMap = [
            { description: 'LOGIN', value: 'networkLogin' },
            { description: 'SENHA', value: 'password' },
            { description: 'DATA_CRIACAO', value: 'createDate' },
            { description: 'NOME', value: 'name' },
            { description: 'EMAIL', value: 'email' },
            { description: 'MATRICULA', value: 'registration' },
            { description: 'STATUS', value: 'status' },
            { description: 'CPF', value: 'cpf' },
            { description: 'DATA_NASC', value: 'birthDate' },
            { description: 'IDENTIDADE_DE_GENERO', value: 'genderIdentity' },
            { description: 'PAIS', value: 'country' },
            { description: 'CIDADE', value: 'city' },
            { description: 'ESTADO', value: 'state' },
            { description: 'EMPRESA', value: 'company' },
            { description: 'ADMISSAO', value: 'admission' },
            { description: 'LOCALIDADE', value: 'locality' },
            { description: 'CARGO', value: 'office' },
            { description: 'NIVEL_HIERARQUICO', value: 'hierarchicalLevel' },
            { description: 'TAREFA', value: 'task' },
            { description: 'CENTRO_DE_CUSTO', value: 'costCenter' },
            { description: 'DESCRICAO_CENTRO_DE_CUSTO', value: 'costCenterDescription' },
            { description: 'LOJA', value: 'store' },
            { description: 'IDENTIFICACAO_LOJA', value: 'storeCode' },
            { description: 'GRUPO_LOJA', value: 'storeGroup' },
            { description: 'GRUPO_LOJA_DESCRICAO', value: 'storeGroupDescription' },
            { description: 'DISTRITAL', value: 'plant' },
            { description: 'GESTOR', value: 'manager' },
            { description: 'MATRICULA_GESTOR', value: 'managerRegistration' },
            { description: 'NOME_GESTOR', value: 'managerName' },
            { description: 'AREA', value: 'area' },
            { description: 'DEPARTAMENTO', value: 'department' },
            { description: 'VP', value: 'vp' },
            { description: 'NEGOCIO', value: 'business' },
            { description: 'UNIVERSIDADE', value: 'university' },
            { description: 'NIVEL_ESCOLARIDADE', value: 'specialization' },
            { description: 'OPCIONAL_ELEGIBILIDADE1', value: 'optionalEligibility1' },
            { description: 'OPCIONAL_ELEGIBILIDADE2', value: 'optionalEligibility2' },
            { description: 'OPCIONAL_ELEGIBILIDADE3', value: 'optionalEligibility3' },
            { description: 'OPCIONAL_ELEGIBILIDADE4', value: 'optionalEligibility4' },
            { description: 'OPCIONAL_ELEGIBILIDADE5', value: 'optionalEligibility5' },
            { description: 'OPCIONAL_ELEGIBILIDADE6', value: 'optionalEligibility6' },
        ];
        const dashboardFilters = [];
        const dashConfig = await DashConfig.find();
        try {
            if (dashConfig) {
                let dashFilters = dashConfig.map((x) => {
                    return x.fields;
                });
                dashFilters = dashFilters.flat(2);
                for (let filter of dashFilters) {
                    for (const map of userMap) {
                        filter.userField =
                            map.description == filter.userField ? map.value : filter.userField;
                        filter.dashFilter =
                            map.description == filter.dashFilter ? map.value : filter.dashFilter;
                    }

                    const userHasValidFieldValue =
                        user[filter.userField] == filter.fieldValue &&
                        user[filter.dashFilter] != undefined &&
                        user[filter.dashFilter] != 'undefined' &&
                        user[filter.dashFilter] != null &&
                        user[filter.dashFilter] != 'null' &&
                        user[filter.dashFilter] != '';
                    if (userHasValidFieldValue) {
                        if (dashboardFilters.length == 0) {
                            dashboardFilters.push({
                                field: filter.dashFilter,
                                value: user[filter.dashFilter],
                                pages: filter.pages,
                            });
                        }
                    }
                }
                return dashboardFilters;
            }
        } catch (error) {
            console.log(error);
            return error;
        }
    },

    processUsersLoad(data, elegibilityFields = [], onboarding = false) {
        const salt = bcrypt.genSaltSync(10);
        const firstName = String(data.name.split(" ")[0]).trim().toLowerCase();
        const firstThreeCpf = sanitizeCpf(data.cpf).slice(0, 3);
        const initialPassword = !onboarding
            ? "1234"
            : `${firstName}${firstThreeCpf}`;
        data.password = [
            {
                hash: bcrypt.hashSync(String(data?.password ?? initialPassword), salt),
                valid: true,
                createdAt: new Date(Date.now()),
            },
        ];

        data.clientUserKey = CLIENT_ID + '@@' + data.networkLogin;
        data.birthDate = data.birthDate ? moment(data.birthDate, 'DD/MM/YYYY').format('DD/MM/YYYY') : null
        data.admission = data.admission ? moment(data.admission, 'DD/MM/YYYY').format('DD/MM/YYYY') : null
        data.createDate = data.createDate ? moment(data.createDate, 'DD/MM/YYYY').format('DD/MM/YYYY') : null
        data.enabled = true;
        data.onboarding = onboarding;

        const groupsAD =
            onboarding === true
                ? ['PERFIL_Aluno', 'ELEGE_ONBOARDING']
                : ['PERFIL_Aluno', 'ELEGE_CURSO'];

        if (elegibilityFields && elegibilityFields.length > 0 && onboarding == false) {
            for (const field of elegibilityFields) {
                if (data[field]) {
                    const fieldType = typeof data[field];
                    if (fieldType === 'object') continue;

                    const value =
                        fieldType !== 'string' ? data[field] : _functions.clearString(data[field]);

                    groupsAD.push(`ELEGE_${value}`);
                }
            }
        } else {
            if (!!data.company && !!data.office) {
                groupsAD.push(`ELEGE_${_functions.clearString(data.company)}`);
                groupsAD.push(`ELEGE_${_functions.clearString(data.office)}`);
            }
        }

        const optionals = ['optionalEligibility1', 'optionalEligibility2', 'optionalEligibility3', 'optionalEligibility4', 'optionalEligibility5', 'optionalEligibility6'];

        optionals.forEach(
            (optional) =>
                !!data[optional] && groupsAD.push(`ELEGE_${_functions.clearString(data[optional])}`)
        );

        groupsAD.forEach(async (groupName) => {
            const group = await Group.findOne({ name: groupName });
            if (!group) {
                await Group.create({
                    name: groupName,
                    tags: [],
                });
            }
        });

        const roles = data.roles ? data.roles.split(',').map((item) => item.trim()) : [];

        if (roles.includes('Admin')) {
            groupsAD.push('PERFIL_Admin');
        }

        if (roles.includes('Analista')) {
            groupsAD.push('PERFIL_Analista');
        }
        if (roles.includes('Conteudista')) {
            groupsAD.push('PERFIL_Conteudista');
        }

        data.groupsAD = groupsAD;

        if (data.cpf) {
            data.cpf = String(data.cpf).replace(/[^a-z0-9]/gi, '');
        }

        if (onboarding) {
            data.networkLogin = data.cpf;
            data.onboarding = true;
        }

        return data;
    },

    async persistUsers(results, { onboarding } = { onboarding: false }) {
        const usersToSend = [];
        const newUsers = [];
        const updatedUsers = [];

        const elegibilityResponse = await axios.get(
            `${process.env.API_CONNECT}/maps/elegibility/${process.env.CLIENT_ID}`,
            {
                headers: {
                    'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                },
            }
        );
        const fieldsForElegibility = elegibilityResponse.data.fields;

        for (const result of results) {
            if (onboarding) {
                const processedUser = await module.exports.processUsersLoad(
                    result,
                    fieldsForElegibility
                );
                const account = await module.exports.processUserAccount(processedUser);

                usersToSend.push(account);
                if (processedUser.createdAt === processedUser.updatedAt) {
                    newUsers.push(account);
                } else {
                    updatedUsers.push(updatedUsers.length + 1);
                }
            }
        }

        if (config.messenger.sendUsersToMicrosservice && usersToSend.length > 0) {
            const filterUsersToSend = usersToSend.filter((u) => u.status === 'ATIVO');
            for (let i = 0; i < filterUsersToSend.length; i += 500) {
                await sendAccountsToKafka(filterUsersToSend.slice(i, i + 500));
            }

            if (config.messenger.sendWelcomeCampaign) {
                const campaign = createWelcomeCampaign();
                for (let i = 0; i < newUsers.length; i += 500) {
                    await sendMessageToKafka(campaign, newUsers.slice(i, i + 500));
                    await Message.create(campaign);
                }
            }
        }

        return { newUsers: newUsers.length, updatedUsers: updatedUsers.length };
    },

    async processUserAccount(data) {
        try {
            const { groupsAD = [] } = data;

            let groupsObj = [];

            for (const value of groupsAD) {
                const g = await Group.find({ name: value });
                if (g.length > 0) {
                    groupsObj.push(...g);
                }
            }
            groupsObj = groupsObj.map((obj) => {
                const tags = obj.tags.map((tag) => tag.value);
                const data = { name: obj.name, tags };
                return data;
            });

            const account = {
                name: data.name,
                email: data.email ? data.email : null,
                identifier: data.networkLogin,
                clientid: process.env.CLIENT_ID,
                group: groupsObj,
            };
            return { value: JSON.stringify(account) };
        } catch (error) {
            console.log(error);
            return error;
        }
    },

    async sendAccountsToKafka(accounts) {
        try {
            const producer = kafka.producer();
            await producer.connect();

            await producer.send({
                topic: process.env.TOPIC_ACC,
                messages: accounts,
            });

            await producer.disconnect();
        } catch (error) {
            console.log(error);
        }
    },

    async getUsersByTrail(trailId, category) {
        try {
            const trail = await Trail.findOne({ _id: trailId });

            const tags = trail.tags;

            let groups = [];

            for (const tag of tags) {
                const group = await Group.find({ tags: { $in: tag } });
                groups.push(...group);
            }
            groups = groups.map((group) => group.name);

            const users = await User.find({ groupsAD: { $in: groups } }, ['networkLogin']);

            const usersToReturn = [];
            if (category === 'charge') {
                const items = trail.items.map((item) => {
                    return item.itemID._id;
                });

                for (const user of users) {
                    let completedTracking = 0;
                    const allTrackingUser = await Tracking.find({
                        userLogin: { $eq: user.networkLogin },
                        item: { $in: items },
                        $or: [
                            { expiredCompletion: { $exists: false } },
                            { expiredCompletion: { $eq: null } },
                        ],
                    });
                    for (const tracking of allTrackingUser) {
                        if (tracking.completionAt !== null) {
                            completedTracking++;
                        }
                    }

                    if (completedTracking !== items.length) {
                        usersToReturn.push(user);
                    }
                }

                return usersToReturn;
            } else {
                usersToReturn.push(...users);
                return usersToReturn;
            }
        } catch (error) {
            return error;
        }
    },

    async getUsersByGroups(groups) {
        try {
            const users = await User.find({ groupsAD: { $in: groups } }, ['networkLogin']);
            return users;
        } catch (error) {
            return error;
        }
    },

    async getUsersByTags(tags) {
        try {
            let groups = [];

            for (const tag of tags) {
                const group = await Group.find({ tags: { $in: tag } });
                groups.push(...group);
            }
            groups = groups.map((group) => group.name);

            const users = await User.find({ groupsAD: { $in: groups } }, ['networkLogin']);

            return users;
        } catch (error) {
            return error;
        }
    },

    async getUsersByIds(ids) {
        try {
            const users = await User.find({ _id: { $in: ids } }, ['networkLogin']);

            return users;
        } catch (error) {
            return error;
        }
    },

    async sendUpdatedDeviceIdToMessenger(device, identifier) {
        try {
            const producer = kafka.producer();
            await producer.connect();
            const obj = JSON.stringify({ device, identifier });
            await producer.send({
                topic: process.env.TOPIC_DEVICER,
                messages: [{ value: obj }],
            });

            await producer.disconnect();
        } catch (error) {
            console.log(error);
            throw error;
        }
    },

    async createWelcomeCampaign() {
        const title = `Seja bem-vindo(a) à plataforma ${process.env.PROJECT_NAME}!`;
        const text = 'Venha conhecer a plataforma!';
        const communication = ['notification'];
        const mode = 'automatic';
        const category = 'notify';
        return { title, text, communication, category, mode, ...emailTemplate };
    },

    async createClassGroup(user, groupCode, DATA_INICIO, DATA_FIM) {
        let classGroup = await ClassGroup.findOne({ _id: groupCode });

        const { startDate, limitDate } = _functions.getDates(DATA_INICIO, DATA_FIM);

        classGroup.startDate = startDate;
        classGroup.limitDate = limitDate;
        classGroup.updatedAt = moment(new Date());

        await user.update({
            $addToSet: {
                classGroups: classGroup,
            },
        });
    },

    buildSearchObject(body) {
        let search = {};
        Object.entries(body).forEach(([k, v]) => {
            search = Object.assign(search, {
                [k]: { $eq: v },
            });
        });
        return search;
    },

    generateNewPassword(user) {
        const password_new = Math.random()
            .toString(36)
            .replace(/\W+/g, '')
            .substring(0, 6);

        const salt = bcrypt.genSaltSync(10);
        const hashPass = bcrypt.hashSync(password_new, salt);

        const newPass = user.password.map(item => {
            item.valid = false;
            return item;
        });

        newPass.push({
            hash: hashPass,
            valid: true,
            createdAt: new Date(),
        });

        return { password_new, hashPass, newPass };
    },

    maskEmail(email) {
        const emailParts = email.split('@');
        const emailName = emailParts[0];
        let maskedEmail = '';
        for (let i = 0; i < emailName.length; i++) {
            if (i > 2 && i < emailName.length) {
                maskedEmail += '*';
            } else {
                maskedEmail += emailName[i];
            }
        }
        return `${maskedEmail}@${emailParts[1]}`;
    }
};
