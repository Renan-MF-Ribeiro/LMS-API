/* eslint-disable no-async-promise-executor */
/* eslint-disable no-new */
require('dotenv').config();
const CronJob = require('cron').CronJob;
const { User, LastLogin } = require('../components/users/model');
const { NewMessage } = require('../components/new-messages/model');
const { Group } = require('../components/groups/model');
const { populateTrails } = require('../components/trails/business');
const { Tracking } = require('../components/tracking/model');
const { Trail } = require('../components/trails/model');
const { TodayMostSeenTrails, TrailViews } = require('../components/trails/trail-views.model')
const moment = require('moment');
const { Webhook } = require('discord-webhook-node');
const axios = require('axios');
const {
    isSCORMCompleted,
    calculateAverage,
    processTrailTracking,
    processExpirationDate,
    getDateTodayWithoutHours,
    formatDateWithoutHours,
    calculateDiffDate,
    formatNumberCpf,
    getDateToday,
    findMostOccurringElements,
} = require('./functions');
const {
    getTagsElegibles,
    getTrailCompletion,
} = require('../components/sections/business');
const {
    AverageCourses,
    AverageRating,
    Log,
} = require('../components/logs/model');
const {
    lastLoggedInUsers,
    processUsersLoad,
    sendAccountsToKafka,
    createWelcomeCampaign,
    processUserAccount,
} = require('../components/users/business');

const {
    listAzureFilesInContainer,
    getAzureFileByPath,
    moveAzureFile,
    readXLSXUsersBuffer,
    readCSVUsersBuffer,
    deleteAzureFile,
} = require('../utils/files');
const { sendMessageToKafka } = require('../components/new-messages/business');
const ExcelJS = require('exceljs');

const { Item } = require('../components/items/model');
const { HistoricEvaluation } = require('../components/assessments/model');
const { uploadFileDegreed } = require('./ftp');
const {
    notifyResponsibleUsers,
} = require('../components/new-messages/controller');
const { Section } = require('../components/sections/model');
const { getConfiguration, getMessengerConfig, getCronConfig, getUsersDataConfig } = require('../components/config/business');
const { ConfigTypes } = require('../components/config/model');
const ApiError = require('../errors/ApiError');
const { getConnectMap, validateDataByConnectMap } = require('./connect');
const environment = require('../environment');

