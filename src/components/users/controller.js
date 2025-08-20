/* eslint-disable handle-callback-err */
require('dotenv').config();
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');
const { CLIENT_ID } = process.env;
const _messages = require('../../utils/messages');
const _files = require('../../utils/files');
const { NewMessage } = require('../new-messages/model');
const { User, UserTest, Block, defaultUserMap } = require('./model');
const managerBusiness = require('../managers/business');
const {
    generateToken,
    generateMfaToken,
    decodeToken,
    validateToken,
    validateTokenNginx,
    validateMfaToken,
    returnIdProfileUser,
    returnIdGroupUser,
    generateTokenAnalytics,
    generateHappPlaceToken,
    generateMultiFactor,
    validateMultiFactor,
    returnProfileByToken,
} = require('../../utils/auth');

const {
    checkAmountOfLocks,
    checkLastAttemptTime,
    returnLastLoginAttemp,
    updateGroupsOfUser,
    updateLastLoginUser,
    processUsersLoad,
    processUserAccount,
    sendAccountsToKafka,
    sendUpdatedDeviceIdToMessenger,
    createWelcomeCampaign,
    returnDateSinceFirstLogin,
    findUsers,
    processDashFilters,
    createClassGroup,
    buildSearchObject,
    generateNewPassword,
    maskEmail,
    getLoginFormByStrategyName,
    clearAuthCookies,
    updateUserByPartnerToken,
} = require('./business');

const {
    sleep,
    getDateToday,
    pagination,
    ordernation,
    getUserByToken,
    removeAccents,
    formatDateWithoutHoursBrasilian,
} = require('../../utils/functions');

const { getActiveIdpIntegrations } = require('../idp-integration/business');

const {
    sendEmailRecoveryPassword,
    sendLogEmail,
    sendSignupActivationEmail,
    sendNotificationEmail,
    sendResetedPasswordToUser,
    sendMultiFactorToUser,
} = require('../../utils/email');

const axios = require('axios');
const bcrypt = require('bcryptjs');
const cryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const { sendMessageToKafka } = require('../new-messages/business');

const { getNumberOfItemsCompletedOrInProgressOrNotStarted } = require('../home/business');
const { HistoricEvaluation, Evaluation } = require('../assessments/model');
const { Question } = require('../assessments/questions/model');
const { Alternative } = require('../assessments/alternatives/model');

const { EVENT_CATEGORY } = require('../gamification/model');
const GamificationBusiness = require('../gamification/business');
const { Group } = require('../groups/model');
const { handleUserEligibilitiesGamification } = require('../gamification/utils');
const { Partner } = require('../partners/model');
const { Log } = require('../logs/model');
const { Tracking } = require('../tracking/model');
const {
    getConfiguration,
    handleSegmentationOnQuery,
    getMessengerConfig,
    getUsersDataConfig,
} = require('../config/business');
const { ConfigTypes } = require('../config/model');
const { fetchIdpProfilesFromRequestObject } = require('../idp-integration/business');
const { log } = require('../../utils/logger');
const WebhooksController = require('../webhooks/controller');
const ApiError = require('../../errors/ApiError');
const { addSASTokenToResponse, getCookieProps } = require('../../utils/cookies');
const GamificationKafka = require('../gamification/kafka/broker');

const { FormModel } = require('../forms/model');
const {
    getConnectMap,
    validateDataByConnectMap,
    getConnectEligibilities,
    getConnectMapReplacers,
} = require('../../utils/connect');
const {
    getFormErrorsByMapConfig,
    getDefaultForm,
    getAdminForm,
    getFormErrorsByFormValidation,
} = require('../forms/business');

const { getDbCurrentFeatures } = require('../../utils/features');
const { ObjectId } = require('mongoose').Types;
const { Profile } = require('../profiles/model');
const environment = require('../../environment');

const isProduction = process.env.NODE_ENV === 'production';

function hideCPFNumbers(cpf) {
    if (!cpf) return cpf;

    return String(cpf).substring(0, 3) + 'XXXXXXXX';
}

// Gerencia block de usuário por tentativas de login consecutivas
async function handleBlockUser(user) {
    const countOfBlocks = await checkAmountOfLocks(user._id);
    // 5 Tentativas
    if (countOfBlocks >= 5) {
        const lastLoginAttemp = await returnLastLoginAttemp(user._id);
        const resultDiff = await checkLastAttemptTime(lastLoginAttemp);

        // 30min
        if (resultDiff >= 1) {
            Block.updateMany({ user: { $eq: user._id } }, { unblocked: true });
        } else {
            sendNotificationEmail(
                user.email,
                'Conta bloqueada',
                `Olá ${user.name}, uma nova tentativa de acesso a conta não foi permita pois a conta está bloqueda. <br/> O desbloqueio é feito automaticamente, por favor, tente fazer um novo acesso dentro de 1h.`
            );

            throw new ApiError('Usuário bloqueado temporariamente', 403);
        }
    }
}

async function generateTokens(user, login, password, tokenIdpProfiles, res) {
    const groups = Array.from(
        new Set([
            ...(tokenIdpProfiles ?? []),
            ...(user.groupsAD?.filter((group) =>
                tokenIdpProfiles
                    ? group === 'PERFIL_Aluno' || !group.startsWith('PERFIL')
                    : true
            ) ?? []),
        ])
    );

    const namesProfiles = [];
    const namesGroups = [];
    let tokenAnalytics, tokenHappPlace;
    for (const p in groups) {
        const strGroup = groups[p];

        if (String(strGroup).toUpperCase().includes('PERFIL_')) {
            namesProfiles.push(strGroup);
        } else {
            namesGroups.push(strGroup);
        }
    }
    const [profilesIDS, groupsIDS, _] = await Promise.all([
        returnIdProfileUser(namesProfiles),
        returnIdGroupUser(namesGroups),
        updateGroupsOfUser(user._id, namesProfiles.concat(namesGroups))
    ]);

    const userGroups = await Group.find({ name: { $in: namesGroups } });
    const eligibilities = userGroups.flatMap((group) =>
        group.tags.flatMap((tag) => tag?.value || tag.display)
    );

    if (namesProfiles.includes('PERFIL_Conteudista')) {
        tokenHappPlace = generateHappPlaceToken({
            name: user.name,
            networkLogin: user.networkLogin,
            clientId: CLIENT_ID,
        });
    }

    if (namesProfiles.includes('PERFIL_Analista')) {
        const dashboardFilters = await processDashFilters(user);
        tokenAnalytics = generateTokenAnalytics({
            perfil: profilesIDS?.numbers,
            clientID: CLIENT_ID,
            filters: dashboardFilters,
        });
    }

    const authwebPush = user.webPushAuthorization
        ? user.webPushAuthorization[user.webPushAuthorization.length - 1]
        : null;

    const token = generateToken({
        ref: user._id,
        clientId: process.env.CLIENT_ID,
        userName: user.name,
        networkLogin: user.networkLogin,
        email: user.email,
        userTags: eligibilities,
        profiles: profilesIDS?.result,
        numbers: profilesIDS?.numbers,
        groups: groupsIDS,
        welcomeVideoWatched: user?.welcomeVideoWatched,
    });

    const mfaToken = generateMfaToken({
        ref: user._id,
        mfa: false,
    });

    const { token: SAS } = addSASTokenToResponse(res);

    await updateGroupsOfUser(user._id, namesProfiles.concat(namesGroups));

    const tokenEncript = cryptoJS.AES.encrypt(token, String(login));

    const tk = tokenEncript.toString();

    const key = cryptoJS.AES.encrypt(login + ':' + password, password).toString();

    return {
        SAS,
        tk,
        key,
        tokenAnalytics,
        tokenHappPlace,
        mfaToken,
        authwebPush,
        profilesIDS,
        namesProfiles,
        namesGroups,
    };
}

