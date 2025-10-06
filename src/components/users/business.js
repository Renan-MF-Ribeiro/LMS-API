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
    sanitizeCpf,
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
const { Tracking } = require('../tracking/model');
const { ConfigLogin } = require('../theme/login-config/model');
const ApiError = require('../../errors/ApiError');
const { getMessengerConfig } = require('../config/business');
const { getConnectMap, setReplacedValuesFromConnectMap } = require('../../utils/connect');
const { getCookieProps } = require('../../utils/cookies');
const PartnerBusiness = require('../partners/business');
const { createSessionStore } = require('../../utils/session');
const { Types } = require('mongoose');
const { log } = require('../../utils/logger');

async function createGroupsByGroupsAD(groupsAD) {
    const groupsDb = await Group.find({ name: { $in: groupsAD } })
        .select('name')
        .lean();

    const allGroups = new Set(groupsDb.map((group) => group.name));

    const createGroups = groupsAD.filter((groupName) => {
        if (groupName.startsWith('PERFIL_')) return false;

        return !allGroups.has(groupName);
    });

    return await Group.insertMany(
        createGroups.map(
            (groupName) => ({
                name: groupName,
                tags: [],
            })
        )
    );
}

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

        const ssoForm = Array.isArray(lastConfiguration.ssoForm)
            ? lastConfiguration.ssoForm
            : [lastConfiguration.ssoForm];

        return {
            ...lastConfiguration,
            ssoForm: ssoForm.map((form) => ({
                ...form,
                strategyName: form.strategyName || 'saml',
            })),
        };
    },

    async getLoginFormByStrategyName(strategyName = 'saml') {
        const loginConfig = await module.exports.getLoginConfig();

        return loginConfig.ssoForm?.find((form) => form.strategyName === strategyName);
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
                if (userLastLogin?.length === 0) resolve(0);
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
        const connectMap = await getConnectMap(true);

        const userMap = Object.entries(connectMap).map(([key, value]) => {
            return { value: key, field: value.field };
        });

        function isSameField(userField, mapItem) {
            return (
                mapItem.field !== 'NÃO MAPEAR' &&
                (mapItem.value === userField || mapItem.field === userField)
            );
        }

        const dashboardFilters = [];

        const dashConfig = await DashConfig.find();

        dashConfig.forEach((config) => {
            config.fields?.forEach((config) => {
                if (!config.userField || !config.fieldValue) return;

                const userField = userMap.find((map) => isSameField(config.userField, map));

                if (!userField) return;

                const userUserFieldValue = user[userField.value];

                if (userUserFieldValue !== config.fieldValue) {
                    log(`User field value ${userUserFieldValue} does not match config value ${config.fieldValue}`);
                    return;
                }

                const dashboardField = userMap.find((map) => isSameField(config.dashFilter, map));
                const userDashFieldValue = dashboardField ? user[dashboardField.value] : null;

                dashboardFilters.push({
                    field: dashboardField?.value || null,
                    value: userDashFieldValue,
                    pages: config.pages,
                });
            });
        });

        log(JSON.stringify(dashboardFilters, null, 2));

        return dashboardFilters;
    },

    /**
     * Processes user data for loading into the system, handling authentication, group assignments, and data formatting.
     *
     * @async
     * @param {Object} data - The user data object to be processed
     * @param {Array<string>} [elegibilityFields=[]] - Array of field names to use for eligibility group assignment
     * @param {boolean} [onboarding=false] - Whether this is an onboarding user
     * @param {boolean} [preventOnboardingGroupAdd=false] - Whether to prevent adding onboarding groups
     * @param {Map} [replaceMap=null] - Map for replacing values using connect map
     * @returns {Promise<Object>} The processed user data object with additional fields:
     *   - clientUserKey: Generated client user key
     *   - password: Array with hashed password object
     *   - groupsAD: Array of Active Directory groups
     *   - enabled: Set to true
     *   - onboarding: Boolean indicating onboarding status
     * @description
     * This function performs the following operations:
     * - Removes empty fields (networkLogin, name, password)
     * - Generates initial password based on first name and CPF
     * - Parses and formats date fields
     * - Creates hashed password with salt
     * - Assigns appropriate AD groups based on user type and eligibility
     * - Creates missing groups in the database
     * - Handles role-based group assignments
     * - Sanitizes CPF format
     * - Applies replacement mappings if provided
     */
    async processUsersLoad(data, elegibilityFields = [], onboarding = false, preventOnboardingGroupAdd = false, replaceMap = null, origin = undefined) {

        ['networkLogin', 'name', 'password'].forEach((field) => {
            if (!data[field]) {
                delete data[field];
            }
        });

        const salt = bcrypt.genSaltSync(10);
        const firstName = String(data.name?.split(' ')[0]).trim().toLowerCase();
        const firstThreeCpf = sanitizeCpf(data.cpf).slice(0, 3);
        const initialPassword = !onboarding ? 'Minhasenha@1' : `${firstName}${firstThreeCpf}`;

        function parseDate(date) {
            if (!date) return null;

            let parsedDate = moment(date, 'DD/MM/YYYY');

            if (!parsedDate.isValid()) {
                parsedDate = moment(date, 'MM/DD/YYYY');

                if (!parsedDate.isValid()) {
                    parsedDate = moment(date);
                }
            }

            return parsedDate.format('DD/MM/YYYY');
        }

        data.clientUserKey = CLIENT_ID + '@@' + data.networkLogin;
        data.birthDate = parseDate(data.birthDate);
        data.admission = parseDate(data.admission);
        data.createDate = parseDate(data.createDate);
        data.terminationDate = parseDate(data.terminationDate);
        data.vacationStartDate = parseDate(data.vacationStartDate);
        data.vacationEndDate = parseDate(data.vacationEndDate);
        data.enabled = true;
        data.onboarding = onboarding;
        data.origin = {
            type: origin,
            updatedAt: new Date(),
            info: null,
        }

        data.password = [
            {
                hash: bcrypt.hashSync(String(data?.password ?? initialPassword), salt),
                valid: true,
                createdAt: new Date(Date.now()),
            },
        ];

        // Default Fields
        data.status = _functions.isPositiveValue(data.status) ? 'ATIVO' : 'INATIVO';
        if (data.cpf) data.cpf = _functions.parseDocument(data.cpf);
        if (data.cnpj) data.cnpj = _functions.parseDocument(data.cnpj);
        if (data.pcd) data.pcd = _functions.isPositiveValue(data.pcd) ? 'SIM' : 'NAO';
        if (data.manager) data.manager = _functions.isPositiveValue(data.manager) ? 'SIM' : 'NAO';
        if (data.loginType) data.loginType = _functions.getLoginType(data.loginType);

        if (onboarding) {
            data.networkLogin = data.cpf;
            data.onboarding = true;
        }

        const groupsAD = ['PERFIL_Aluno'];

        if (onboarding && !preventOnboardingGroupAdd) {
            groupsAD.push('ELEGE_ONBOARDING');
        } else if (!onboarding) {
            groupsAD.push('ELEGE_CURSO');
        }

        if (elegibilityFields && elegibilityFields.length > 0 && !onboarding) {
            for (const field of elegibilityFields) {
                if (data[field]) {
                    const fieldType = typeof data[field];

                    if (fieldType === 'object') continue;

                    const value = fieldType !== 'string'
                        ? data[field]
                        : _functions.clearString(data[field]);

                    groupsAD.push(`ELEGE_${value}`);
                }
            }
        } else {
            if (data.company && data.office) {
                groupsAD.push(`ELEGE_${_functions.clearString(data.company)}`);
                groupsAD.push(`ELEGE_${_functions.clearString(data.office)}`);
            }
        }

        const optionals = [
            'optionalEligibility1',
            'optionalEligibility2',
            'optionalEligibility3',
            'optionalEligibility4',
            'optionalEligibility5',
            'optionalEligibility6',
        ];

        optionals.forEach(
            (optional) =>
                !!data[optional] && groupsAD.push(`ELEGE_${_functions.clearString(data[optional])}`)
        );

        const roles = data.roles ? data.roles.split(',').map((item) => item.trim()) : [];

        const availableRolesSet = new Set([
            'Conteudista',
            'Analista',
            'Integrador',
            'Instrutor',
            'Colaborador',
            'Gestor_Elegibilidade',
            'Gestor_Engajamento',
            'Gestor_Usuario',
            'Gestor_Matriz',
            'Aplicador_Matriz',
        ]);

        roles.forEach((role) => {
            if (availableRolesSet.has(role)) groupsAD.push(`PERFIL_${role}`);
        });

        const uniqueGroupsAD = [...new Set(groupsAD)];

        await createGroupsByGroupsAD(uniqueGroupsAD);

        data.groupsAD = uniqueGroupsAD;

        if (replaceMap?.size) {
            setReplacedValuesFromConnectMap(data, replaceMap);
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

        const messengerConfig = await getMessengerConfig();

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

        if (messengerConfig.sendUsersToMicrosservice && usersToSend.length > 0) {
            const filterUsersToSend = usersToSend.filter((u) => u.status === 'ATIVO');
            for (let i = 0; i < filterUsersToSend.length; i += 500) {
                await sendAccountsToKafka(filterUsersToSend.slice(i, i + 500));
            }

            if (messengerConfig.sendWelcomeCampaign) {
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
            const users = await User.find({ groupsAD: { $in: groups } }, [
                'networkLogin',
                'name',
                'office',
            ]).lean();
            return users;
        } catch (error) {
            return error;
        }
    },

    async getTagsByUserIds(userIds) {
        const arrayIds = Array.isArray(userIds) ? userIds : [userIds];
        if (arrayIds.length === 0) return [];

        const users = await User.find({ _id: { $in: arrayIds?.map((id) => new Types.ObjectId(id)) } }).lean();
        if (users.length === 0) return [];


        const groups = await Group.find({ name: { $in: users?.flatMap((u) => u?.groupsAD) } }, 'tags').lean();
        const tags = groups?.flatMap((group) => group?.tags);
        return [users, tags];
    },

    async getFirstTenUsersByGroup(groups) {
        try {
            // Aggregate para pegar 10 usuários aleatórios de cada grupo
            return await User.aggregate([
                {
                    $match: {
                        status: /^ativo$/i,
                        groupsAD: { $in: groups },
                    },
                },
                {
                    $sample: { size: 10 },
                },
                {
                    $project: {
                        networkLogin: 1,
                        name: 1,
                        office: 1,
                    },
                },
            ]);
        } catch (error) {
            console.log(error);
            return [];
        }
    },

    async getLastLoginByUser(userId) {
        return LastLogin.findOne({ user: userId });
    },

    async getUsersByTags(tags, tagsAnd = []) {
        try {
            const allTags = [...new Set([...tags, ...tagsAnd])];
            const groups = await Group.find({ 'tags.value': { $in: allTags } });

            const groupsOr = [];
            const groupsAnd = [];

            for (const g of groups) {
                const groupTags = g.tags.map(t => t.value);
                
                if (tags.some(t => groupTags.includes(t))) {
                    groupsOr.push(g.name);
                }

                if (tagsAnd.some(t => groupTags.includes(t))) {
                    groupsAnd.push(g.name);
                }
            }

            const query = {
                $or: []
            };

            if (groupsOr.length > 0) {
                query.$or.push({ groupsAD: { $in: groupsOr } });
            }
            if (groupsAnd.length > 0) {
                query.$or.push({ groupsAD: { $all: groupsAnd } });
            }

            if (query.$or.length === 0) {
                return [];
            }

            const users = await User.find(query, ['networkLogin', 'status', 'groupsAD']);

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

        const messengerConfig = await getMessengerConfig();

        return { title, text, communication, category, mode, ...messengerConfig.emailTemplate };
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
        const password_new = Math.random().toString(36).replace(/\W+/g, '').substring(0, 6);

        const salt = bcrypt.genSaltSync(10);
        const hashPass = bcrypt.hashSync(password_new, salt);

        const newPass = user.password.map((item) => {
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
    },

    async getProcessedTags(user) {
        const { groupsAD = [], classGroups = [] } = user;

        const groups = await Group.find({ name: { $in: groupsAD } });

        const groupTags = groups.flatMap((group) => group.tags.map((tag) => tag.value ?? tag));

        const currentDate = new Date();

        const allTags = groupsAD
            .concat(groupTags)
            .concat(
                classGroups
                    .filter(
                        (classGroup) =>
                            classGroup.status === 2 &&
                            new Date(classGroup.startDate) <= currentDate &&
                            new Date(classGroup.limitDate) >= currentDate
                    )
                    .map((classGroup) => classGroup.groupCode)
            )
            .filter((t) => !String(t).startsWith('PERFIL_'));

        return allTags;
    },

    async updateUserByPartnerToken(req, user, tk = null) {
        const token = tk || req.body?.token || req.query?.token;
        const partner = await PartnerBusiness.getPartnersByToken(token);
        const usedToken = validatePartnerToken(partner, token);

        if (!usedToken?.updatable) return user;
        if (user.origin?.type === 'PARTNER_TOKEN' && user.origin?.info === usedToken.key)
            return user;

        const [newGroupsAd, tokenBlockedFields, newClassGroups] =
            await getPartnerTokenNewInformations(usedToken, user);

        const update = {
            groupsAD: newGroupsAd,
            classGroups: newClassGroups,
            origin: {
                type: 'PARTNER_TOKEN',
                info: usedToken.key,
            },
            partner: `${partner.title} - ${usedToken.title}`,
            ...tokenBlockedFields,
        };

        const [updatedUser] = await Promise.all([
            User.findOneAndUpdate({ _id: user._id }, { $set: update }, { new: true }).exec(),
            Log.create({
                dataNew: update,
                dataOld: user,
                groups: newGroupsAd ?? [],
                user: user._id,
                type: 'UPDATE',
                message: `Atualização de dados por token de parceiro ${partner.title} - ${usedToken.key}`,
                component: 'users',
                route: '/users/auth',
                ip: req.ip,
                login: user.networkLogin,
                browserDetails: req.headers['user-agent'],
            }),
        ]);
        return updatedUser;
    },

    async clearAuthCookies(req, res) {
        if (req.sessionID) await createSessionStore().destroy(req.sessionID);
        res.clearCookie('connect.sid', getCookieProps());
        res.clearCookie('SAS', getCookieProps());
        res.clearCookie('strategyName', getCookieProps());
    },
};

const getPartnerTokenNewInformations = async (usedToken, user) => {
    // -------------- LOOKUP EM INFORMAÇÕES QUE O TOKEN POSSUI (classes, eligibilidades e turmas) --------------
    const tokenEligibilities = usedToken?.elegibilityResult
        ?.map((key) => key?.value)
        ?.filter(Boolean);

    const tokenBlockedFields = usedToken?.defaultField?.reduce((acc, key) => {
        const { key: tokenKey, value: tokenValue } = key;
        if (tokenKey && tokenValue && user[tokenKey] !== tokenValue) {
            acc[tokenKey] = tokenValue;
        }
        return acc;
    }, {});

    const tokenClasses = usedToken?.classGroupResult?.classGroups || [];
    // -------------- MONTANDO O QUE SERÁ ATUALIZADO NO USUARIO --------------
    // utilizando os lookups criados acima, montamos o que será atualizado no usuário seguindo as flags do token
    let newGroupsAD =
        usedToken?.overwriteEligibility === false
            ? (user?.groupsAD || [])?.concat(tokenEligibilities || [])
            : (user?.groupsAD || [])
                ?.filter((value) => value.includes('PERFIL_'))
                ?.concat(tokenEligibilities);

    const classes =
        usedToken?.classGroupResult?.overwriteClassGroup === false
            ? (user?.classGroups || [])?.map((classGroup) => classGroup._id)?.concat(tokenClasses)
            : tokenClasses;

    let newClassGroups = await ClassGroup.find({ _id: { $in: classes } });
    const today = moment(new Date());
    const partnerDays = usedToken?.classGroupResult?.days || 10;
    const DATA_INICIO = today.startOf('day');
    const DATA_FIM = moment().add(partnerDays, 'days');
    const { startDate, limitDate } = _functions.getDates(DATA_INICIO, DATA_FIM);

    for (const _class of newClassGroups) {
        if (tokenClasses.includes(_class._id.toString())) {
            _class.startDate = startDate;
            _class.limitDate = limitDate;
            _class.updatedAt = moment(new Date());
        } else {
            const existantGroup = user?.classGroups?.find(
                (classGroup) => classGroup?._id?.toString() === _class?._id?.toString()
            );
            _class.startDate = existantGroup?.startDate || null;
            _class.limitDate = existantGroup?.limitDate || null;
            _class.updatedAt = existantGroup?.updatedAt || null;
        }

    }

    return [newGroupsAD, tokenBlockedFields, newClassGroups];
};

const validatePartnerToken = (partner, token) => {
    if (!partner) {
        throw new ApiError('Token inválido ou parceiro não encontrado', 404);
    }
    const usedToken = partner?.keys?.find((key) => key?.key === token);
    if (Date.now() < usedToken?.endDate) {
        return usedToken;
    }
};