module.exports = {
    async cronNotifyResponsibleUsers () {
        const cronConfig = await getCronConfig();

        console.log('Starting cronNotifyResponsibleUsers', cronConfig.notifyResponsibleUsers.active);

        if (cronConfig.notifyResponsibleUsers.active) {
            new CronJob(
                '00 00 * * *',
                () => {
                    notifyResponsibleUsers();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },

    async updateAverageCourses () {
        const cronConfig = await getCronConfig();

        console.log('Starting updateAverageCourses', cronConfig.average.active);

        if (cronConfig.average.active) {
            new CronJob(
                '*/30 * * * * ',
                () => {
                    averageCourses();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },

    async updateAverageRatings () {
        const cronConfig = await getCronConfig();

        console.log('Starting updateAverageRatings', cronConfig.average.active);

        if (cronConfig.average.active) {
            new CronJob(
                '*/60 * * * * ',
                () => {
                    averageRating();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },

    async sendCourseReleaseNotification () {
        const cronConfig = await getCronConfig();

        console.log('Starting sendCourseReleaseNotification', cronConfig.courseRelease.active);

        if (cronConfig.courseRelease.active) {
            new CronJob(
                '00 07 * * * ',
                () => {
                    courseReleaseCron();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },

    async sendCourseChargeNotification () {
        const cronConfig = await getCronConfig();

        console.log('Starting sendCourseChargeNotification', cronConfig.courseCharge.active);

        if (cronConfig.courseCharge.active) {
            new CronJob(
                '00 08 * * * ',
                () => {
                    courseChargeCron();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },
    async deleteReprovedExamTracking () {
        const cronConfig = await getCronConfig();

        console.log('Starting deleteReprovedExamTracking', cronConfig.deleteReprovedExamTracking.active);

        if (cronConfig.deleteReprovedExamTracking.active) {
            new CronJob(
                '00 00 * * * ',
                () => {
                    examTrackingDeleteCron();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },

    async cronUpdateRecommendedTrails () {
        const cronConfig = await getCronConfig();

        console.log('Starting cronUpdateRecommendedTrails', cronConfig.recommendedTrails.active);

        if (cronConfig.recommendedTrails.active) {
            new CronJob(
                '00 00 * * * ',
                () => {
                    recommendedTrailsCron();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },

    updateUserTemporaryTags () {
        new CronJob(
            '00 00 * * * ',
            () => {
                userTemporaryTagsCron();
            },
            null,
            true,
            'America/Sao_Paulo'
        );
    },
    async getUsersLoadCron () {
        const cronConfig = await getCronConfig();

        console.log('Starting getUsersLoadCron', cronConfig.userFTP.active);

        if (cronConfig.userFTP.active) {
            new CronJob(
                '00 19 * * * ',
                () => {
                    getUsersLoad();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },
    async degreedCharge () {
        const cronConfig = await getCronConfig();

        console.log('Starting degreedCharge', cronConfig.degreed.active);

        if (cronConfig.degreed.active) {
            new CronJob(
                '0 2 * * * ',
                () => {
                    cronDegreedCharge();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },

    async cronRevokeTrail () {
        const cronConfig = await getCronConfig();

        console.log('Starting cronRevokeTrail', cronConfig.revokeTrail.active);

        if (cronConfig.revokeTrail.active) {
            new CronJob(
                '00 03 * * * ',
                () => {
                    revokeTrail();
                },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },

    startUpdateTrailsViewsCron () {
        new CronJob(
            '0 */1 * * *',
            () => {
                updateTrailsViews()
            },
            null,
            true,
            'America/Sao_Paulo',
        )
    },

    executeCronAverageCourses () {
        examTrackingDeleteCron();
    },

    executeRevokeTrail () {
        revokeTrail();
    },

    executeRecommendedTrails () {
        recommendedTrailsCron();
    },

    executeCourseReleaseNotification () {
        courseReleaseCron();
    },

    executeCourseChargeNotification () {
        courseChargeCron();
    },

    async executeCronUsers () {
        const cronConfig = await getCronConfig();

        console.log('Starting executeCronUsers', cronConfig.userFTP.active, cronConfig.integrator.active);

        if (cronConfig.integrator.active) {
            integrator();
        } else {
            getUsersLoad();
        }
    },

    executeExamDeleteTrackingCron () {
        examTrackingDeleteCron();
    },

    executeUpdateTrailsViewsCron () {
        updateTrailsViews()
    },

    async executeInactiveOldOnboardingUsers (runningFromAPI = false) {
        if (runningFromAPI) {
            return inactiveOldOnboardingUsers();
        }

        const cronConfig = await getCronConfig();

        console.log('Starting executeInactiveOldOnboardingUsers', cronConfig.inactiveOldOnboardingUsers?.active);

        if (cronConfig.inactiveOldOnboardingUsers?.active) {
            new CronJob(
                cronConfig.inactiveOldOnboardingUsers.cronExpression ?? '59 23 * * *',
                () => { inactiveOldOnboardingUsers(); },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },
    
    async executeRemoveAutomaticEligibilityTags(runningFromAPI = false) {
        if (runningFromAPI) {
            return removeAutomaticEligibilityTags();
        }

        const cronConfig = await getCronConfig();

        console.log('Starting executeRemoveAutomaticEligibilityTags', cronConfig.removeAutomaticEligibilityTags?.active);

        if (cronConfig.removeAutomaticEligibilityTags?.active) {
            new CronJob(
                cronConfig.removeAutomaticEligibilityTags.cronExpression ?? '59 23 * * *',
                () => { removeAutomaticEligibilityTags(); },
                null,
                true,
                'America/Sao_Paulo'
            );
        }
    },
};

async function recommendedTrailsCron () {
    try {
        const completedTrackingsFromTheLastWeek = await Tracking.find({
            completionAt: { $ne: null },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        });
        const trails = [];
        for (const t of completedTrackingsFromTheLastWeek) {
            const trail = await Trail.findOne({
                'items.itemID': { $in: t.item },
            });

            trails.push(trail._id);
        }
        const recommendedTrails = findMostOccurringElements(trails, 5);
        await Section.findOneAndUpdate(
            { defaultType: 'most_completed' },
            { $set: { trails: recommendedTrails } }
        );
    } catch (error) {
        console.log(error);
    }
}

async function averageRating () {
    try {
        const limit = 1000;
        let skip = 0;
        const usersFinal = [];
        let users = await User.find({ status: 'ATIVO' })
            .limit(limit)
            .skip(skip);

        while (users.length > 0) {
            usersFinal.push(...users);
            skip += limit;
            users = await User.find({ status: 'ATIVO' })
                .limit(limit)
                .skip(skip);
        }

        const usersLastLogin = await lastLoggedInUsers();
        const cronConfig = await getCronConfig();

        const groupingA = cronConfig.average.groupA;
        const groupingB = cronConfig.average.groupB;

        const groupA = getGroupSet(usersFinal, groupingA);
        const groupB = getGroupSet(usersFinal, groupingB);

        await ratingCron(groupA, usersLastLogin);
        await ratingCron(groupB, usersLastLogin);

        storageLog(
            'MÉDIAS DAS NOTAS CALCULADAS COM SUCESSO',
            '',
            '',
            'AVERAGE'
        );
    } catch (error) {
        storageLog('MÉDIAS DAS NOTAS - ' + error.message);
    }
}

function ratingCron (grouping, usersLastLogin) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const g of grouping) {
                let numberUsers = 0;
                let numberAverage = 0;
                const groupName = `${g.group}`;
                const query = { [groupName]: g.value };
                const userGroup = await User.find(query);

                for (const u of userGroup) {
                    const filter = usersLastLogin.filter((val) => {
                        return val.user._id.toString() === u._id.toString();
                    });
                    if (filter.length > 0) {
                        const result = await calculateAverage(u);
                        const average = (result.total * 100) / result.max;
                        numberAverage += average || 0;
                        numberUsers += result.totalOfUsers;
                    } else {
                        numberAverage += u.averageRating || 0;
                    }
                }

                const max = numberUsers * 100;
                const averageStore =
                    max !== 0 ? (numberAverage * 100) / max : 0;

                const log = await AverageCourses.findOne({
                    'store.group': g.group,
                    'item.tag': g.value,
                });

                if (log) {
                    await AverageRating.findByIdAndUpdate(log._id, {
                        average: averageStore || 0,
                    });
                } else {
                    await AverageRating.create({
                        store: { group: g.group, tag: g.value },
                        average: averageStore,
                    });
                }
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

async function averageCourses () {
    try {
        const users = await User.find({ status: 'ATIVO' });

        const cronConfig = await getCronConfig();

        const groupingA = cronConfig.average.groupA;
        const groupingB = cronConfig.average.groupB;

        const groupA = getGroupSet(users, groupingA);
        const groupB = getGroupSet(users, groupingB);

        // Filtra somente os usuários que fizeram login nos últimos 35 minutos
        const usersLastLogin = await lastLoggedInUsers();

        // Call Cron
        await groupCron(usersLastLogin, groupA);
        await groupCron(usersLastLogin, groupB);

        storageLog(
            'MÉDIAS DOS CURSOS CALCULADAS COM SUCESSO',
            '',
            '',
            'AVERAGE'
        );
    } catch (error) {
        storageLog('MÉDIAS DOS CURSOS - ' - error.message);
    }
}

function getGroupSet (allUsers, group) {
    const data = [];
    const grouping = [];
    for (const user of allUsers) {
        data.push(user[group]);
    }
    const set = [...new Set(data)];

    for (const s of set) {
        grouping.push({ group, value: s });
    }
    return grouping;
}

function groupCron (usersLastLogin, grouping) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const g of grouping) {
                let numberTrailsCompletedCompany = 0;
                let numberTrailsElegiblesCompany = 0;
                const groupName = `${g.group}`;
                const query = { [groupName]: g.value };
                const userGroup = await User.find(query);
                for (const user of userGroup) {
                    const filter = usersLastLogin.filter((val) => {
                        return user._id.toString() === val.user.toString();
                    });
                    if (filter.length > 0) {
                        const { numberTrailsCompleted, numberTrailsElegibles } =
                            await numberOfCompleteAndEligibleCourses(user);
                        numberTrailsCompletedCompany += numberTrailsCompleted;
                        numberTrailsElegiblesCompany += numberTrailsElegibles;
                    } else {
                        numberTrailsCompletedCompany +=
                            user.numberTrailsCompleted;
                        numberTrailsElegiblesCompany +=
                            user.numberTrailsElegibles;
                    }
                }

                const averageCompanyCourses =
                    numberTrailsElegiblesCompany > 0
                        ? (numberTrailsCompletedCompany * 100) /
                        numberTrailsElegiblesCompany
                        : 0;

                const log = await AverageCourses.findOne({
                    'store.group': g.group,
                    'item.tag': g.value,
                });
                if (log) {
                    await AverageCourses.findByIdAndUpdate(log._id, {
                        average: averageCompanyCourses,
                    });
                } else {
                    await AverageCourses.create({
                        average: averageCompanyCourses.toFixed(1),
                        store: { group: g.group, tag: g.value },
                    });
                }
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function numberOfCompleteAndEligibleCourses (user) {
    return new Promise(async (resolve, reject) => {
        try {
            const tags = await getTagsElegibles(user);
            const trails = await populateTrails(true, {
                enabled: true,
                tags: { $in: tags },
            });

            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
            });

            let numberTrailsCompleted = 0;
            const numberTrailsElegibles = trails.length;

            for (let trail of trails) {
                const processedTrail = processTrailTracking(
                    trail,
                    allTrackingUser
                );

                if (trail.expirationType) {
                    trail = processExpirationDate(trail, user);
                }

                trail = processedTrail.trail;

                if (trail.completion === 1) {
                    numberTrailsCompleted++;
                }
            }

            resolve({
                numberTrailsCompleted,
                numberTrailsElegibles,
            });
        } catch (error) {
            reject(error);
        }
    });
}

function storageLog (message, dataNew = [], dataOld = [], cronType) {
    Log.create({
        user: null,
        type: 'CREATE',
        message,
        component: cronType ? `CRON_${cronType}` : 'CRON',
        dataNew,
        dataOld,
        route: null,
        ip: null,
        login: null,
        groups: [],
    });
}

function hideCPFNumbers(cpf) {
    if(!cpf) return cpf;
    
    return String(cpf).substring(0, 3) + 'XXXXXXXX';
}

function usersLoadLog(...data) {
    console.log(new Date(), '[USERS_LOAD]', ...data);
}

async function processUserLoadFile(directory, fileName, isProduction, usersDataConfig, hook) {
    try {
        const file = await getAzureFileByPath('sftp', `${directory}/${fileName}`);
        const fileExtension = fileName.split('.').pop();

        const users = fileExtension === 'csv'
            ? await readCSVUsersBuffer(file.readableStream)
            : await readXLSXUsersBuffer(file.buffer);

        const newUsers = [];
        const existingUsers = [];
        const usersToSend = [];

        const eligibilityResponse = await axios.get(
            `${process.env.API_CONNECT}/maps/elegibility/${process.env.CLIENT_ID}`,
            {
                headers: {
                    'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                },
            }
        );

        const fieldsForEligibility = eligibilityResponse.data.fields;

        usersLoadLog(
            `Iniciando Processamento de ${users.length} usuários...`
        );

        const connectMap = await getConnectMap(true);

        if (connectMap) {
            const errors = [];

            users.forEach((data) => {
                const dataErrors = validateDataByConnectMap(data, connectMap);

                if (dataErrors.length > 0) {
                    errors.push({
                        item: data.networkLogin ?? data.cpf ?? data.email,
                        errors: dataErrors
                    });
                }
            });

            if (errors.length > 0) {
                throw new ApiError('Erro ao importar usuários', 400, errors, { skipDbLog: true });
            }
        }

        for await (const [index, user] of Object.entries(users)) {
            if (Number(index) % 100 === 0) {
                usersLoadLog(
                    `Processando usuário ${Number(index) + 1} de ${users.length}...`
                );
            }

            const existingUser = await User.findOne({
                $or: [
                    { networkLogin: user.networkLogin },
                    { networkLogin: user.cpf }
                ]
            });

            const processedUser = await processUsersLoad(
                user,
                fieldsForEligibility
            );

            const account = await processUserAccount(processedUser);

            processedUser.password = existingUser
                ? existingUser.password
                : processedUser.password;

            if (existingUser) {
                const groupsAD = [
                    ...processedUser.groupsAD,
                    ...(existingUser.groupsAD?.filter((group) => group.startsWith('PERFIL_')) ?? []),
                ];

                existingUsers.push({
                    _id: existingUser._id,
                    processedUser: {
                        ...processedUser,
                        cpf: !isProduction ? hideCPFNumbers(processedUser.cpf) : processedUser.cpf,
                        groupsAD: [...new Set(groupsAD)],
                    },
                });
            } else {
                usersToSend.push(account);
                newUsers.push({
                    ...processedUser,
                    cpf: !isProduction ? hideCPFNumbers(processedUser.cpf) : processedUser.cpf,
                });
            }
        }

        const automaticEligibilityConfig = await getConfiguration(ConfigTypes.AutomaticEligibility.Onboard);

        if (automaticEligibilityConfig?.enabled) {
            const { eligibility = [] } = automaticEligibilityConfig;

            existingUsers.forEach(user => {
                user.processedUser.groupsAD = [...(user.processedUser.groupsAD ?? []), ...eligibility];
            });

            newUsers.forEach(user => {
                user.groupsAD = [...(user.groupsAD ?? []), ...eligibility];
            });
        }

        usersLoadLog(
            'Usuários processados!', `Usuários existentes: ${existingUsers.length}, Novos usuários: ${newUsers.length}`
        );

        if (usersDataConfig?.inactivateIfNotInSpreadsheet) {
            usersLoadLog('Inativando usuários não presentes na planilha');

            await User.updateMany(
                {
                    onboarding: { $ne: true },
                    ignoreLoadInactivation: { $ne: true },
                },
                { $set: { status: 'INATIVO' } },
                { multi: true }
            );
        }

        if (existingUsers?.length) {
            usersLoadLog(
                `Iniciando atualizações dos ${existingUsers.length} existentes`
            );

            for (const [index, user] of Object.entries(existingUsers)) {
                if (Number(index) % 100 === 0) {
                    usersLoadLog(
                        `Atualizando usuário ${Number(index) + 1} de ${existingUsers.length}...`
                    );
                }

                await User.findByIdAndUpdate(user._id, user.processedUser);

                await Tracking.updateMany(
                    { userLogin: user.processedUser.cpf },
                    { $set: { userLogin: user.processedUser.networkLogin } }
                );
            }
        }

        if (newUsers.length > 0) {
            usersLoadLog(
                `Iniciando criação de ${newUsers.length} novos usuários`
            );

            await User.insertMany(newUsers);

            const messengerConfig = await getMessengerConfig();

            if (messengerConfig.sendUsersToMicrosservice) {
                await sendAccountsToKafka(usersToSend);
                const campaign = createWelcomeCampaign();
                await sendMessageToKafka(campaign, newUsers);
                await NewMessage.create(campaign);
            }

            usersLoadLog('Novos usuários criados');
        }

        storageLog(
            `Carga de ${users.length} usuários`,
            '',
            '',
            'DAILY_CHARGE'
        );

        usersLoadLog('Post processing action:', usersDataConfig?.postProcessingAction ?? 'none');

        switch (usersDataConfig?.postProcessingAction) {
            case "move":
                usersLoadLog('Moving file to "processados" folder');
                await moveAzureFile('sftp', `${directory}/${fileName}`, `${directory}/processados/${fileName}`);
                break;
            case "delete":
                usersLoadLog('Deleting file');
                await deleteAzureFile('sftp', `${directory}/${fileName}`);
                break;

            default:
                usersLoadLog('No post processing action');
                break;
        }
    } catch (error) {
        usersLoadLog(
            'ERROR',
            `Erro ao processar arquivo ${fileName}`,
            JSON.stringify(error)
        );

        const errorMessage = `O cliente ${process.env.COMPOSE_PROJECT_NAME} teve problemas para rodar a carga! Erro: ${error.message}`;
        hook.error('Erro na carga de usuários', '', errorMessage);

        storageLog(
            `Erro na carga de usuários`,
            error.message,
            '',
            'DAILY_CHARGE'
        );
    }
}

async function getUsersLoad() {
    const env = environment.NODE_ENV;
    const hook = environment.WEBHOOK_URL ? new Webhook(environment.WEBHOOK_URL) : null;
    
    const isProduction = env === 'production';
    
    const usersDataConfig = await getUsersDataConfig();
    
    const importPath = usersDataConfig?.importPath?.replace(/^\//, '') ?? null;

    const directory = `${isProduction ? 'producao' : 'homologacao'}${importPath?.length ? `/${importPath}` : ''}`;

    usersLoadLog(`Iniciando carga de usuários do diretório: ${directory}`);

    console.time('[USERS_LOAD] execution time');

    try {
        // Lista arquivos no container sftp
        const files = (await listAzureFilesInContainer('sftp', directory))
            .filter(fileName => fileName.endsWith('.csv') || fileName.endsWith('.xlsx'));

        // Se não houver arquivos, encerra a exec
        if (files.length === 0) {
            usersLoadLog('Nenhum arquivo encontrado para processar');

            if (hook) {
                const errorMessage = `O cliente ${process.env.COMPOSE_PROJECT_NAME} não tem nenhum arquivo encontrado para processar!`;
                hook.warning('Nenhum arquivo encontrado para processar', '', errorMessage);
            }

            return;
        }

        // Processa cada arquivo
        for await (const [index, fileName] of Object.entries(files)) {
            usersLoadLog(`Processando arquivo ${fileName} (${Number(index) + 1}/${files.length})...`);

            try {
                await processUserLoadFile(directory, fileName, isProduction, usersDataConfig, hook);
            } catch (err) { continue; }
        }
    } catch (error) {
        usersLoadLog('ERROR', error);

        if (hook) {
            const errorMessage = `O cliente ${process.env.COMPOSE_PROJECT_NAME} teve problemas para rodar a carga! Erro: ${error.message}`;
            hook.error('Erro na carga de usuários', '', errorMessage);
        }

        storageLog(
            `Erro na carga de usuários`,
            error.message,
            '',
            'DAILY_CHARGE'
        );
    }

    console.timeEnd('[USERS_LOAD] execution time');
}

async function courseReleaseCron () {
    try {
        const startOfDay = new Date(
            new Date().setUTCHours(0, 0, 0, 0)
        ).toISOString();
        const endOfDay = new Date(
            new Date().setUTCHours(23, 59, 59, 999)
        ).toISOString();

        const trails = await populateTrails(true, {
            enabled: true,
            createdAt: {
                $gte: startOfDay,
                $lt: endOfDay,
            },
        });

        const messengerConfig = await getMessengerConfig();
        
        const emailTemplate = messengerConfig.emailTemplate;

        for (const trail of trails) {
            const tags = trail.tags;

            let groups = [];

            for (const tag of tags) {
                const group = await Group.find({ tags: { $in: tag } });
                groups.push(...group);
            }
            groups = groups.map((group) => group.name);

            const users = await User.find({ groupsAD: { $in: groups } }, [
                'networkLogin',
            ]);
            const items = trail.items.map((item) => {
                return item.itemID._id;
            });
            const elegibleUsers = [];
            for (const user of users) {
                let completedTracking = 0;

                const allTrackingUser = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                    item: { $in: items },
                });

                for (const tracking of allTrackingUser) {
                    if (tracking.completionAt !== null) {
                        completedTracking++;
                    }
                }

                if (
                    allTrackingUser.length === 0 ||
                    completedTracking < items.length
                ) {
                    elegibleUsers.push(user);
                }
            }

            if (elegibleUsers.length > 0) {
                const campaign = await createReleaseCampaign(trail, emailTemplate);
                await NewMessage.create(campaign);
                await sendMessageToKafka(campaign, elegibleUsers);
                storageLog(
                    'Campanha de lançamento de cursos enviada',
                    '',
                    '',
                    'Lançamento'
                );
            }
        }
    } catch (error) {
        return error;
    }
}

async function courseChargeCron () {
    try {
        const today = new Date().getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const trails = await populateTrails(true, {
            enabled: true,
            expirationType: { $exists: true },
        });

        const messengerConfig = await getMessengerConfig();
        
        const emailTemplate = messengerConfig.emailTemplate;

        for (let trail of trails) {
            const tags = trail.tags;

            let groups = [];

            for (const tag of tags) {
                const group = await Group.find({ tags: { $in: tag } });
                groups.push(...group);
            }
            groups = groups.map((group) => group.name);

            const users = await User.find({ groupsAD: { $in: groups } }, [
                'networkLogin',
            ]);
            const elegibleUsers = [];
            const items = trail.items.map((item) => {
                return item.itemID._id;
            });

            for (const user of users) {
                trail = processExpirationDate(trail, user);
                const expirationDate = trail.expirationDate.getTime();
                const diff = Math.round((expirationDate - today) / oneDay);
                if (diff === 5) {
                    let completedTracking = 0;
                    const allTrackingUser = await Tracking.find({
                        userLogin: { $eq: user.networkLogin },
                        item: { $in: items },
                    });

                    for (const tracking of allTrackingUser) {
                        if (tracking.completionAt !== null) {
                            completedTracking++;
                        }
                    }

                    if (
                        allTrackingUser.length === 0 ||
                        completedTracking < items.length
                    ) {
                        elegibleUsers.push(user);
                    }
                }
            }

            if (elegibleUsers.length > 0) {
                const campaign = await createChargeCampaign(trail, emailTemplate);
                await NewMessage.create(campaign);
                sendMessageToKafka(campaign, elegibleUsers);
                storageLog(
                    'Campanha de cobrança de cursos enviada',
                    '',
                    '',
                    'Cobrança'
                );
            }
        }
    } catch (error) {
        return error;
    }
}

async function examTrackingDeleteCron () {
    try {
        const today = new Date();
        const users = await User.find({ status: 'ATIVO' });
        for (const user of users) {
            const trackings = await Tracking.find({
                userLogin: user.networkLogin,
                kind: 'ExamTracking',
                lessonStatus: 'failed',
            }).populate('item');
            for (const tr of trackings) {
                const daysSinceReproval = Math.floor(
                    (today - tr.completionAt) / (24 * 3600 * 1000)
                );
                if (daysSinceReproval >= 30) {
                    await HistoricEvaluation.deleteMany({
                        item: tr.item,
                        user: user._id,
                    });
                    await Tracking.deleteMany({
                        item: tr.item,
                        userLogin: user.networkLogin,
                    });

                    const campaign = createExamTrackingCampaign(tr.item.title);
                    await NewMessage.create(campaign);
                    console.log([user.networkLogin]);
                    sendMessageToKafka(campaign, [user]);
                    storageLog(
                        `Tracking de avaliações deletados para ${user.networkLogin}`,
                        user.networkLogin,
                        tr.item._id,
                        'ExamTracking Delete'
                    );
                }
            }
        }
    } catch (error) {
        return error;
    }
}

async function createReleaseCampaign (trail, emailTemplate) {
    const title = `Conheça a nova trilha ${trail.title}`;
    const text = `A trilha ${trail.title} acabou de ser lançada, clique para visualizar!`;
    const communication = ['notification'];
    const mode = 'automatic';
    const category = 'launch';
    const target = {
        trailid: trail._id,
        url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/menu/${trail._id}`,
    };
    return {
        title,
        text,
        communication,
        category,
        target,
        mode,
        ...emailTemplate,
    };
}

async function createChargeCampaign (trail, emailTemplate) {
    const title = `Ei, faltam 5 dias para a conclusão da trilha ${trail.title}!`;
    const text = `A trilha ${trail.title} ainda não foi concluída. O prazo final é ${trail.expirationDate}. Clique para visualizar os detalhes.`;
    const communication = ['notification'];
    const category = 'charge';
    const mode = 'automatic';
    const target = {
        trailid: trail._id,
        url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/menu/${trail._id}`,
    };
    return {
        title,
        text,
        communication,
        category,
        target,
        mode,
        ...emailTemplate,
    };
}

function createExamTrackingCampaign (item) {
    const title = `O resultado da avaliação ${item} foi renovado.`;
    const text =
        'O resultado da avaliação foi renovado. A prova está disponível para nova tentativa de aprovação.';
    const communication = ['notification'];
    const mode = 'automatic';
    const category = 'notify';
    const target = { type: 'none' };
    return { title, text, communication, category, mode, target };
}

async function userTemporaryTagsCron () {
    try {
        const users = await User.find({ status: 'ATIVO' });
        for (const user of users) {
            if (user.tags.length > 0) {
                const today = getDateTodayWithoutHours();

                user.tags = user.tags.filter((tag) => {
                    const diff = calculateDiffDate(
                        today,
                        formatDateWithoutHours(tag.createdAt),
                        'days'
                    );
                    return diff <= 30;
                });
                await User.updateOne({ _id: user._id }, { tags: user.tags });
            }
        }
    } catch (error) {
        return error;
    }
}

async function cronDegreedCharge (hours) {
    var intHours = hours ? parseInt(hours) : 24;
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Happmobi';
        workbook.lastModifiedBy = 'Happmobi';
        workbook.created = new Date();
        workbook.modified = new Date();

        var sheet = workbook.addWorksheet('Carga');
        const headerSheet = [
            'ContentType',
            'CustomerContentID',
            'URL',
            'Delete',
            'Title',
            'Summary',
            'ImageURL',
            'Format',
            'Language',
            'Duration',
            'DurationUnits',
            'PublishDate',
            'Provider',
            'Topics',
        ];

        sheet.addRow(headerSheet);
        [
            'A1',
            'B1',
            'C1',
            'D1',
            'E1',
            'F1',
            'G1',
            'H1',
            'I1',
            'J1',
            'K1',
            'L1',
            'M1',
            'N1',
        ].map((key) => {
            var tmpCell = sheet.getCell(key);
            tmpCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'd9d9d9' },
            };
            tmpCell.font = { name: 'Calibri', size: 10, bold: true };
            tmpCell.alignment = { horizontal: 'center', vertical: 'center' };

            const tmpCol = sheet.getColumn(key.substr(0, 1));
            tmpCol.width = 30;
        });

        let blnChangeItens = false;

        const trails = await populateTrails(true, {
            enabled: true,
        });
        // console.log(trails)
        for (const trail of trails) {
            for (const item of trail.items) {
                const itemDetails = item.itemID;
                const urlItem =
                    `${process.env.DOMAIN}/#/app/player/` +
                    item.urlItem.split(`${process.env.TINCAN_OWNER}/`)[1];

                if (
                    calculateDiffDate(
                        getDateToday(),
                        itemDetails.updatedAt,
                        'hours'
                    ) <= intHours
                ) {
                    blnChangeItens = true;
                    var rowItem = [
                        'course',
                        String(itemDetails._id),
                        urlItem,
                        itemDetails.enabled ? '' : 'Y',
                        String(itemDetails.title),
                        String(itemDetails.description).split('\n').join(' '),
                        itemDetails.thumbPath,
                        'Online',
                        'pt',
                        String(
                            Math.ceil((itemDetails.durationHours / 60) * 10) /
                            10
                        )
                            .split('.')
                            .join(','),
                        'Hours',
                        '',
                        process.env.TINCAN_OWNER,
                        '',
                    ];
                    sheet.addRow(rowItem);
                }
            }
        }

        if (blnChangeItens) {
            const strLocalPath = 'src/public/cargas-degreed/';
            const strFileName =
                `carga${process.env.TINCAN_OWNER}` +
                getDateTodayWithoutHours() +
                '.csv';

            await workbook.csv.writeFile(strLocalPath + strFileName, {
                encoding: 'utf8',
            });

            uploadFileDegreed(
                './' + strLocalPath + strFileName,
                '/' + strFileName
            );

            storageLog(
                'SINCRONIZAÇÃO COM DEGREED ' + strFileName,
                '',
                '',
                'DAILY_CHARGE_DEGREED'
            );
        }
    } catch (error) {
        console.log(error);
        // sendLogEmail('error', error)
        storageLog('DAILY_CHARGE_DEGREED - ' + error.message);
    }
}

async function revokeTrail () {
    const trailsToBeRevoked = await populateTrails(true, {
        'certificateDue.type': { $in: ['fixed', 'availability'] },
    });

    if (trailsToBeRevoked.length) {
        for (const trail of trailsToBeRevoked) {
            const trailItems = trail.items
                .filter(({ itemID }) => !!itemID.enabled)
                .map(({ itemID }) => itemID._id);

            const trackings = await Tracking.aggregate([
                {
                    $match: {
                        item: { $in: trailItems },
                        completionAt: { $exists: true },
                        completionAt: { $ne: null },
                        $or: [
                            {
                                expiredCompletion: { $exists: false },
                            },
                            {
                                expiredCompletion: { $eq: null },
                            },
                        ],
                    },
                },
                {
                    $group: {
                        _id: '$userLogin',
                        count: { $sum: 1 },
                        lastCompletionAt: { $max: '$completionAt' },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'networkLogin',
                        as: 'user',
                    },
                },
                {
                    $unwind: '$user',
                },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        lastCompletionAt: 1,
                        'user._id': 1,
                    },
                },
            ]);

            const usersToBeRevoked = trackings
                .filter((t) => t.count === trail.items.length)
                .map(({ _id, lastCompletionAt, user }) => {
                    const isFixed = trail.certificateDue.type === 'fixed';
                    const startDate = new Date(lastCompletionAt);
                    const expirationDate = !isFixed
                        ? moment(startDate)
                            .add(trail.certificateDue.value, 'days')
                            .toDate()
                        : new Date(trail.certificateDue.value);

                    return {
                        _id: user._id,
                        userLogin: _id,
                        expirationDate,
                    };
                })
                .filter(({ expirationDate }) => expirationDate < new Date());

            for (const userToBeRevoked of usersToBeRevoked) {
                const { _id, expirationDate, userLogin } = userToBeRevoked;
                await Tracking.updateMany(
                    {
                        userLogin: userLogin,
                        item: { $in: trailItems },
                        $or: [
                            {
                                expiredCompletion: { $exists: false },
                            },
                            {
                                expiredCompletion: { $eq: null },
                            },
                        ],
                    },
                    {
                        $set: {
                            expiredCompletion: expirationDate,
                        },
                    }
                );

                await HistoricEvaluation.updateMany(
                    {
                        user: _id,
                        item: { $in: trailItems },
                        $or: [
                            {
                                expiredCompletion: { $exists: false },
                            },
                            {
                                expiredCompletion: { $eq: null },
                            },
                        ],
                    },
                    {
                        $set: {
                            expiredCompletion: expirationDate,
                        },
                    }
                );
            }
        }
    }
}

async function integrator () {
    try {
        const integratorResponse = await axios.put(
            `${process.env.API_INTEGRATOR}/connection/${process.env.CLIENT_ID}`,
            {},
            {
                headers: {
                    'x-api-key': process.env.API_KEY_INTEGRATOR,
                },
            }
        );

        storageLog(
            `Carga de usuários com integrador iniciada com sucesso`,
            '',
            '',
            'INTEGRATOR'
        );
    } catch (error) {
        console.log(error)
    }
}

async function updateTrailsViews () {
    try {
        console.log('start cron todayMostSeen')
        const todayMostSeen = await TodayMostSeenTrails.find()

        for (const { views, updatedAt, _id } of todayMostSeen) {
            const trailId = _id.trailId.toString()
            let viewsInfo = await TrailViews.findOne({ trailId })
            if (!viewsInfo) {
                viewsInfo = await TrailViews.create({
                    trailId,
                    views: [{ date: updatedAt, count: views }],
                })
                continue
            }

            const infoIndex = viewsInfo.views.findIndex(
                info => info.date.getDate() === updatedAt.getDate() &&
                    info.date.getMonth() === updatedAt.getMonth() &&
                    info.date.getYear() === updatedAt.getYear(),
            )

            if (infoIndex === -1) {
                viewsInfo.views.push({ date: updatedAt, count: views })
            } else {
                viewsInfo.views[infoIndex] = { date: updatedAt, count: views }
            }

            await viewsInfo.save()
        }
    } catch (error) {
        console.log(error)
    }
}

async function inactiveOldOnboardingUsers() {
    console.time('[inactiveOldOnboardingUsers] execution time');

    console.log('[inactiveOldOnboardingUsers] Running...');

    const cronConfig = await getCronConfig();

    const daysToInactive = Number(cronConfig?.inactiveOldOnboardingUsers?.daysToInactive ?? 15);

    const lastLoginDate = moment().subtract(daysToInactive, 'days').startOf('day').toDate();

    console.log('[inactiveOldOnboardingUsers] Inactivating onboarding users that have not logged in since', lastLoginDate);

    const lastLoginsWithUser = (
        await LastLogin.find({
            lastLogin: { $lt: lastLoginDate },
            user: { $ne: null },
        }).populate({
            path: 'user',
            select: 'status onboarding _id name networkLogin',
            match: {
                status: 'ATIVO',
                onboarding: true,
            },
        })
    ).filter((val) => !!val.user?._id);

    const userWithLogin = lastLoginsWithUser.map((lastLogin) => lastLogin.user._id);

    console.log('[inactiveOldOnboardingUsers] Onboarding users with login to inactive:', userWithLogin.length, JSON.stringify(userWithLogin));

    if (userWithLogin?.length) {
        await User.updateMany(
            { _id: { $in: userWithLogin } },
            { $set: { status: 'INATIVO', updatedAt: new Date() } },
            { multi: true }
        );
    } else {
        console.log('[inactiveOldOnboardingUsers] No onboarding users with login to inactive');
    }

    const createdUsers = await User.find({
        status: 'ATIVO',
        onboarding: true,
        createdAt: { $lt: lastLoginDate },
    }).select('status onboarding _id name networkLogin createdAt');

    if (createdUsers?.length) {
        const lastLoginCreatedUsers = await LastLogin.find({
            user: { $in: createdUsers.map(user => user._id) },
        });

        const usersWithoutLogin = createdUsers.filter(
            user => !lastLoginCreatedUsers.some(lastLogin => String(lastLogin.user) === String(user._id))
        );

        console.log('[inactiveOldOnboardingUsers] Onboarding users without login to inactive:', usersWithoutLogin.length, JSON.stringify(usersWithoutLogin));

        if (usersWithoutLogin?.length) {
            await User.updateMany(
                { _id: { $in: usersWithoutLogin.map(user => user._id) } },
                { $set: { status: 'INATIVO', updatedAt: new Date() } },
                { multi: true }
            );
        } else {
            console.log('[inactiveOldOnboardingUsers] No onboarding users without login to inactive');
        }
    } else {
        console.log('[inactiveOldOnboardingUsers] No onboarding users created to inactive');
    }

    console.timeEnd('[inactiveOldOnboardingUsers] execution time');
}

async function removeAutomaticEligibilityTags() {
    console.log('Running removeAutomaticEligibilityTags');
    const automaticEligibilityConfig = await getConfiguration(ConfigTypes.AutomaticEligibility.Onboard);

    if (!automaticEligibilityConfig) {
        throw new ApiError('No automatic eligibility configuration found');
    }

    const { enabled, days, eligibility } = automaticEligibilityConfig;

    if (!enabled) {
        throw new ApiError('Automatic eligibility tags are disabled');
    }

    if (!eligibility?.length) {
        throw new ApiError('No eligibility tags were configured');
    }

    console.log('Days', days, 'Eligibility', eligibility);

    const users = await User
        .find({
            admission: { $exists: true },
            status: 'ATIVO',
            $or: [
                { groupsAD: { $in: eligibility } },
                { 'tags.value': { $in: eligibility } },
            ]
        })
        .select('_id name groupsAD admission status')
        .lean();

    console.log('Users to check', users.length);

    for await (const user of users) {
        const { _id, name, groupsAD, admission } = user;

        const admissionDate = moment(admission, 'DD/MM/YYYY');
        const diffInDays = moment().diff(admissionDate, 'days');

        console.log('User', _id, name, 'Admission', admissionDate.format('DD/MM/YYYY'), 'Diff in days', diffInDays);

        if (diffInDays > days) {
            const newGroupsAD = groupsAD.filter(group => !eligibility.includes(group));

            if (groupsAD.length !== newGroupsAD.length) {
                console.log('Removing eligibility tags', _id, name, groupsAD, '>>', newGroupsAD);
                await User.updateOne(
                    { _id },
                    { groupsAD: newGroupsAD }
                );
            }
        }
    }
}