module.exports = {
    async create(req, res) {
        try {
            const isOnboarding = Boolean(req.body?.onboarding)

            const form = await getAdminForm();

            const errors = getFormErrorsByFormValidation(form, req.body);

            if (errors.length > 0) {
                return _messages.forbidden(
                    res,
                    req,
                    'Existem campos obrigatórios não preenchidos',
                    { message: 'Existem campos obrigatórios não preenchidos', errors },
                    'users',
                    'create'
                );
            }

            const { loginField } = form;

            if (!req.body[loginField]) {
                return _messages.forbidden(
                    res,
                    req,
                    'Campo de login não informado',
                    { error: 'Campo de login não informado' },
                    'users',
                    'create'
                );
            }

            if (!req.body.name) {
                return _messages.forbidden(
                    res,
                    req,
                    'Nome é obrigatório',
                    { error: 'Nome é obrigatório' },
                    'users',
                    'create'
                );
            }

            if (isOnboarding && !req.body?.cpf) {
                return _messages.forbidden(
                    res,
                    req,
                    'CPF é obrigatório para usuário avulso',
                    { error: 'CPF é obrigatório para usuário avulso' },
                    'users',
                    'create'
                )
            }

            const userExists = await User.findOne({
                $or: [{ networkLogin: req.body[loginField] }],
            });

            if (userExists) {
                return _messages.forbidden(
                    res,
                    req,
                    'User already exists',
                    { error: 'Usuário já existe' },
                    'users',
                    'create'
                );
            }

            const elegibilityResponse = await axios.get(
                `${process.env.API_CONNECT}/maps/elegibility/${process.env.CLIENT_ID}`,
                {
                    headers: {
                        'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                    },
                }
            );

            const fieldsForElegibility = elegibilityResponse.data.fields;

            const processedUser = await processUsersLoad(
                {
                    ...req.body,
                    networkLogin: req.body[loginField],
                },
                fieldsForElegibility,
                isOnboarding
            );

            await User.create(processedUser);

            const created = await User.findOne({ networkLogin: processedUser.networkLogin }).lean();

             WebhooksController.dispatch('create', 'users', false, {
                ...created,
                password: undefined,
            });

            return _messages.success(res, req, created);
        } catch (error) {
            console.log('error', error);

            let validationErrorKeys;
            let validationError;

            if (error instanceof mongoose.Error.ValidationError) {
                validationErrorKeys = Object.keys(error.errors);
                validationError = validationErrorKeys.map((key) => ({
                    [key]: error.errors[key].properties,
                }));
            }

            return _messages.internalServer(
                res,
                req,
                !validationError ? 'Internal Server Error' : 'Validation Error',
                {
                    error: !validationError ? 'Internal Server Error' : validationError,
                },
                'users',
                'create'
            );
        }
    },

    async findById(req, res) {
        try {
            const _id = req.params.userId;

            const query = { _id };

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'issuer', query);
            }

            const foundUser = await User.findOne(query).select('-password');

            _messages.success(res, req, foundUser);
        } catch (error) {
            console.log({ error });
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'findById'
            );
        }
    },

    async signup(req, res) {
        const { token, formId: queryFormId } = req.query;
        const {
            password,
            passwordConfirmation,
            loginField,
            formId: bodyFormId,
            ...data
        } = req.body;
        const formId = queryFormId || bodyFormId || null;

        if (!data.name) {
            throw new ApiError('Nome é obrigatório', 400, { data }, { skipDbLog: true });
        }

        const form =
            (formId ? (await FormModel.findById(formId))?.toObject() : null) ??
            (await getDefaultForm());

        log('using form:', form.name);

        let networkLogin = data.cpf;

        if (data.email) data.email = String(data.email).toLowerCase();
        if (data.alternativeEmail)
            data.alternativeEmail = String(data.alternativeEmail).toLowerCase();

        if (form) {
            const connectMap = await getConnectMap(true);
            const errors = getFormErrorsByMapConfig(connectMap, form, data);

            log('errors:', errors);

            if (errors.length > 0) {
                const message = errors[0].message;
                throw new ApiError(message, 400, { errors }, { skipDbLog: true });
            }
            networkLogin = data[form.loginField ?? 'cpf'];

            log('form login field:', form.loginField ?? 'cpf');
            log('networkLogin:', networkLogin);
        }

        if (!networkLogin) {
            throw new ApiError('Campo de login não informado', 400, { data }, { skipDbLog: true });
        }

        if (!data.registration?.length) data.registration = networkLogin;

        if (!data.admission?.length) data.admission = moment().format('DD/MM/YYYY');

        const today = moment(new Date());
        // Seta elegibilidades padrões
        let groupsAD = ['PERFIL_Aluno'];
        let defaultFields;
        let partnerDays = 0;
        let classGroupsIDs;
        let origin = {
            type: 'SELF',
            info: 'Cadastro vitrine',
        };

        const { sendSignUpActivationEmail } = await getUsersDataConfig();

        try {
            // Validação de usuário já criado
            const userExists = await User.exists({ networkLogin });
            if (userExists) {
                if (!token)
                    return _messages.badRequest(
                        res,
                        req,
                        'Usuário já cadastrado',
                        'Já existe um usuário cadastrado',
                        'users',
                        'signup'
                    );

                return _messages.unprocessableEntity(
                    res,
                    req,
                    'Usuário já cadastrado',
                    'Já existe um usuário cadastrado',
                    'users',
                    'signup'
                );
            }

            // Encripta senha
            const salt = bcrypt.genSaltSync(10);
            const hashPassword = {
                hash: bcrypt.hashSync(password, salt),
                valid: true,
                createdAt: new Date(Date.now()),
            };

            if (token) {
                // Busca de qual partner o usuário veio
                const partner = await Partner.findOne(
                    { active: true, 'keys.key': token },
                    'keys.elegibilityResult keys.defaultField keys.classGroupResult keys.key keys.endDate title keys.title'
                );
                if (!partner) {
                    _messages.unauthorized(
                        res,
                        req,
                        new Error('Este token não está atrelado a nenhum parceiro'),
                        'Este token não está atrelado a nenhum parceiro',
                        'users',
                        'signup'
                    );
                    return;
                }
                const selectedKey = partner.keys?.find((key) => key?.key === token);

                if (selectedKey.endDate < today) {
                    return _messages.unauthorized(
                        res,
                        req,
                        new Error('DataInvalida'),
                        'O token do parceiro está expirado.',
                        'users',
                        'signup'
                    );

                }

                // Concatena todas as elegibilidades padrões e "do seu partner"
                const elegibiliytValues = selectedKey.elegibilityResult
                    .map((key) => key?.value)
                    .filter(Boolean);
                groupsAD = [...groupsAD, ...elegibiliytValues];

                // Junta e formata todas as partner default fields pra 'key:value'
                defaultFields = selectedKey.defaultField?.reduce((acc, key) => {
                    if (key?.key && key?.value) {
                        acc[key.key] = key.value;
                    }
                    return acc;
                }, {});

                partnerDays = selectedKey.classGroupResult?.days;
                // Gera array de objetos referentes a "_id" de classGroups
                classGroupsIDs = selectedKey.classGroupResult?.classGroups?.map((x) => x);
                defaultFields.partner = `${partner.title} - ${selectedKey.title}`;
                origin = {
                    type: 'PARTNER_TOKEN',
                    info: selectedKey.key,
                }
            } else {
                groupsAD.push('ELEGE_CURSO');
            }

            const formatedDate = formatDateWithoutHoursBrasilian(data.birthDate);
            const userData = {
                networkLogin,
                // email: networkLogin,
                password: hashPassword,
                passwordValid: true,
                clientUserKey: CLIENT_ID + '@@' + networkLogin,
                status: sendSignUpActivationEmail ? 'INATIVO' : 'ATIVO',
                name: data.socialName ? data.socialName : data.civilName,
                ...data,
                birthDate: formatedDate,
                groupsAD,
                origin,
                ...defaultFields,
            };

            const newUser = await User.create(userData);

           WebhooksController.dispatch('create', 'users', false, {
                ...newUser.toObject(),
                password: undefined,
            });

            if (token) {
                const DATA_INICIO = today.startOf('day');
                const DATA_FIM = moment().add(partnerDays, 'days');
                await Promise.all(
                    classGroupsIDs.map((groupId) => {
                        createClassGroup(newUser, groupId, DATA_INICIO, DATA_FIM);
                    })
                );
            }

            if (newUser && sendSignUpActivationEmail) {
                const emailToken = generateToken({
                    networkLogin,
                    ref: newUser._id,
                    clientId: process.env.CLIENT_ID,
                    userName: newUser.name,
                    userTags: [],
                });
                const activationLink = `${process.env.DOMAIN}/login/ativacao?token=${emailToken}`;
                await sendSignupActivationEmail(newUser.email, activationLink);
            }

            const tokens = await generateTokens(newUser, networkLogin, password, null, res);

            if (newUser && form?.autoLogin) {
                await Log.create({
                    dataNew: [],
                    dataOld: [],
                    groups: groupsAD ?? [],
                    user: newUser._id,
                    type: 'LOGIN',
                    message: 'Sucesso ao se cadastrar',
                    component: 'users',
                    route: 'signup',
                    ip: req.ip,
                    login: newUser.networkLogin,
                    browserDetails: req.headers['user-agent'],
                });

                await updateLastLoginUser(newUser._id);
            }

            return _messages.success(res, req, tokens);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'signup'
            );
        }
    },

    async activateUser(req, res) {
        try {
            const { token, email } = req.body;
            const isUser = await bcrypt.compare(email, token);
            if (isUser) {
                const activate = await User.updateOne({ email }, { status: 'ATIVO' });
                _messages.success(res, req, activate);
            } else {
                _messages.badRequest(res, req, 'Token inválido', 'O token fornecido é inválido');
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'signup'
            );
        }
    },

    async ldapSignIn(req, res) {
        if (!req.user) {
            return _messages.forbidden(
                res,
                req,
                'Usuário não encontrado',
                'Usuário não encontrado',
                'users',
                'ldapSignIn'
            );
        }
        let user = await User.findOne({
            _id: new mongoose.Types.ObjectId(req.user._id),
        }).lean();
        if (user.loginType && user.loginType !== 'FORM' && user.loginType !== 'BOTH') {
            return _messages.forbidden(
                res,
                req,
                'Usuário ou senha inválidos.',
                'Usuário ou senha inválidos.',
                'users',
                'ldapSignIn'
            );
        }

        const { login, password, token } = req.body;
        if (token) {
            user = await updateUserByPartnerToken(req, user);
        }
        try {
            await handleBlockUser(user);
            if (
                new Date(user?.password?.[user?.password?.length - 1]?.createdAt)?.getTime() <
                Date.now() - 90 * 24 * 60 * 60 * 1000
            ) {
                user.passwordValid = false;
            }

            if (user && user.origin && user.origin.type === 'INTEGRATOR') {
                return _messages.forbidden(
                    res,
                    req,
                    'Utilize a gestão de login externa para fazer seu acesso.',
                    'Utilize a gestão de login externa para fazer seu acesso.',
                    'users',
                    'ldapSignIn'
                );
            }
            // Gera todos os tokens necessários
            const [tokens, entryRecord, isUserManager] = await Promise.all([
                generateTokens(user, login, password, null, res),
                returnDateSinceFirstLogin(user?._id),
                managerBusiness.isUserManager(user),
                updateLastLoginUser(user?._id),
                GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.LOGIN],
                    identifier: login,
                }),
            ]);

            const firstLogin = !user?.passwordValid && !entryRecord;

            WebhooksController.dispatch('auth', 'users', false, {
                ...user,
                password: undefined,
            });

            return _messages.success(
                res,
                req,
                {
                    // tokens
                    SAS: tokens.SAS,
                    tk: tokens?.tk,
                    key: tokens?.key,
                    tokenAnalytics: tokens?.tokenAnalytics,
                    tokenHappPlace: tokens?.tokenHappPlace,
                    mfaToken: tokens?.mfaToken,
                    authwebPush: tokens?.authwebPush?.keys.auth,
                    //user data
                    accept: user.acceptTerms,
                    acceptCollaboration: user.acceptTermsCollaboration,
                    passwordValid: user.passwordValid,
                    numbers: tokens?.profilesIDS?.numbers,
                    name: user.name,
                    profilePhoto: user.profilePhoto,
                    networkLogin: user.networkLogin,
                    userId: user._id,
                    email: user.email,
                    firstLogin,
                    isManager: isUserManager,
                },
                'Sucesso ao logar',
                'users',
                'ldapSignIn',
                [],
                [],
                true,
                'LOGIN',
                tokens?.namesProfiles?.concat(tokens?.namesGroups)
            );
        } catch (error) {
            console.log({ error });
            if (user?.id)
                await Block.create({
                    user: user?._id,
                    dateTimeBlock: getDateToday(),
                    ip: req.ip,
                });
            return _messages.forbidden(
                res,
                req,
                error.message,
                'Usuário ou senha inválidos.',
                'Usuário ou senha inválidos.',
                'users',
                'ldapSignIn'
            );
        }
    },

    async feedbackElegible(req, res) {
        const user = await getUserByToken(req);
        const today = new Date();
        const uri = `${process.env.API_SURVEY}/feedback/listbyuser?userid=${user._id}`;
        try {
            const usersDataConfig = await getUsersDataConfig();

            const response = await axios.get(uri);
            const firstLogin = await returnDateSinceFirstLogin(user._id);
            const { numberOfItemsCompleted } =
                await getNumberOfItemsCompletedOrInProgressOrNotStarted(req);
            if (response.data[0]) {
                const latestFeedback = response.data.slice(-1);
                const latestFeedbackDate = new Date(latestFeedback[0].updatedAt);
                let daysSinceLastFeedback = Math.floor(
                    (latestFeedbackDate - today) / (24 * 3600 * 1000)
                );
                daysSinceLastFeedback *= -1;

                if (
                    firstLogin >= 1 &&
                    daysSinceLastFeedback >= usersDataConfig.daysSinceLastFeedback &&
                    numberOfItemsCompleted >= 1
                ) {
                    _messages.success(res, req, true);
                } else {
                    _messages.success(res, req, false);
                }
            } else {
                _messages.success(res, req, false);
            }
        } catch (error) {
            console.log(error.message);
            _messages.internalServer(res, req, error.message);
        }
    },

    async singleSignOn(req, res) {
        const { token } = req.body;
        const secret = process.env.PROJECT_SECRET_KEY;

        try {
            const data = jwt.verify(token, secret);

            // Need to create the session when using monitoring login
            if (data.monitoringLogin) {
                req.session.passport = { user: data };
                res.cookie('connect.sid', req.sessionID, getCookieProps());
                await addSASTokenToResponse(res);
            }

            const tokenIdpProfiles = data?.idpProfiles;
            const tokenStrategyName = data?.strategyName ?? undefined;

            log('singleSignOn tokenStrategyName', tokenStrategyName);
            log('singleSignOn tokenIdpProfiles', tokenIdpProfiles);

            const ssoForm = await getLoginFormByStrategyName(tokenStrategyName);
            const claim = data[ssoForm.claim] || data.data?.[ssoForm.claim];

            if (!claim) {
                return _messages.forbidden(
                    res,
                    req,
                    'Claim inválido',
                    'Claim inválido',
                    'users',
                    'singleSignOn'
                );
            }

            if (data?.communication || data?.data?.communication) {
                const communication = data?.communication || data?.data?.communication;
                const communicationCategory = String(communication).toUpperCase();
                const eventCategory = EVENT_CATEGORY[`OPENED_FROM_${communicationCategory}`];

                await GamificationKafka.publishEventRuleValidation({
                    events: [eventCategory],
                    identifier: claim,
                    meta: {
                        trailTitle: data?.trailTitle || data?.data?.trailTitle,
                    },
                });
            }

            const query = { status: 'ATIVO' };

            query[ssoForm.claim] = claim;

            const user = await User.findOne(query).lean();

            if (
                !user ||
                (user.loginType && user.loginType !== 'SSO' && user.loginType !== 'BOTH')
            ) {
                await sleep(3000);

                return _messages.forbidden(
                    res,
                    req,
                    'Usuário ou senha inválidos',
                    { claim, claimKey: ssoForm?.claim ?? '' },
                    'users',
                    'singleSignOn'
                );
            }

            const amountOfLocks = await checkAmountOfLocks(user._id);

            // 5 Tentativas
            if (amountOfLocks >= 50) {
                const lastLoginAttemp = await returnLastLoginAttemp(user._id);
                const resultDiff = await checkLastAttemptTime(lastLoginAttemp);

                // 30min
                if (resultDiff >= 1) {
                    await Block.updateMany({ user: { $eq: user._id } }, { unblocked: true });
                } else {
                    sendNotificationEmail(
                        user.email,
                        'Conta bloqueada',
                        `Olá ${user.name}, uma nova tentativa de acesso a conta não foi permita pois a conta está bloqueda. <br/> O desbloqueio é feito automaticamente, por favor, tente fazer um novo acesso dentro de 1h.`
                    );
                    return _messages.forbidden(
                        res,
                        req,
                        'Usuário bloqueado temporariamente',
                        'Por favor tente novamente mais tarde!',
                        'users',
                        'singleSignOn'
                    );
                }
            }

            const [tokens, isManager, entryRecord] = await Promise.all([
                generateTokens(user, 'happlearning', '25KP76yNnhiGH9bSj', tokenIdpProfiles, res),
                managerBusiness.isUserManager(user),
                returnDateSinceFirstLogin(user?._id),
                updateLastLoginUser(user?._id),
                GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.LOGIN],
                    identifier: user.networkLogin,
                }),
            ]);

            const firstLogin = !user.passwordValid && !entryRecord;

            _messages.success(
                res,
                req,
                {
                    SAS: tokens?.SAS,
                    tk: tokens?.tk,
                    key: tokens?.key,
                    numbers: tokens?.profilesIDS.numbers,
                    tokenAnalytics: tokens?.tokenAnalytics,
                    tokenHappPlace: tokens?.tokenHappPlace,
                    mfaToken: tokens?.mfaToken,
                    authwebPush: tokens?.authwebPush?.keys.auth,
                    firstLogin,
                    accept: user.acceptTerms,
                    acceptCollaboration: user.acceptTermsCollaboration,
                    passwordValid: true,
                    name: user.name,
                    profilePhoto: user.profilePhoto,
                    networkLogin: user.networkLogin,
                    userId: user._id,
                    email: user.email,
                    isManager
                },
                'Sucesso ao logar',
                'users',
                'singleSignOn',
                [],
                [],
                true,
                'LOGIN',
                tokens?.namesProfiles.concat(tokens?.namesGroups)
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                { token, error: error.stack },
                'singleSignOn',
                'singleSignOn'
            );
        }
    },

    async acceptTerms(req, res) {
        try {
            const { _id } = await getUserByToken(req);
            await User.findByIdAndUpdate(_id, {
                $set: { acceptTerms: true },
            });
            _messages.success(
                res,
                req,
                'Sucesso',
                'Aceitação dos termos de uso',
                'users',
                'acceptTerms',
                [],
                [],
                true,
                'TERMS OF USE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'acceptTerms'
            );
        }
    },

    async watchedVideo(req, res) {
        try {
            const { _id } = await getUserByToken(req);
            await User.findByIdAndUpdate(_id, {
                $set: { welcomeVideoWatched: true },
            });
            _messages.success(
                res,
                req,
                'Sucesso',
                'Aceitação dos termos de uso',
                'users',
                'acceptTerms',
                [],
                [],
                true,
                'TERMS OF USE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'acceptTerms'
            );
        }
    },

    async acceptTermsCollaboration(req, res) {
        try {
            const { _id } = await getUserByToken(req);
            await User.findByIdAndUpdate(_id, {
                acceptTermsCollaboration: true,
            });
            _messages.success(
                res,
                req,
                'Sucesso',
                'Aceitação dos termos de uso de colaboração',
                'users',
                'acceptTermsCollaboration',
                [],
                [],
                true,
                'TERMS OF USE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'acceptTermsCollaboration'
            );
        }
    },

    async recoveryPassword(req, res) {
        const { body, domain, changeByEmail } = req.body;

        if (typeof body !== 'object' || Object.values(body).some((value) => !value?.length)) {
            throw new ApiError('Dados inválidos', 400, body, { skipDbLog: true });
        }

        const search = buildSearchObject(body);

        if (search.birthDate || search.birthday) {
            const birthDateValue = search.birthDate || search.birthday;
            const strBirthdate = body.birthDate || body.birthday;
            const birthDateQuery = {
                $or: [
                    // lida com strings 28/12/2001
                    { birthDate: birthDateValue },
                    { birthday: birthDateValue },

                    // lida com ISODates '2001-12-28T00:00:00.000Z'
                    {
                        birthDate: {
                            $gte: moment(strBirthdate, 'DD/MM/YYYY').toISOString(),
                            $lt: moment(strBirthdate, 'DD/MM/YYYY').add(1, 'days').toISOString(),
                        },
                    },
                    {
                        birthday: {
                            $gte: moment(strBirthdate, 'DD/MM/YYYY').toISOString(),
                            $lt: moment(strBirthdate, 'DD/MM/YYYY').add(1, 'days').toISOString(),
                        },
                    },
                ],
            };
            search.$or = search.$or ? [...search.$or, ...birthDateQuery.$or] : birthDateQuery.$or;

            delete search.birthDate;
            delete search.birthday;
        }
        delete search.token;
        const user = await User.findOne(search);
        if (!user) {
            if (changeByEmail) {
                return _messages.success(res, req, { status: 'Sucesso' });
            }

            throw new ApiError('Não é possível alterar a senha', 400, body, { skipDbLog: true });
        }

        if (changeByEmail && !user.email) {
            throw new ApiError('Não é possível alterar a senha', 500);
        }

        const { password_new, newPass } = generateNewPassword(user);

        await User.findByIdAndUpdate(user._id, {
            password: newPass,
            passwordValid: false,
        });

        if (changeByEmail) {
            const token = generateToken({
                networkLogin: user.networkLogin,
                _id: user._id,
                password_old: password_new,
                partner_token: body.token,
            });

            const resetPasswordUrl = `${domain}/login/troca-senha?token=${token}`;

            await sendEmailRecoveryPassword(user.email, true, password_new, resetPasswordUrl, user);

            const userEmail = maskEmail(user.email);

            return _messages.success(
                res,
                req,
                { status: 'Sucesso', userEmail },
                'Email para recupera senha disparado',
                'users',
                'recoveryPassword',
                [],
                [],
                true,
                'RECOVERY PASSWORD'
            );
        }

        return _messages.success(res, req, password_new);
    },

    async changePassword(req, res) {
        try {
            const { password_old, password_new, password_newConfirm } = req.body;
            const { _id } = await getUserByToken(req);
            const user = await User.findOne({ _id: _id }, ['password']);

            // const passChecked = bcrypt.compareSync(password_old, user.password)
            if (password_old) {
                var pass = user.password.filter(function (obj) {
                    if (obj.valid === true && bcrypt.compareSync(password_old, obj.hash)) {
                        return true;
                    }

                    return false;
                });
            }

            var Oldpass = user.password.filter(function (obj) {
                if (bcrypt.compareSync(password_new, obj.hash)) {
                    return true;
                }

                return false;
            });

            if (password_new !== password_newConfirm) {
                return _messages.unauthorized(
                    res,
                    req,
                    new Error('ErrorAoTrocarSenha'),
                    'Erro ao trocar senha.',
                    'users',
                    'changePassword'
                );
            } else if (Oldpass.length > 0) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error('ErrorAoTrocarSenha'),
                    'Essa senha já foi utilizada anteriormente, por favor, crie uma nova senha.',
                    'users',
                    'changePassword'
                );
                return;
            } else {
                if (
                    pass &&
                    new Date(pass[0].createdAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000
                ) {
                    user.passwordValid = false;
                }
            }

            var salt = bcrypt.genSaltSync(10);
            var hashPass = bcrypt.hashSync(password_new, salt);

            var newPass = user.password.map(function (item, indice) {
                item.valid = false;
                return item;
            });

            newPass.push({
                hash: hashPass,
                valid: true,
                createdAt: new Date(),
            });

            await User.findByIdAndUpdate(_id, {
                password: newPass,
                passwordValid: true,
            });

            _messages.success(
                res,
                req,
                'Sucesso',
                'Senha alterada com sucesso',
                'users',
                'changePassword',
                [],
                [],
                true,
                'CHANGE PASSWORD'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'changePassword'
            );
        }
    },

    async changePasswordByEmail(req, res) {
        try {
            const { password_new, password_newConfirm } = req.body;
            const { data } = decodeToken(req.headers.authorization);

            const { _id, password_old } = data;
            const user = await User.findOne({ _id: _id });

            var pass = user?.password?.filter(function (obj) {
                if (obj?.valid === true && bcrypt.compareSync(password_old, obj.hash)) {
                    return true;
                }

                return false;
            });

            var Oldpass = user.password.filter(function (obj) {
                if (bcrypt.compareSync(password_new, obj.hash)) {
                    return true;
                }

                return false;
            });
            if (pass.length === 0 || password_new !== password_newConfirm) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error('ErrorAoTrocarSenha'),
                    'Erro ao trocar senha.',
                    'users',
                    'changePassword'
                );
                return;
            } else if (Oldpass.length > 0) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error('ErrorAoTrocarSenha'),
                    'Essa senha já foi utilizada anteriormente, por favor, crie uma nova senha.',
                    'users',
                    'changePassword'
                );
                return;
            } else {
                if (new Date(pass[0].createdAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000) {
                    user.passwordValid = false;
                }
            }

            var salt = bcrypt.genSaltSync(10);
            var hashPass = bcrypt.hashSync(password_new, salt);

            var newPass = user.password.map(function (item, indice) {
                item.valid = false;
                return item;
            });

            newPass.push({
                hash: hashPass,
                valid: true,
                createdAt: new Date(),
            });

            await User.findByIdAndUpdate(_id, {
                password: newPass,
                passwordValid: true,
            });
            if (data.partner_token) {
                await updateUserByPartnerToken(req, user, data.partner_token);
            }

            _messages.success(
                res,
                req,
                'Sucesso',
                'Senha alterada com sucesso',
                'users',
                'changePassword',
                [],
                [],
                true,
                'CHANGE PASSWORD'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'recoveryPassword'
            );
        }
    },

    async import(req, res) {
        var file = null;
        const newUsers = [];
        const existingUsers = [];
        const usersToSend = [];
        if (req.files.file) {
            file = req.files.file;
        } else {
            file = req.files.content;
        }
        const results = await _files.readXLSXUsers(file.path);

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

        const connectMap = await getConnectMap(true);

        let replaceMap = null;

        if (connectMap) {
            const errors = [];

            results.forEach((data) => {
                const dataErrors = validateDataByConnectMap(data, connectMap);
                if (dataErrors.length > 0) {
                    errors.push({
                        item: data.networkLogin ?? data.cpf ?? data.email ?? data.name,
                        errors: dataErrors,
                    });
                }
            });

            if (errors.length > 0) {
                throw new ApiError('Erro ao importar usuários', 400, errors, { skipDbLog: true });
            }

            replaceMap = getConnectMapReplacers(connectMap);
        }

        for (const result of results) {
            const processedUser = await processUsersLoad(
                result,
                fieldsForElegibility,
                false,
                false,
                replaceMap
            );

            const [account, existingUser] = await Promise.all([
                processUserAccount(processedUser),
                User.findOne({
                    $or: [
                        { networkLogin: processedUser.networkLogin },
                        { networkLogin: processedUser.cpf }
                    ]
                })
            ]);

            processedUser.password = existingUser ? existingUser.password : processedUser.password;

            if (existingUser) {
                const groupsAD = [
                    ...processedUser.groupsAD,
                    ...(existingUser.groupsAD?.filter((group) => group.startsWith('PERFIL_')) ??
                        []),
                ];
                existingUsers.push({
                    _id: existingUser._id,
                    processedUser: {
                        ...processedUser,
                        groupsAD: [...new Set(groupsAD)],
                        cpf: !isProduction ? hideCPFNumbers(processedUser.cpf) : processedUser.cpf,
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

        const automaticEligibilityConfig = await getConfiguration(
            ConfigTypes.AutomaticEligibility.Onboard
        );

        if (automaticEligibilityConfig?.enabled) {
            const { eligibility = [] } = automaticEligibilityConfig;

            existingUsers.forEach((user) => {
                user.processedUser.groupsAD = [
                    ...(user.processedUser.groupsAD ?? []),
                    ...eligibility,
                ];
            });

            newUsers.forEach((user) => {
                user.groupsAD = [...(user.groupsAD ?? []), ...eligibility];
            });
        }

        console.log(
            `Usuários processados, iniciando atualizações dos ${existingUsers.length} existentes`
        );
        for (const user of existingUsers) {
            const updatedUser = await User.findOneAndUpdate({ _id: user._id }, {
                ...user.processedUser,
            }, { $new: true }).lean();

            const { password, ...userWithoutPassword } = updatedUser
            WebhooksController.dispatch('update', 'users', false, userWithoutPassword);

            await Tracking.updateMany(
                { userLogin: user.processedUser.cpf },
                { $set: { userLogin: user.processedUser.networkLogin } }
            );
        }

        const usersDataConfig = await getUsersDataConfig();

        if (usersDataConfig?.inactivateIfNotInSpreadsheet) {
            console.log('Inativando usuários não presentes na planilha');

            const updatedUsers = await User.updateMany(
                {
                    onboarding: { $ne: true },
                    ignoreLoadInactivation: { $ne: true },
                },
                { $set: { status: 'INATIVO' } },
                { multi: true }
            );
        }

        if (newUsers.length > 0) {
            console.log(
                `Usuários existentes atualizados, iniciando criação de ${newUsers.length} novos usuários`
            );

            const insertedUsers = await User.insertMany(newUsers);
            for (const user of insertedUsers) {
                const { password, ...userWithoutPassword } = user
                WebhooksController.dispatch('update', 'users', false, userWithoutPassword);
            }

            if (messengerConfig.sendUsersToMicrosservice) {
                await sendAccountsToKafka(usersToSend);
                const campaign = createWelcomeCampaign();
                await sendMessageToKafka(campaign, newUsers);
                await NewMessage.create(campaign);
            }
        }

        _messages.success(res, req, 'Importado com sucesso');
    },

    async importOnboarding(req, res) {
        try {
            const onboarding = true;
            var file = null;
            const newUsers = [];
            const existingUsers = [];
            const usersToSend = [];

            if (req.files.file) {
                file = req.files.file;
            } else {
                file = req.files.content;
            }

            const results = await _files.readXLSXUsers(file.path, onboarding);

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
            const usersDataConfig = await getUsersDataConfig();

            const preventOnboardingGroupAdd = usersDataConfig?.preventOnboardingGroupAdd ?? false;

            for (const result of results) {
                const existingUser = await User.findOne({
                    networkLogin: result.cpf,
                });

                const processedUser = await processUsersLoad(
                    result,
                    fieldsForElegibility,
                    onboarding,
                    preventOnboardingGroupAdd
                );

                const account = await processUserAccount(processedUser);

                processedUser.password = existingUser
                    ? existingUser.password
                    : processedUser.password;

                if (existingUser) {
                    existingUsers.push({
                        _id: existingUser._id,
                        processedUser: {
                            ...processedUser,
                            cpf: !isProduction
                                ? hideCPFNumbers(processedUser.cpf)
                                : processedUser.cpf,
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

            console.log(
                `Usuários processados, iniciando atualizações dos ${existingUsers.length} existentes`
            );

            for (const user of existingUsers) {
                await User.findByIdAndUpdate(user._id, {
                    ...user.processedUser,
                });
            }

            if (newUsers.length > 0) {
                console.log(
                    `Usuários existentes atualizados, iniciando criação de ${newUsers.length} novos usuários`
                );

                await User.insertMany(newUsers);

                if (messengerConfig.sendUsersToMicrosservice) {
                    await sendAccountsToKafka(usersToSend);
                    const campaign = createWelcomeCampaign();
                    await sendMessageToKafka(campaign, newUsers);
                    await NewMessage.create(campaign);
                }
            }

            _messages.success(res, req, 'Importado com sucesso');
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'import'
            );
        }
    },

    async returnUsers(req, res) {
        const { skip, limit } = pagination(req);
        const { order, sort } = ordernation(req);

        const searchBy = req.query?.searchBy ?? null;
        const isOnboarding = req.query.onboarding === 'true' || req.query.onboarding === true;
        const isPartner = req.query.partner === 'true' || req.query.partner === true;

        const query = {
            $and: [
                {
                    onboarding: isOnboarding ? true : { $ne: true },
                    partner: isPartner ? { $exists: true } : { $exists: false },
                },
            ],
        };

        if (req?.segmentation) {
            handleSegmentationOnQuery(req, 'issuer', query);
        }

        if (searchBy?.length) {
            query.$and.push({
                $or: [
                    { name: { $regex: searchBy, $options: 'i' } },
                    { registration: { $regex: searchBy, $options: 'i' } },
                    { email: { $regex: searchBy, $options: 'i' } },
                    { cpf: { $regex: searchBy, $options: 'i' } },
                ],
            });
        }

        const totalActive = await User.find({
            status: 'ATIVO',
            ...query,
        }).countDocuments();

        const totalInactive = await User.find({
            status: 'INATIVO',
            ...query,
        }).countDocuments();

        const total = await User.countDocuments(query);

        const users = await User.find(query)
            .sort({ [order]: sort })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        return _messages.success(res, req, {
            data: users,
            total,
            totalActive,
            totalInactive,
        });
    },

    async returnManagers(req, res) {
        const { skip, limit } = pagination(req);
        const { order, sort } = ordernation(req);

        const searchBy = req.query.searchBy;
        const filterManager = req.query.filterManager;

        const profiles = await Profile.find({ title: { $ne: 'PERFIL_Aluno' } }).sort({
            label: 'asc',
        });

        let query = {
            groupsAD: { $in: profiles.map((profile) => profile.title) },
        };

        if (filterManager) {
            query.groupsAD = { $in: [filterManager] };
        }

        if (req?.segmentation) {
            handleSegmentationOnQuery(req, 'issuer', query);
        }

        if (searchBy) {
            query.$or = [
                { name: { $regex: searchBy, $options: 'i' } },
                { registration: { $regex: searchBy, $options: 'i' } },
                { email: { $regex: searchBy, $options: 'i' } },
                { cpf: { $regex: searchBy, $options: 'i' } },
            ];
        }
        const managersCounters = [];

        for (const profile of profiles) {
            const queryProfile = { groupsAD: profile.title };
            if (searchBy) {
                queryProfile.$or = [
                    { name: { $regex: searchBy, $options: 'i' } },
                    { registration: { $regex: searchBy, $options: 'i' } },
                    { email: { $regex: searchBy, $options: 'i' } },
                    { cpf: { $regex: searchBy, $options: 'i' } },
                ];
            }
            const count = await User.countDocuments(queryProfile);
            managersCounters.push({ label: profile.label, title: profile.title, count });
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .sort({ [order]: sort })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        return _messages.success(res, req, {
            data: users,
            total,
            managersCounters,
        });
    },

    async returnUsersOnboarding(req, res) {
        try {
            const users = await findUsers(req, { onboarding: true });
            _messages.success(res, req, users);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'returnUsers'
            );
        }
    },

    async returnUserById(req, res) {
        try {
            const { _id } = await getUserByToken(req);
            const user = await User.findOne({ _id: _id }, { password: 0 });

            _messages.success(res, req, {
                data: user,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'returnUsers'
            );
        }
    },

    async updateUser(req, res) {
        try {
            const { _id, email, cpf, networkLogin, tags } = req.body;
            delete req.body.ip;
            const user = await User.findOne({
                _id: { $eq: _id },
            });
            if (tags && tags.length > 0) {
                for (const tag of tags) {
                    const filter = user.tags.filter((val) => {
                        return val.value === tag.value;
                    });

                    if (filter.length === 0) {
                        tag.createdAt = getDateToday();
                    } else {
                        tag.createdAt = filter[0].createdAt;
                    }
                }
            }

            const filter = [];
            const fields = ['email', 'networkLogin'];
            fields.map(
                (f) =>
                    req.body[f] &&
                    filter.push({
                        _id: { $ne: _id },
                        [f]: { $eq: req.body[f] },
                    })
            );

            const userUpdated = { ...req.body };
            const account = await processUserAccount(userUpdated);
            const value = JSON.parse(account.value);
            value.oldIdentifier = user.networkLogin;
            account.value = JSON.stringify(value);
            if (userUpdated?.networkLogin) {
                await sendAccountsToKafka([account]);
            }
            await User.findByIdAndUpdate(_id, req.body);
            const foundUser = await User.findOne({ _id }).lean();

            const { password, ...userWithoutPassword } = foundUser
            WebhooksController.dispatch('update', 'users', false, userWithoutPassword);

            if (userUpdated?.status) {
                await GamificationBusiness.setUserStatus(user.networkLogin, userUpdated.status);
            }

            return _messages.success(res, req, foundUser, 'Usuário(a) atualizado(a) com sucesso!');
        } catch (error) {
            console.log(error);
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'updateUser'
            );
        }
    },

    async updateUserById(req, res) {
        try {
            const { _id } = req.body;
            await User.findByIdAndUpdate(_id, req.body);
            _messages.success(res, req, 'Atualizado com sucesso');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'updateUser'
            );
        }
    },

    async changePhoto(req, res) {
        try {
            const user = await getUserByToken(req);
            const file = req.files.file;
            let photoPath = await _files.azureBlob(file, `photos/${user._id}`);
            await User.findByIdAndUpdate(user._id, { profilePhoto: photoPath });
            _messages.success(res, req, photoPath);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'changePhoto'
            );
        }
    },

    async isAuthenticated(req, res) {
        if (req.user && (await validateToken(req))) {
            await addSASTokenToResponse(res);

            return _messages.success(res, req, true);
        }

        _messages.unauthorized(
            res,
            req,
            'Sessão inválida ou expirada',
            false,
            'users',
            'isAuthenticated'
        );
    },

    async isAuthenticatedNginx(req, res) {
        if (await validateTokenNginx(req.params.token)) {
            _messages.success(res, req, true);
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                false,
                'users',
                'isAuthenticatedNginx'
            );
        }
    },

    async selfData(req, res) {
        try {
            const { data } = await decodeToken(req.headers.authorization);
            const user = await User.findOne(
                { _id: data.ref },
                'registration networkLogin name birthday birthDate admission typeHiring cargoCode cargo state costCenter hierarchical education gender email board department manager status'
            );
            _messages.success(res, req, user);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'changePhoto'
            );
        }
    },

    async importUserTest(req, res) {
        try {
            const usersTest = await UserTest.find();
            for (const result of usersTest) {
                const user = await User.findOne({
                    networkLogin: result.networkLogin,
                });

                const objUser = {
                    createDate: result.createDate,
                    birthDate: result.birthDate ?? result.birthday,
                    admission: result.admission,
                    registration: result.registration,
                    cpf: null,
                    name: result.name,
                    email: result.email,
                    gender: result.gender,
                    pcd: result.pcd,
                    cargoCode: result.cargoCode,
                    cargo: result.cargo,
                    assignment: result.assignment,
                    positionCode: result.positionCode,
                    typePosition: result.typePosition,
                    cat: result.cat,
                    networkLogin: result.networkLogin,
                    costCenter: result.costCenter,
                    costCenterDescription: result.costCenterDescription,
                    companyTime: result.companyTime,
                    timeFunction: result.timeFunction,
                    status: result.status,
                    reasonCode: result.reasonCode,
                    e: result.store,
                    initials: result.initials,
                    distrital: result.distrital,
                    group: result.group,
                    manager: result.manager,
                    enrollManager: result.enrollManager,
                    loginManager: result.loginManager,
                    nameManager: result.nameManager,
                };

                if (user) {
                    await User.findByIdAndUpdate(user._id, {
                        ...objUser,
                    });
                    WebhooksController.dispatch('update', 'users', false, {
                        ...objUser,
                        password: undefined,
                    });
                } else {
                    await User.create({
                        ...objUser,
                    });
                    WebhooksController.dispatch('create', 'users', false, {
                        ...objUser,
                        password: undefined,
                    });
                }
            }

            res.status(200).json('Migração realizada com sucesso');
        } catch (error) {
            res.status(500).json(error.message);
        }
    },

    async exportUsers(req, res) {
        try {
            const users = await User.find();
            const records = [];

            for (const user of users) {
                records.push({
                    nome: user.name,
                    login: user.networkLogin,
                    matricula: user.registration,
                });
            }

            const header = [
                { id: 'nome', title: 'NOME' },
                { id: 'login', title: 'LOGIN' },
                { id: 'matricula', title: 'MATRICULA' },
            ];

            await _files.writeFile(header, records);
            res.status(200).json('Exportado com sucesso');
        } catch (error) {
            res.status(500).json('Erro interno no servidor');
        }
    },

    async email(req, res) {
        try {
            const error = { message: 'ERRO NA CARGA DIÁRIA', stack: 'erro' };
            await sendLogEmail('success', error, 100, 10, 40, 50, '13/01/2020', 10, 20, 30);
            res.status(200).json('e-mail enviado');
        } catch (error) {
            await sendLogEmail('error', error);
            res.status(500).json(error.message);
        }
    },

    async importUsersDisabled(req, res) {
        try {
            const { file } = req.files;
            const results = await _files.readCSV(file.path);
            for (const result of results) {
                const user = await User.findOne({
                    networkLogin: { $eq: result.LOGIN },
                });

                if (user) {
                    await User.findByIdAndUpdate(user._id, {
                        status: result.STATUS,
                    });
                }
            }
            res.status(200).json('ok');
        } catch (error) {
            res.status(500).json(error.message);
        }
    },

    async emulation(req, res) {
        try {
            const { body } = req;
            const completeUser = await User.findById(body._id).lean();
            const isManager = await managerBusiness.isUserManager(completeUser);

            const {
                groupsAD,
                name,
                acceptTerms,
                acceptTermsCollaboration,
                profilePhoto,
                networkLogin,
                profiles,
                email,
                ...user
            } = completeUser;

            const isEmulatingSuperAdmin = groupsAD?.some(
                (profile) => profile === 'PERFIL_Super_Admin' || profile === 'PERFIL_Gestor_Usuario'
            );

            if (isEmulatingSuperAdmin) {
                return _messages.forbidden(
                    res,
                    req,
                    'Erro interno no servidor',
                    'Este usuário não pode ser emulado',
                    'users',
                    'emulation'
                );
            }

            const namesProfiles = [];
            const namesGroups = [];
            const dashboardFilters = await processDashFilters(completeUser);

            for (const p in groupsAD) {
                const cnSplit =
                    groupsAD[p].split('_')[0] +
                    '_' +
                    groupsAD[p].split('_')[1] +
                    '_' +
                    groupsAD[p].split('_')[2];
                if (cnSplit.indexOf('PERFIL_') >= 0) namesProfiles.push(groupsAD[p]);
                namesGroups.push(groupsAD[p]);
            }

            if (namesProfiles.length > 0) {
                const profilesIDS = await returnIdProfileUser(namesProfiles);
                const groupsIDS = await returnIdGroupUser(namesGroups);
                const userGroups = await Group.find({ name: { $in: namesGroups } });
                const eligibilities = userGroups.flatMap((group) =>
                    group.tags.flatMap((tag) => tag?.value || tag.display)
                );

                const result = {
                    token: {
                        ref: user._id,
                        clientId: process.env.CLIENT_ID,
                        userName: name,
                        email: email,
                        userTags: eligibilities,
                        profiles: profilesIDS.result,
                        numbers: profilesIDS.numbers,
                        groups: groupsIDS,
                        welcomeVideoWatched: user?.welcomeVideoWatched,
                    },
                    names: namesProfiles.concat(namesGroups),
                };

                const dataToken = result.token;
                const token = generateToken({
                    ref: body._id,
                    ...dataToken,
                });
                const token_analytics = generateTokenAnalytics({
                    perfil: profilesIDS.numbers,
                    clientID: CLIENT_ID,
                    filters: dashboardFilters,
                });

                const { token: SAS } = addSASTokenToResponse(res);

                const features = await getDbCurrentFeatures(req);

                if (features?.gamefication) {
                    GamificationBusiness.createClientUser(networkLogin, groupsAD);
                }

                _messages.success(res, req, {
                    SAS,
                    token,
                    email,
                    accept: acceptTerms,
                    acceptCollaboration: acceptTermsCollaboration,
                    numbers: result.token.numbers,
                    networkLogin,
                    name,
                    profilePhoto,
                    tokenAnalytics: token_analytics,
                    isManager,
                });
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Sem perfil vinculado',
                    'O usuário não possui algum perfil vinculado!',
                    'users',
                    '/emulation'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'emulation'
            );
        }
    },

    async importUpdateStatusUsers(req, res, next) {
        try {
            const { file } = req.files;
            const results = await _files.readCSV(file.path);
            for (const r of results) {
                const user = await User.find({
                    networkLogin: { $eq: r.LOGIN_REDE },
                });

                if (user[0]) {
                    await User.findByIdAndUpdate(user[0].id, {
                        status: 'INATIVO',
                        reasonCode: r.CODIGO_MOTIVO,
                    });
                }
            }
            res.status(200).json('ok');
        } catch (error) {
            res.status(500).json('Erro no servidor');
        }
    },

    async ssoCallback(req, res) {
        await Log.create({
            type: 'SSO_CALLBACK',
            message: 'SSO_CALLBACK',
            component: 'users',
            route: 'ssoCallback',
            dataNew: JSON.stringify({
                user: req.user,
                samlUserObject: req.samlUserObject,
                session: req.session,
                sessionID: req.sessionID,
            }),
        });

        const { strategyName, idpProfiles } = await fetchIdpProfilesFromRequestObject(req);

        const ssoForm = await getLoginFormByStrategyName(strategyName);

        const claim = ssoForm?.claim ?? 'networkLogin';

        const claimKey = ssoForm?.claimKey ?? 'no-claim-key-value';

        const claimValue =
            claimKey.split(',').reduce((acc, key) => {
                if (acc !== null && acc !== undefined && acc !== '') return acc;

                return _.get(req.user, key, null) || _.get(req.samlUserObject, key, null);
            }, null)
            ?? req.user?.nameID
            ?? null;

        await Log.create({
            type: 'SSO_CALLBACK_INFOS',
            message: 'SSO_CALLBACK',
            component: 'users',
            route: 'ssoCallback',
            dataNew: JSON.stringify({
                strategyName,
                idpProfiles,
                ssoForm: ssoForm ? { ...ssoForm, certifier: undefined } : 'FORM NOT FOUND',
                claim,
                claimKey,
                claimValue,
            }),
        });

        if (claimValue === undefined || claimValue === null) {
            // console.log('ssoCallback req.samlUserObject', req.samlUserObject);

            return _messages.internalServer(
                res,
                req,
                'SSO não retornou o valor esperado',
                {
                    message: 'SSO não retornou o valor esperado',
                    claim,
                    claimKey,
                    samlUserObject: req.samlUserObject,
                },
                'users',
                'ssoCallback'
            );
        }

        const token = jwt.sign(
            {
                [claim]: claimValue,
                strategyName,
                idpProfiles,
            },
            process.env.PROJECT_SECRET_KEY
        );

        res.redirect(302, `${environment.DOMAIN}/login/entrar/sso?token=${token}`);
    },

    async updateDeviceId(req, res) {
        try {
            const user = await getUserByToken(req);
            const { deviceId } = req.body;
            await sendUpdatedDeviceIdToMessenger(deviceId, user.networkLogin);

            _messages.success(res, req, { deviceId });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'device'
            );
        }
    },

    async returnCollaborativeUsers(req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const collaborativeUsers = await User.find(
                searchBy
                    ? {
                        $and: [
                            {
                                groupsAD: { $in: ['PERFIL_Colaborador'] },
                            },
                            {
                                $or: [
                                    {
                                        name: {
                                            $regex: searchBy,
                                            $options: 'i',
                                        },
                                    },
                                    {
                                        registration: {
                                            $regex: searchBy,
                                            $options: 'i',
                                        },
                                    },
                                    {
                                        email: {
                                            $regex: searchBy,
                                            $options: 'i',
                                        },
                                    },
                                ],
                            },
                        ],
                    }
                    : { groupsAD: { $in: ['PERFIL_Colaborador'] } }
            )
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            const total = await User.countDocuments(
                searchBy
                    ? {
                        $and: [
                            {
                                groupsAD: { $in: ['PERFIL_Colaborador'] },
                            },
                            {
                                $or: [
                                    {
                                        name: {
                                            $regex: searchBy,
                                            $options: 'i',
                                        },
                                    },
                                    {
                                        registration: {
                                            $regex: searchBy,
                                            $options: 'i',
                                        },
                                    },
                                    {
                                        email: {
                                            $regex: searchBy,
                                            $options: 'i',
                                        },
                                    },
                                ],
                            },
                        ],
                    }
                    : { groupsAD: { $in: ['PERFIL_Colaborador'] } }
            );

            _messages.success(res, req, {
                data: collaborativeUsers,
                total,
            });
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor');
        }
    },

    async setCollaborator(req, res) {
        try {
            const { userId, moderation } = req.body;
            if (!userId) {
                _messages.badRequest(res, req, 'Payload inválido', {
                    message: 'Payload inválido',
                });
                return;
            }

            const profiles = moderation
                ? ['PERFIL_Colaborador_Livre', 'PERFIL_Colaborador']
                : ['PERFIL_Colaborador'];

            await User.findByIdAndUpdate(userId, {
                $addToSet: { groupsAD: profiles },
            });

            _messages.success(res, req, {
                message: 'Usuário adicionado ao grupo de colaboradores',
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'setCollaborator'
            );
        }
    },

    async toggleCollaboratorModeration(req, res) {
        try {
            const { userId, moderation } = req.body;

            if (!userId) {
                _messages.badRequest(res, req, 'Payload inválido', {
                    message: 'Payload inválido',
                });
            }

            const profiles = ['PERFIL_Colaborador_Livre'];
            if (!moderation) {
                await User.findByIdAndUpdate(userId, {
                    $pullAll: { groupsAD: profiles },
                });
                _messages.success(res, req, {
                    message: 'Usuário removido do grupo de colaboradores livres',
                });
            } else {
                await User.findByIdAndUpdate(userId, {
                    $addToSet: { groupsAD: profiles },
                });
                _messages.success(res, req, {
                    message: 'Usuário adicionado ao grupo de colaboradores livres',
                });
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'setCollaborator'
            );
        }
    },

    async removeCollaborator(req, res) {
        try {
            const { userId } = req.body;

            if (!userId) {
                _messages.badRequest(res, req, 'Payload inválido', {
                    message: 'Payload inválido',
                });
            }

            const profiles = ['PERFIL_Colaborador', 'PERFIL_Colaborador_Livre'];

            await User.findByIdAndUpdate(userId, {
                $pullAll: { groupsAD: profiles },
            });

            _messages.success(res, req, {
                message: 'Usuário removido do grupo de colaboradores',
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'removeCollaborator'
            );
        }
    },

    async resetUserPassword(req, res) {
        try {
            const { userId, password, generate } = req.body;

            if (!userId || generate === null) {
                _messages.badRequest(res, req, 'Payload inválido', {
                    message: 'Payload inválido',
                });
            }

            let hashPassword;
            let generatedPassword;

            if (!generate && password) {
                hashPassword = {
                    hash: bcrypt.hashSync(password, 10),
                    valid: true,
                    createdAt: new Date(Date.now()),
                };
            } else {
                generatedPassword = Math.random()
                    .toString(36)
                    .replace(/[^a-zA-Z0-9_]+/g, '')
                    .substring(0, 12);
                hashPassword = {
                    hash: bcrypt.hashSync(generatedPassword, 10),
                    valid: true,
                    createdAt: new Date(Date.now()),
                };
            }

            await User.findOneAndUpdate(
                { _id: userId, 'password.valid': true },
                { $set: { 'password.$[].valid': false } },
                { new: true }
            );

            const user = await User.findOneAndUpdate(
                { _id: userId },
                { $push: { password: hashPassword } },
                { new: true }
            );

            if (user && user.email && generate) {
                await sendResetedPasswordToUser(
                    user.email,
                    generatedPassword,
                    process.env.DOMAIN,
                    user
                );
                _messages.success(res, req, {
                    message: 'Senha alterada e enviada para o usuário.',
                });
            } else if (user && user.email && !generate && password) {
                await sendResetedPasswordToUser(user.email, password, process.env.DOMAIN, user);
                _messages.success(res, req, {
                    message: 'Senha alterada e enviada para o usuário.',
                });
            } else {
                _messages.success(res, req, {
                    message: 'Senha alterada, porém o usuário não possui email. ',
                });
            }
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'resetUserPassword'
            );
        }
    },

    async deleteGroups(req, res) {
        const { tag, userId } = req.body;

        const arrTags = Array.isArray(tag) ? tag : [tag];

        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { $pullAll: { groupsAD: arrTags } },
                { new: true }
            );

            const usersWithGroup = await User.countDocuments({ groupsAD: tag });
            if (usersWithGroup == 0) {
                await Group.deleteOne({ name: tag });
            }

            const eligibilities = await handleUserEligibilitiesGamification(user.groupsAD);

            GamificationBusiness.updateClientUser(user.networkLogin, {
                eligibilities,
            });

            _messages.success(res, req, {
                message: 'Tag de permissão removida',
            });
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'users');
        }
    },

    async addGroups(req, res) {
        const { tag, userId } = req.body;

        // Cuurent user é o dono da requisição
        const token = req.headers.authorization;
        const currentUserProfiles = await returnProfileByToken(token);
        const { groupsAD } = await User.findOne({ _id: userId });

        const newTags = tag?.filter((t) => !groupsAD?.includes(t));

        const isCurrentUserSuperAdmin = currentUserProfiles.includes('PERFIL_Super_Admin');

        const IDPConfig = await getActiveIdpIntegrations();
        const isIDPActive = IDPConfig.length > 0;

        const isGroupAProfile = newTags?.some((t) => t?.includes('PERFIL_'));

        if (isIDPActive && isGroupAProfile) {
            return _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Não é possível adicionar tags de permissão para usuários enquanto configuração IDP estiver ativa',
                'users',
                'addGroups'
            );
        }

        if (tag === 'PERFIL_Super_Admin' && !isCurrentUserSuperAdmin) {
            return _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'O perfil de acesso atual não permite adicionar esta TAG enquanto a configuração de IDP estiver ativa.',
                'users',
                'addGroups'
            );
        }

        try {
            const normalizedTags = tag.map((t) => removeAccents(t));
            const user = await User.findOneAndUpdate(
                { _id: userId },
                { $addToSet: { groupsAD: normalizedTags } },
                { new: true }
            );
            for (const groupName of normalizedTags) {
                const findGroup = await Group.findOne({
                    name: groupName,
                    deleted: 0,
                });
                if (!findGroup) {
                    await Group.create({
                        name: groupName,
                    });
                }
            }

            const eligibilities = await handleUserEligibilitiesGamification(user.groupsAD);
            GamificationBusiness.updateClientUser(user.networkLogin, {
                eligibilities,
            });

            return _messages.success(res, req, {
                message: 'Tag de permissão adicionada ao usuário',
            });
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users'
            );
        }
    },

    async deleteClassTag(req, res) {
        const { tag, userId, classIdentifier } = req.body;
        const classGroups = classIdentifier
            ? {
                groupCode: tag,
                classIdentifier: { $in: [classIdentifier, new ObjectId(classIdentifier)] },
            }
            : { groupCode: tag, classIdentifier: { $exists: false } };

        try {
            await User.findByIdAndUpdate(userId, {
                $pull: { classGroups: classGroups },
            });
            _messages.success(res, req, { message: 'Tag de curso removida' });
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'users');
        }
    },

    async addClassTag(req, res) {
        const { tag, userId } = req.body;
        try {
            const classIdentifier = new ObjectId();
            // console.log('classIdentifier', classIdentifier);
            await User.findByIdAndUpdate(userId, {
                $addToSet: {
                    classGroups: {
                        ...tag,
                        classIdentifier,
                        startDate: new Date(tag.startDate),
                        limitDate: new Date(tag.limitDate),
                    },
                },
            });
            _messages.success(res, req, {
                message: 'Tag de curso adicionada ao usuário',
            });
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'users');
        }
    },

    async updateClassTag(req, res) {
        const { tag, _id } = req.body;

        const { classGroups } = await User.findById(_id);

        const foundTag = classGroups.find(
            (group) => String(group._id) === String(tag._id)
        );

        if (!foundTag) {
            await User.findByIdAndUpdate(_id, {
                $addToSet: {
                    classGroups: {
                        ...tag,
                        startDate: new Date(tag.startDate),
                        limitDate: new Date(tag.limitDate),
                    },
                },
            });
        } else {
            await User.findByIdAndUpdate(_id, {
                $set: {
                    'classGroups.$[elem].startDate': new Date(tag.startDate),
                    'classGroups.$[elem].limitDate': new Date(tag.limitDate),
                    'classGroups.$[elem].groupCode': tag.groupCode,
                },
            }, {
                arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(tag._id) }],
            });
        }

        _messages.success(res, req, {
            message: 'Tag de curso atualizada no usuário',
        });
    },

    async evaluationProgress(req, res) {
        try {
            const { idEvaluation } = req.params;
            const user = await getUserByToken(req);
            const evaluation = await Evaluation.findOne({
                _id: { $eq: idEvaluation },
            });
            const evaluationsHistoric = await HistoricEvaluation.find({
                idEvaluation: { $eq: evaluation._id },
                user: { $eq: user._id },
            });

            if (!evaluationsHistoric.length) {
                const message = 'Histórico da avaliação informada não pode ser encontrado';
                _messages.badRequest(res, req, message, { message });
            } else {
                const userAttempts = await Promise.all(
                    evaluationsHistoric.map(async (evaluationHistoric) => {
                        const questionResponse = await Promise.all(
                            evaluationHistoric.answers.map(async (answer) => {
                                const question = await Question.findOne({
                                    _id: { $eq: answer.idQuestion },
                                });
                                const alternative = await Alternative.findOne({
                                    _id: { $eq: answer.idAlternative },
                                });

                                return {
                                    question: {
                                        _id: question._id,
                                        description: question.description,
                                    },
                                    alternative: {
                                        _id: alternative._id,
                                        description: alternative.description,
                                    },
                                    correct: answer.correct,
                                    createdAt: answer.createdAt,
                                };
                            })
                        );

                        return {
                            _id: evaluationHistoric._id,
                            questionResponse,
                            performance:
                                evaluationHistoric.amountQuestionsCorrect /
                                evaluationHistoric.amountOfQuestions,
                            startedAt: evaluationHistoric.createdAt,
                            finishedAt: evaluationHistoric.updatedAt,
                        };
                    })
                );

                const evaluationProgress = {
                    _id: evaluation._id,
                    description: evaluation.description,
                    userAttempts,
                };

                _messages.success(res, req, evaluationProgress);
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'create'
            );
        }
    },

    async getAllConteudistas(req, res) {
        try {
            const query = {
                $and: [
                    {
                        groupsAD: { $in: ['PERFIL_Conteudista'] },
                    },
                ],
            };

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'issuer', query);
            }

            const users = await User.find(query);

            _messages.success(res, req, users);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'conteudistas'
            );
        }
    },

    async handleNames(req, res) {
        try {
            const { networkLogins } = req.body;
            const users = await User.find({ networkLogin: { $in: networkLogins } }, [
                'name',
                'networkLogin',
                'profilePhoto',
            ]);

            return _messages.success(res, req, users);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'conteudistas'
            );
        }
    },

    async generateMultiFactor(req, res) {
        try {
            const { networkLogin } = req.body;
            const user = await User.findOne({ networkLogin: networkLogin });
            const tokenAndSecret = await generateMultiFactor(user.name, networkLogin);
            if (user.alternativeEmail) {
                await sendMultiFactorToUser(user.email, user, tokenAndSecret.newToken.token);
                await sendMultiFactorToUser(
                    user.alternativeEmail,
                    user,
                    tokenAndSecret.newToken.token
                );
            } else {
                await sendMultiFactorToUser(user.email, user, tokenAndSecret.newToken.token);
            }
            _messages.success(res, req, tokenAndSecret.newSecret.secret);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'conteudistas'
            );
        }
    },

    async validateMultiFactor(req, res) {
        try {
            const user = await getUserByToken(req);
            const { secret, token } = req.body;
            const mfaToken = req.headers.mfatoken;
            const payload = jwt.decode(mfaToken);
            const validationReturn = await validateMultiFactor(secret, token);
            let mfaJwt;
            if (validationReturn && validationReturn.delta >= -5 && payload.data.ref == user._id) {
                mfaJwt = generateMfaToken({ mfa: true, ref: user._id });
                _messages.success(res, req, mfaJwt);
            } else {
                _messages.forbidden(
                    res,
                    req,
                    'Token inválido',
                    'Token inválido!',
                    'users',
                    'validateMultiFactor'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'conteudistas'
            );
        }
    },

    async validateMfaToken(req, res) {
        try {
            const isTokenValid = await validateMfaToken(req);
            _messages.success(res, req, isTokenValid);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'validateMfaToken'
            );
        }
    },

    async updateWebPushAuthorization(req, res) {
        try {
            const user = await getUserByToken(req);
            const webPushAuthorization = req.body;
            const userDB = await User.findById(user._id);
            let webPushAuthorizationArray = userDB.webPushAuthorization;
            if (webPushAuthorizationArray) {
                webPushAuthorizationArray.push(webPushAuthorization);
            } else {
                webPushAuthorizationArray = [webPushAuthorization];
            }

            await User.updateOne(
                { _id: user._id },
                { webPushAuthorization: webPushAuthorizationArray }
            );

            _messages.success(res, req, 'Sucess');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'WebPushAuthorization'
            );
        }
    },

    async getUserMap(req, res) {
        try {
            const connectMap = await getConnectMap(true);

            const fields = Object.entries(connectMap)
                .map(([key, value]) => ({
                    display: defaultUserMap[key]?.label ?? key ?? value?.label,
                    value: key,
                }))
                .filter((field) => field.value !== 'elegibility');

            const eligibilityData = await getConnectEligibilities();

            const eligibility = eligibilityData?.fields ?? [];

            _messages.success(res, req, {
                map: connectMap,
                fields,
                exceptions: ['status', 'cpf', 'cnpj', 'postalCode', 'pcd', 'manager'], // Campos que não devem ser alterados
                eligibility,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'getUserMap'
            );
        }
    },

    async putUserMap(req, res) {
        try {
            const { body } = req;

            const { data } = await axios.patch(
                `${process.env.API_CONNECT}/maps/${process.env.CLIENT_ID}`,
                {
                    user: { ...body },
                    elegibility: body.eligibility,
                    newFormat: true,
                },
                {
                    headers: {
                        'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                    },
                }
            );

            _messages.success(res, req, data.user);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'putUserMap'
            );
        }
    },

    async readSheetHeaders(req, res) {
        try {
            let file = null;
            if (req.files.file) {
                file = req.files.file;
            } else {
                file = req.files.content;
            }

            const data = await _files.readXLSXHeaders(file.path);
            const fields = Object.entries(defaultUserMap).map((entry) => ({
                display: entry[1].label,
                value: entry[0],
            }));

            _messages.success(res, req, { headers: data, fields });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'users',
                'readSheetHeaders'
            );
        }
    },

    async logout(req, res) {
        await clearAuthCookies(req, res);
        res.status(200).json({ ok: true });
    },
};
