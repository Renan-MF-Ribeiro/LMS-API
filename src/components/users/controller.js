/* eslint-disable handle-callback-err */
require('dotenv').config();
const mongoose = require("mongoose");
const { CLIENT_ID, DOMAIN, AZURE_BLOB_URL, NODE_ENV } = process.env;
const _messages = require("../../utils/messages");
const _files = require("../../utils/files");
const { Message } = require("../messages/model");
const {
    User,
    UserTest,
    Block,
    userSchema,
    userProjection,
} = require("./model");

const {
    generateToken,
    generateSSOToken,
    decodeToken,
    validateToken,
    validateTokenNginx,
    returnIdProfileUser,
    returnIdGroupUser,
    generateTokenAnalytics,
    generateSASToken,
} = require("../../utils/auth");

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
} = require("./business");

const {
    sleep,
    getDateToday,
    pagination,
    ordernation,
    getUserByToken,
    formatNumberCpf,
} = require("../../utils/functions");

const {
    sendEmailRecoryPassword,
    sendLogEmail,
    sendSignupActivationEmail,
    sendNotificationEmail,
    sendResetedPasswordToUser,
} = require("../../utils/email");

const axios = require("axios");
const bcrypt = require("bcryptjs");
const cryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const { sendMessageToKafka } = require("../messages/business");

const config = require("../../../config.json");
const {
    getNumberOfItemsCompletedOrInProgressOrNotStarted,
} = require("../home/business");
const { HistoricEvaluation, Evaluation } = require("../assessments/model");
const { Question } = require("../assessments/questions/model");
const { Alternative } = require("../assessments/alternatives/model");
const inactivateIfNotInSpreadsheet =
    config.usersData.inactivateIfNotInSpreadsheet;
const sendSignUpActivationEmail = config.usersData.sendSignUpActivationEmail;

module.exports = {
    async create(req, res) {
        try {
            const userValue = new User(req.body);
            await userValue.validate();

            const { admission, birthDate } = userValue;

            const processedUser = processUsersLoad(userValue);
            const userFound = await User.findOne({
                $or: [
                    { cpf: processedUser.cpf },
                    { email: processedUser.email },
                    { networkLogin: processedUser.networkLogin },
                ],
            });

            processedUser.birthDate = admission;
            processedUser.admission = birthDate;

            if (userFound) {
                return _messages.forbidden(
                    res,
                    req,
                    "User already exists", { error: "User already exists" },
                    "users",
                    "create"
                );
            }

            await User.create(processedUser);
            const created = await User.findOne({ cpf: processedUser.cpf }, {...userProjection });

            return _messages.success(res, req, created);
        } catch (error) {
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
                req, !validationError ? "Internal Server Error" : "Validation Error", {
                    error: !validationError ?
                        "Internal Server Error" : validationError,
                },
                "users",
                "create"
            );
        }
    },

    async findById(req, res) {
        try {
            const _id = req.params.userId;
            const user = await User.findOne({ _id });
            _messages.success(res, req, user);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "findById"
            );
        }
    },
    async signup(req, res) {
        try {
            var salt = bcrypt.genSaltSync(10);
            const { networkLogin, properties } = req.body;

            const { password, ...data } = properties;

            const user = await User.find({ networkLogin });

            if (user.length !== 0) {
                _messages.badRequest(
                    res,
                    req,
                    "Usuário já cadastrado",
                    "Já existe um usuário cadastrado para este usuário",
                    "users",
                    "signup"
                );
            } else {
                const hashPassword = {
                    hash: bcrypt.hashSync(password, salt),
                    valid: true,
                    createdAt: new Date(Date.now()),
                };
                const userData = {
                    networkLogin,
                    password: hashPassword,
                    passwordValid: true,
                    clientUserKey: CLIENT_ID + "@@" + networkLogin,
                    groupsAD: ["PERFIL_Aluno", "ELEGE_CURSO"],
                    status: sendSignUpActivationEmail ? "INATIVO" : "ATIVO",
                    ...data,
                };

                const newUser = await User.create(userData);

                if (newUser && sendSignUpActivationEmail) {
                    const emailToken = generateToken({ networkLogin });

                    const activationLink = `${process.env.DOMAIN}/login/ativacao?token=${emailToken}`;

                    await sendSignupActivationEmail(
                        newUser.email,
                        activationLink
                    );
                }
                const token = generateToken({ networkLogin });

                _messages.success(res, req, token);
            }
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "signup"
            );
        }
    },

    async activateUser(req, res) {
        try {
            const { token, email } = req.body;
            const isUser = await bcrypt.compare(email, token);
            if (isUser) {
                const activate = await User.updateOne({ email }, { status: "ATIVO" });
                _messages.success(res, req, activate);
            } else {
                _messages.badRequest(
                    res,
                    req,
                    "Token inválido",
                    "O token fornecido é inválido"
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "signup"
            );
        }
    },

    async ldapSignIn(req, res) {
        let user = {};
        try {
            const { login, password } = req.body;

            var decrypted = cryptoJS.AES.decrypt(password, "pass");

            const passwordDecripty = decrypted.toString(cryptoJS.enc.Utf8);

            if (login !== undefined && password !== undefined) {
                user = await User.findOne({ networkLogin: { $eq: login }, status: "ATIVO" }, [
                    "_id",
                    "networkLogin",
                    "password",
                    "acceptTerms",
                    "acceptTermsCollaboration",
                    "passwordValid",
                    "name",
                    "profilePhoto",
                    "groupsAD",
                    "email",
                ]);

                if (user) {
                    const amountOfLocks = await checkAmountOfLocks(user._id);
                    // 5 Tentativas
                    if (amountOfLocks >= 50) {
                        const lastLoginAttemp = await returnLastLoginAttemp(
                            user._id
                        );
                        const resultDiff = await checkLastAttemptTime(
                            lastLoginAttemp
                        );

                        // 30min
                        if (resultDiff >= 1) {
                            await Block.updateMany({ user: { $eq: user._id } }, { unblocked: true });
                        } else {
                            sendNotificationEmail(
                                user.email,
                                "Conta bloqueada",
                                `Olá ${user.name}, uma nova tentativa de acesso a sua conta não foi permita pois sua conta está bloqueda. <br/> O desbloqueio é feito automaticamente, por favor, tente fazer um novo acesso dentro de 1h.`
                            );
                            _messages.forbidden(
                                res,
                                req,
                                "Usuário bloqueado temporariamente",
                                "Por favor tente novamente mais tarde!",
                                "users",
                                "ldapSignIn"
                            );
                            return;
                        }
                    }

                    var pass = user.password.filter(function(obj) {
                        if (
                            obj.valid === true &&
                            bcrypt.compareSync(passwordDecripty, obj.hash)
                        ) {
                            return true;
                        }

                        return false;
                    });

                    if (pass.length === 0) {
                        // sendNotificationEmail(user.email, "Falha na sua conta", `Olá ${user.name}, foi feita uma nova tentativa de acesso acesso a sua conta, se você não reconhece esse acesso, por favor, acesse a sua conta e troque a sua senha.`);
                        throw new Error("Senha inválida");
                    } else {
                        if (
                            new Date(pass[0].createdAt).getTime() <
                            Date.now() - 90 * 24 * 60 * 60 * 1000
                        ) {
                            user.passwordValid = false;
                        }
                    }

                    const groups = user.groupsAD;
                    const namesProfiles = [];
                    const namesGroups = [];

                    for (const p in groups) {
                        const strGroup = groups[p];

                        if (strGroup.indexOf("PERFIL_") >= 0)
                            namesProfiles.push(strGroup);

                        if (strGroup.indexOf("ELEGE") >= 0)
                            namesGroups.push(strGroup);
                    }

                    const profilesIDS = await returnIdProfileUser(
                        namesProfiles
                    );
                    const groupsIDS = await returnIdGroupUser(namesGroups);

                    const token = generateToken({
                        ref: user._id,
                        profiles: profilesIDS.result,
                        numbers: profilesIDS.numbers,
                        groups: groupsIDS,
                    });

                    const token_analytics = generateTokenAnalytics({
                        perfil: profilesIDS.numbers,
                        clientID: CLIENT_ID,
                    });

                    const SAS = generateSASToken();

                    await updateGroupsOfUser(
                        user._id,
                        namesProfiles.concat(namesGroups)
                    );
                    await updateLastLoginUser(user._id);

                    // sendNotificationEmail(user.email, "Acesso a sua conta", `Olá ${user.name}, foi feito uma novo acesso a sua conta, se você não reconhece esse acesso, por favor, acesse a sua conta e troque a sua senha.`);
                    var tokenEncript = cryptoJS.AES.encrypt(token, login);

                    var tk = tokenEncript.toString();
                    var key = login + ":" + password;
                    key = cryptoJS.AES.encrypt(key, password).toString();
                    _messages.success(
                        res,
                        req, {
                            SAS,
                            tk,
                            key,
                            accept: user.acceptTerms,
                            acceptCollaboration: user.acceptTermsCollaboration,
                            passwordValid: user.passwordValid,
                            numbers: profilesIDS.numbers,
                            name: user.name,
                            profilePhoto: user.profilePhoto,
                            tokenAnalytics: token_analytics,
                            networkLogin: user.networkLogin,
                            userId: user._id,
                        },
                        "Sucesso ao logar",
                        "users",
                        "ldapSignIn", [], [],
                        true,
                        "LOGIN",
                        namesProfiles.concat(namesGroups)
                    );
                } else {
                    await sleep(3000);
                    _messages.forbidden(
                        res,
                        req,
                        "Usuário ou senha inválidos.",
                        "Usuário ou senha inválidos.",
                        "users",
                        "ldapSignIn"
                    );
                }
            } else {
                _messages.forbidden(
                    res,
                    req,
                    "Usuário ou senha não informados",
                    "Erro de validação",
                    "users",
                    "ldapSignIn"
                );
            }
        } catch (error) {
            await sleep(3000);
            await Block.create({
                user: user._id,
                dateTimeBlock: getDateToday(),
                ip: req.ip,
            });
            _messages.forbidden(
                res,
                req,
                error.message,
                "Usuário ou senha inválidos.",
                "Usuário ou senha inválidos.",
                "users",
                "ldapSignIn"
            );
        }
    },

    async feedbackElegible(req, res) {
        const user = await getUserByToken(req);
        const today = new Date();
        const uri = `${process.env.API_SURVEY}/feedback/listbyuser?userid=${user._id}`;
        try {
            const response = await axios.get(uri);
            const firstLogin = await returnDateSinceFirstLogin(user._id);
            const { numberOfItemsCompleted } =
            await getNumberOfItemsCompletedOrInProgressOrNotStarted(req);
            if (response.data[0]) {
                const latestFeedback = response.data.slice(-1);
                const latestFeedbackDate = new Date(
                    latestFeedback[0].updatedAt
                );
                let daysSinceLastFeedback = Math.floor(
                    (latestFeedbackDate - today) / (24 * 3600 * 1000)
                );
                daysSinceLastFeedback *= -1;

                if (
                    firstLogin >= 1 &&
                    daysSinceLastFeedback >=
                    config.usersData.daysSinceLastFeedback &&
                    numberOfItemsCompleted >= 1
                ) {
                    _messages.success(res, req, true);
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
        let user = {};
        const { token } = req.body;
        const secret = process.env.JWT_SECRET;
        const data = await jwt.verify(token, secret);
        const networkLogin = data.networkLogin;

        try {
            if (networkLogin) {
                user = await User.findOne({ networkLogin, status: "ATIVO" }, [
                    "_id",
                    "networkLogin",
                    "user",
                    "password",
                    "acceptTerms",
                    "passwordValid",
                    "name",
                    "profilePhoto",
                    "groupsAD",
                    "email",
                ]);
                if (user) {
                    const amountOfLocks = await checkAmountOfLocks(user._id);
                    // 5 Tentativas
                    if (amountOfLocks >= 50) {
                        const lastLoginAttemp = await returnLastLoginAttemp(
                            user._id
                        );
                        const resultDiff = await checkLastAttemptTime(
                            lastLoginAttemp
                        );

                        // 30min
                        if (resultDiff >= 1) {
                            await Block.updateMany({ user: { $eq: user._id } }, { unblocked: true });
                        } else {
                            sendNotificationEmail(
                                user.email,
                                "Conta bloqueada",
                                `Olá ${user.name}, uma nova tentativa de acesso a sua conta não foi permita pois sua conta está bloqueda. <br/> O desbloqueio é feito automaticamente, por favor, tente fazer um novo acesso dentro de 1h.`
                            );
                            _messages.forbidden(
                                res,
                                req,
                                "Usuário bloqueado temporariamente",
                                "Por favor tente novamente mais tarde!",
                                "users",
                                "ldapSignIn"
                            );
                            return;
                        }
                    }

                    const groups = user.groupsAD;
                    const namesProfiles = [];
                    const namesGroups = [];

                    for (const p in groups) {
                        const strGroup = groups[p];

                        if (strGroup.indexOf("PERFIL_") >= 0)
                            namesProfiles.push(strGroup);

                        if (strGroup.indexOf("ELEGE") >= 0)
                            namesGroups.push(strGroup);
                    }

                    const profilesIDS = await returnIdProfileUser(
                        namesProfiles
                    );
                    const groupsIDS = await returnIdGroupUser(namesGroups);

                    const token = generateSSOToken({
                        ref: user._id,
                        profiles: profilesIDS.result,
                        numbers: profilesIDS.numbers,
                        groups: groupsIDS,
                    });

                    const token_analytics = generateTokenAnalytics({
                        perfil: profilesIDS.numbers,
                        clientID: CLIENT_ID,
                    });

                    const SAS = generateSASToken();

                    await updateGroupsOfUser(
                        user._id,
                        namesProfiles.concat(namesGroups)
                    );
                    await updateLastLoginUser(user._id);

                    var tokenEncript = cryptoJS.AES.encrypt(
                        token,
                        "happlearning"
                    );
                    var key = "happlearning" + ":" + "25KP76yNnhiGH9bSj";

                    var tk = tokenEncript.toString();
                    key = cryptoJS.AES.encrypt(
                        key,
                        "25KP76yNnhiGH9bSj"
                    ).toString();

                    _messages.success(
                        res,
                        req, {
                            SAS,
                            tk,
                            key,
                            accept: user.acceptTerms,
                            passwordValid: user.passwordValid,
                            numbers: profilesIDS.numbers,
                            name: user.name,
                            profilePhoto: user.profilePhoto,
                            tokenAnalytics: token_analytics,
                            networkLogin: user.networkLogin,
                            userId: user._id,
                        },
                        "Sucesso ao logar",
                        "users",
                        "ldapSignIn", [], [],
                        true,
                        "LOGIN",
                        namesProfiles.concat(namesGroups)
                    );
                } else {
                    await sleep(3000);
                    _messages.forbidden(
                        res,
                        req,
                        "Usuário ou senha inválidos.",
                        "Usuário ou senha inválidos.",
                        "users",
                        "ldapSignIn"
                    );
                }
            } else {
                _messages.forbidden(
                    res,
                    req,
                    "Usuário ou senha não informados",
                    "Erro de validação",
                    "users",
                    "ldapSignIn"
                );
            }
        } catch (error) {
            await sleep(3000);
            await Block.create({
                user: user._id,
                dateTimeBlock: getDateToday(),
                ip: req.ip,
            });
            _messages.forbidden(
                res,
                req,
                error.message,
                "Usuário ou senha inválidos.",
                "<strong>Usuário ou senha inválidos. </strong>",
                "users",
                "ldapSignIn"
            );
        }
    },

    async acceptTerms(req, res) {
        try {
            const { _id } = await getUserByToken(req);
            await User.findByIdAndUpdate(_id, { acceptTerms: true });
            _messages.success(
                res,
                req,
                "Sucesso",
                "Aceitação dos termos de uso",
                "users",
                "acceptTerms", [], [],
                true,
                "TERMS OF USE"
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "acceptTerms"
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
                "Sucesso",
                "Aceitação dos termos de uso de colaboração",
                "users",
                "acceptTermsCollaboration", [], [],
                true,
                "TERMS OF USE"
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "acceptTermsCollaboration"
            );
        }
    },

    async recoveryPassword(req, res) {
        try {
            const { body, domain, changeByEmail } = req.body;

            let search = Object();
            Object.entries(body).forEach(([k, v]) => {
                search = Object.assign(search, {
                    [k]: { $eq: v },
                });
            });

            const user = await User.findOne(search);

            if (!user) {
                throw "user not found";
            }

            const password_new = Math.random()
                .toString(36)
                .replace(/[^a-zA-Z0-9_]+/g, "")
                .substring(0, 6);

            var salt = bcrypt.genSaltSync(10);
            var hashPass = bcrypt.hashSync(password_new, salt);

            var newPass = user.password.map(function(item, indice) {
                item.valid = false;
                return item;
            });
            const networkLogin = user.networkLogin;
            const _id = user._id;

            const token = generateToken({
                networkLogin,
                _id,
                password_old: password_new,
            });

            const resetPasswordUrl = `${domain}/login/troca-senha?token=${token}`;

            newPass.push({
                hash: hashPass,
                valid: true,
                createdAt: new Date(),
            });

            const isUser = await User.findOneAndUpdate(search, {
                password: newPass,
                passwordValid: false,
            });

            if (isUser.email && changeByEmail) {
                const email = isUser.email.split("@");
                const emailName = email[0];
                let newEmail = "";
                for (const i in emailName) {
                    if (i > 2 && i < emailName.length) {
                        newEmail += "*";
                    } else {
                        newEmail += emailName[i];
                    }
                }
                newEmail = `${newEmail}@${email[1]}`;

                await sendEmailRecoryPassword(
                    user.email ? user.email : emails, !!user.email,
                    password_new,
                    resetPasswordUrl, { name: user.name, cpf: user.cpf }
                );
                // $2a$10$G06bQZrp8R8kn2cnImS47eHQv./K4i0bp1yBaNDyj3WSrsCH/639G --> senha
                return await _messages.success(
                    res,
                    req, { status: "Sucesso", userEmail: newEmail },
                    "Email para recupera senha disparado",
                    "users",
                    "recoveryPassword", [], [],
                    true,
                    "RECOVERY PASSWORD"
                );
            } else {
                return await _messages.success(res, req, password_new);
                // _messages.badRequest(res, req, 'Email não existe', 'Não existe uma conta associada a este email')
            }
        } catch (error) {
            if (error === "user not found") {
                return await _messages.notFound(res, req, error, error);
            }
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "recoveryPassword"
            );
        }
    },

    async changePassword(req, res) {
        try {
            const { password_old, password_new, password_newConfirm } =
            req.body;
            const { _id } = await getUserByToken(req);
            const user = await User.findOne({ _id: _id }, ["password"]);

            // const passChecked = bcrypt.compareSync(password_old, user.password)
            if (password_old) {
                var pass = user.password.filter(function(obj) {
                    if (
                        obj.valid === true &&
                        bcrypt.compareSync(password_old, obj.hash)
                    ) {
                        return true;
                    }

                    return false;
                });
            }

            var Oldpass = user.password.filter(function(obj) {
                if (bcrypt.compareSync(password_new, obj.hash)) {
                    return true;
                }

                return false;
            });

            if (password_new !== password_newConfirm) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error("ErrorAoTrocarSenha"),
                    "Erro ao trocar senha.",
                    "users",
                    "changePassword"
                );
                return;
            } else if (Oldpass.length > 0) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error("ErrorAoTrocarSenha"),
                    "Essa senha já foi utilizada anteriormente, por favor, crie uma nova senha.",
                    "users",
                    "changePassword"
                );
                return;
            } else {
                if (
                    pass &&
                    new Date(pass[0].createdAt).getTime() <
                    Date.now() - 90 * 24 * 60 * 60 * 1000
                ) {
                    user.passwordValid = false;
                }
            }

            var salt = bcrypt.genSaltSync(10);
            var hashPass = bcrypt.hashSync(password_new, salt);

            var newPass = user.password.map(function(item, indice) {
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
                "Sucesso",
                "Senha alterada com sucesso",
                "users",
                "changePassword", [], [],
                true,
                "CHANGE PASSWORD"
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "recoveryPassword"
            );
        }
    },

    async changePasswordByEmail(req, res) {
        try {
            const { password_new, password_newConfirm } = req.body;
            const { data } = decodeToken(req.headers.authorization);
            const { _id, password_old } = data;
            const user = await User.findOne({ _id: _id }, ["password"]);

            var pass = user.password.filter(function(obj) {
                if (
                    obj.valid === true &&
                    bcrypt.compareSync(password_old, obj.hash)
                ) {
                    return true;
                }

                return false;
            });

            var Oldpass = user.password.filter(function(obj) {
                if (bcrypt.compareSync(password_new, obj.hash)) {
                    return true;
                }

                return false;
            });

            if (pass.length === 0 || password_new !== password_newConfirm) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error("ErrorAoTrocarSenha"),
                    "Erro ao trocar senha.",
                    "users",
                    "changePassword"
                );
                return;
            } else if (Oldpass.length > 0) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error("ErrorAoTrocarSenha"),
                    "Essa senha já foi utilizada anteriormente, por favor, crie uma nova senha.",
                    "users",
                    "changePassword"
                );
                return;
            } else {
                if (
                    new Date(pass[0].createdAt).getTime() <
                    Date.now() - 90 * 24 * 60 * 60 * 1000
                ) {
                    user.passwordValid = false;
                }
            }

            var salt = bcrypt.genSaltSync(10);
            var hashPass = bcrypt.hashSync(password_new, salt);

            var newPass = user.password.map(function(item, indice) {
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
                "Sucesso",
                "Senha alterada com sucesso",
                "users",
                "changePassword", [], [],
                true,
                "CHANGE PASSWORD"
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "recoveryPassword"
            );
        }
    },

    async import (req, res) {
        try {
            var file = null;
            const newUsers = [];
            const existingUsers = [];
            const usersToSend = [];
            if (req.files.file) {
                file = req.files.file;
            } else {
                file = req.files.content;
            }
            const preProcessedUsers = await _files.readXLSXUsers(file.path);
            const results = preProcessedUsers.map((user) => {
                if (user.cpf) {
                    user.cpf = user.cpf.replace(/[^a-z0-9]/gi, "");
                    user.cpf = formatNumberCpf(user.cpf);
                }
                return user;
            });

            for (const result of results) {
                if (result.cpf) {
                    const existingUser = await User.findOne({
                        cpf: result.cpf,
                    });

                    const processedUser = processUsersLoad(result);

                    const account = await processUserAccount(processedUser);

                    processedUser.password = existingUser ?
                        existingUser.password :
                        processedUser.password;

                    if (existingUser) {
                        existingUsers.push({
                            _id: existingUser._id,
                            processedUser,
                        });
                    } else {
                        usersToSend.push(account);
                        newUsers.push(processedUser);
                    }
                }
            }

            const data_start = new Date();
            console.log(
                `Usuários processados, iniciando atualizações dos ${existingUsers.length} existentes`
            );
            for (const user of existingUsers) {
                await User.findByIdAndUpdate(user._id, {
                    ...user.processedUser,
                });
            }

            if (inactivateIfNotInSpreadsheet) {
                await User.update({ updatedAt: { $lt: data_start } }, { $set: { status: "INATIVO" } }, { multi: true });
            }

            if (newUsers.length > 0) {
                console.log(
                    `Usuários existentes atualizados, iniciando criação de ${newUsers.length} novos usuários`
                );
                await User.insertMany(newUsers);

                if (config.messenger.sendUsersToMicrosservice) {
                    await sendAccountsToKafka(usersToSend);
                    const campaign = createWelcomeCampaign();
                    await sendMessageToKafka(campaign, newUsers);
                    await Message.create(campaign);
                }
            }

            _messages.success(res, req, "Importado com sucesso");
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "import"
            );
        }
    },

    async returnUsers(req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const users = await User.find(
                    searchBy ? {
                        $or: [
                            { name: { $regex: searchBy, $options: "i" } },
                            {
                                registration: {
                                    $regex: searchBy,
                                    $options: "i",
                                },
                            },
                            { email: { $regex: searchBy, $options: "i" } },
                        ],
                    } : {}
                )
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            const total = await User.find(
                searchBy ? {
                    $or: [
                        { name: { $regex: searchBy, $options: "i" } },
                        {
                            registration: {
                                $regex: searchBy,
                                $options: "i",
                            },
                        },
                        { email: { $regex: searchBy, $options: "i" } },
                    ],
                } : {}
            ).countDocuments();

            const totalActive = await User.find({
                status: "ATIVO",
            }).countDocuments();
            const totalInactive = await User.find({
                status: "INATIVO",
            }).countDocuments();

            _messages.success(res, req, {
                data: users,
                total,
                totalActive,
                totalInactive,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "returnUsers"
            );
        }
    },

    async returnUserById(req, res) {
        try {
            const { _id } = req.body;
            const user = await User.findOne({ _id: _id });

            user.password = undefined;

            _messages.success(res, req, {
                data: user,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "returnUsers"
            );
        }
    },

    async updateUser(req, res) {
        try {
            const { _id, email, cpf, networkLogin, tags } = req.body;
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
            const fields = ["cpf", "email", "networkLogin"];
            fields.map(
                (f) =>
                req.body[f] &&
                filter.push({
                    _id: { $ne: _id },
                    [f]: { $eq: req.body[f] },
                })
            );
            const found =
                filter.length && (await User.findOne({ $or: filter }));

            if (found) {
                const field =
                    found.email === email ?
                    "E-MAIL" :
                    found.networkLogin === networkLogin ?
                    "LOGIN" :
                    "CPF";

                return _messages.forbidden(
                    res,
                    req,
                    "Erro interno no servidor",
                    `O ${field} informado já está sendo utilizado`,
                    "users",
                    "updateUser"
                );
            }
            const userUpdated = { ... req.body }
            const account = await processUserAccount(userUpdated)
            const value  = JSON.parse(account.value)
            value.oldIdentifier = user.networkLogin;
            account.value = JSON.stringify(value)
            if (userUpdated?.networkLogin) {
                await sendAccountsToKafka([account])
            }
            const updated = await User.findByIdAndUpdate(_id, req.body, {
                projection: {...userProjection },
            });

            return _messages.success(
                res,
                req,
                updated,
                "Usuário(a) atualizado(a) com sucesso!"
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "updateUser"
            );
        }
    },

    async updateUserById(req, res) {
        try {
            const { _id } = req.body;
            await User.findByIdAndUpdate(_id, req.body);
            _messages.success(res, req, "Atualizado com sucesso");
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "updateUser"
            );
        }
    },

    async changePhoto(req, res) {
        try {
            const user = await getUserByToken(req);
            const file = req.files.file;
            // const photoPath = await _files.awsAmazon(file, `photos/${user._id}`)
            let photoPath = await _files.azureBlob(file, `photos/${user._id}`);
            if (NODE_ENV != "local") {
                photoPath = photoPath.replace(AZURE_BLOB_URL, DOMAIN);
            }
            await User.findByIdAndUpdate(user._id, { profilePhoto: photoPath });
            _messages.success(res, req, photoPath);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "changePhoto"
            );
        }
    },

    async isAuthenticated(req, res) {
        if (await validateToken(req)) {
            _messages.success(res, req, true);
        } else {
            _messages.forbidden(
                res,
                req,
                "Sem permissão de acesso",
                false,
                "users",
                "isAuthenticated"
            );
        }
    },

    async isAuthenticatedNginx(req, res) {
        if (await validateTokenNginx(req.params.token)) {
            _messages.success(res, req, true);
        } else {
            _messages.forbidden(
                res,
                req,
                "Sem permissão de acesso",
                false,
                "users",
                "isAuthenticatedNginx"
            );
        }
    },

    async selfData(req, res) {
        try {
            const { data } = await decodeToken(req.headers.authorization);
            const user = await User.findOne({ _id: data.ref },
                "registration networkLogin name birthday admission typeHiring cargoCode cargo state costCenter hierarchical education gender email board department manager status"
            );
            _messages.success(res, req, user);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "changePhoto"
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
                    birthday: result.birthday,
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
                } else {
                    await User.create({
                        ...objUser,
                    });
                }
            }

            res.status(200).json("Migração realizada com sucesso");
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
                { id: "nome", title: "NOME" },
                { id: "login", title: "LOGIN" },
                { id: "matricula", title: "MATRICULA" },
            ];

            await _files.writeFile(header, records);
            res.status(200).json("Exportado com sucesso");
        } catch (error) {
            res.status(500).json("Erro interno no servidor");
        }
    },

    async email(req, res) {
        try {
            const error = { message: "ERRO NA CARGA DIÁRIA", stack: "erro" };
            await sendLogEmail(
                "success",
                error,
                100,
                10,
                40,
                50,
                "13/01/2020",
                10,
                20,
                30
            );
            res.status(200).json("e-mail enviado");
        } catch (error) {
            await sendLogEmail("error", error);
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
            res.status(200).json("ok");
        } catch (error) {
            res.status(500).json(error.message);
        }
    },

    async emulation(req, res) {
        try {
            const { body } = req;
            const { groupsAD, name, acceptTerms, profilePhoto } =
            await User.findById(body._id);

            const namesProfiles = [];
            const namesGroups = [];

            for (const p in groupsAD) {
                const cnSplit =
                    groupsAD[p].split("_")[0] +
                    "_" +
                    groupsAD[p].split("_")[1] +
                    "_" +
                    groupsAD[p].split("_")[2];
                if (cnSplit.indexOf("PERFIL_") >= 0)
                    namesProfiles.push(groupsAD[p]);
                namesGroups.push(groupsAD[p]);
            }

            if (namesProfiles.length > 0) {
                const profilesIDS = await returnIdProfileUser(namesProfiles);
                const groupsIDS = await returnIdGroupUser(namesGroups);

                const result = {
                    token: {
                        profiles: profilesIDS.result,
                        numbers: profilesIDS.numbers,
                        groups: groupsIDS,
                    },
                    names: namesProfiles.concat(namesGroups),
                };
                const dataToken = result.token;
                const token = generateToken({
                    ref: body._id,
                    ...dataToken,
                });
                const SAS = generateSASToken();
                _messages.success(res, req, {
                    SAS,
                    token,
                    accept: acceptTerms,
                    numbers: result.token.numbers,
                    name,
                    profilePhoto,
                });
            } else {
                _messages.badRequest(
                    res,
                    req,
                    "Sem perfil vinculado",
                    "O usuário não possui algum perfil vinculado!",
                    "users",
                    "/emulation"
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "emulation"
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
                        status: "INATIVO",
                        reasonCode: r.CODIGO_MOTIVO,
                    });
                }
            }
            res.status(200).json("ok");
        } catch (error) {
            res.status(500).json("Erro no servidor");
        }
    },

    async ssoCallback(req, res) {
        const email =
            req.samlUserObject
            .httpSchemasXmlsoapOrgWs200505IdentityClaimsEmailaddress;
        const token = await jwt.sign({ email }, process.env.JWT_SECRET);
        res.redirect(
            302,
            `${process.env.DOMAIN}/login/entrar/sso?token=${token}`
        );
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
                "Erro interno no servidor",
                "users",
                "device"
            );
        }
    },

    async returnCollaborativeUsers(req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const collaborativeUsers = await User.find(
                    searchBy ? {
                        $and: [{
                                groupsAD: { $in: ["PERFIL_Colaborador"] },
                            },
                            {
                                $or: [{
                                        name: {
                                            $regex: searchBy,
                                            $options: "i",
                                        },
                                    },
                                    {
                                        registration: {
                                            $regex: searchBy,
                                            $options: "i",
                                        },
                                    },
                                    {
                                        email: {
                                            $regex: searchBy,
                                            $options: "i",
                                        },
                                    },
                                ],
                            },
                        ],
                    } : { groupsAD: { $in: ["PERFIL_Colaborador"] } }
                )
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            const total = await User.countDocuments(
                searchBy ? {
                    $and: [{
                            groupsAD: { $in: ["PERFIL_Colaborador"] },
                        },
                        {
                            $or: [{
                                    name: {
                                        $regex: searchBy,
                                        $options: "i",
                                    },
                                },
                                {
                                    registration: {
                                        $regex: searchBy,
                                        $options: "i",
                                    },
                                },
                                {
                                    email: {
                                        $regex: searchBy,
                                        $options: "i",
                                    },
                                },
                            ],
                        },
                    ],
                } : { groupsAD: { $in: ["PERFIL_Colaborador"] } }
            );

            _messages.success(res, req, {
                data: collaborativeUsers,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor"
            );
        }
    },

    async setCollaborator(req, res) {
        try {
            const { userId, moderation } = req.body;
            if (!userId || !moderation) {
                _messages.badRequest(res, req, "Payload inválido", {
                    message: "Payload inválido",
                });
            }

            const profiles = moderation ? ["PERFIL_Colaborador_Livre", "PERFIL_Colaborador"] : ["PERFIL_Colaborador"];

            await User.findByIdAndUpdate(userId, {
                $addToSet: { groupsAD: profiles },
            });

            _messages.success(res, req, {
                message: "Usuário adicionado ao grupo de colaboradores",
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "setCollaborator"
            );
        }
    },

    async toggleCollaboratorModeration(req, res) {
        try {
            const { userId, moderation } = req.body;

            if (!userId) {
                _messages.badRequest(res, req, "Payload inválido", {
                    message: "Payload inválido",
                });
            }

            const profiles = ["PERFIL_Colaborador_Livre"];
            if (!moderation) {
                await User.findByIdAndUpdate(userId, {
                    $pullAll: { groupsAD: profiles },
                });
                _messages.success(res, req, {
                    message: "Usuário removido do grupo de colaboradores livres",
                });
            } else {
                await User.findByIdAndUpdate(userId, {
                    $addToSet: { groupsAD: profiles },
                });
                _messages.success(res, req, {
                    message: "Usuário adicionado ao grupo de colaboradores livres",
                });
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "setCollaborator"
            );
        }
    },

    async removeCollaborator(req, res) {
        try {
            const { userId } = req.body;

            if (!userId) {
                _messages.badRequest(res, req, "Payload inválido", {
                    message: "Payload inválido",
                });
            }

            const profiles = ["PERFIL_Colaborador", "PERFIL_Colaborador_Livre"];

            await User.findByIdAndUpdate(userId, {
                $pullAll: { groupsAD: profiles },
            });

            _messages.success(res, req, {
                message: "Usuário removido do grupo de colaboradores",
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "removeCollaborator"
            );
        }
    },

    async resetUserPassword(req, res) {
        try {
            const { userId, password, generate } = req.body;

            if (!userId || generate === null) {
                _messages.badRequest(res, req, "Payload inválido", {
                    message: "Payload inválido",
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
                    .replace(/[^a-zA-Z0-9_]+/g, "")
                    .substring(0, 12);
                hashPassword = {
                    hash: bcrypt.hashSync(generatedPassword, 10),
                    valid: true,
                    createdAt: new Date(Date.now()),
                };
            }

            await User.findOneAndUpdate({ _id: userId, "password.valid": true }, { $set: { "password.$[].valid": false } }, { new: true });

            const user = await User.findOneAndUpdate({ _id: userId }, { $push: { password: hashPassword } }, { new: true });

            if (user && user.email && generate) {
                await sendResetedPasswordToUser(
                    user.email,
                    generatedPassword,
                    process.env.DOMAIN,
                    user
                );
                _messages.success(res, req, {
                    message: "Senha alterada e enviada para o usuário.",
                });
            } else if (user && user.email && !generate && password) {
                await sendResetedPasswordToUser(
                    user.email,
                    password,
                    process.env.DOMAIN,
                    user
                );
                _messages.success(res, req, {
                    message: "Senha alterada e enviada para o usuário.",
                });
            } else {
                _messages.success(res, req, {
                    message: "Senha alterada, porém o usuário não possui email. ",
                });
            }
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "resetUserPassword"
            );
        }
    },

    async deleteGroups(req, res) {
        const { tag, userId } = req.body;

        try {
            await User.findByIdAndUpdate(userId, { $pull: { groupsAD: tag } });
            _messages.success(res, req, {
                message: "Tag de permissão removida",
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users"
            );
        }
    },

    async addGroups(req, res) {
        const { tag, userId } = req.body;
        try {
            await User.findByIdAndUpdate(userId, {
                $addToSet: { groupsAD: tag },
            });
            _messages.success(res, req, {
                message: "Tag de permissão adicionada ao usuário",
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users"
            );
        }
    },

    async deleteClassTag(req, res) {
        const { tag, userId } = req.body;

        try {
            await User.findByIdAndUpdate(userId, { $pull: { classGroups: { groupCode: tag } } })
            _messages.success(res, req, { message: "Tag de curso removida" });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users"
            );
        }
    },

    async addClassTag(req, res) {
        const { tag, userId } = req.body;
        try {
            await User.findByIdAndUpdate(userId, {
                $addToSet: { classGroups: tag },
            });
            _messages.success(res, req, {
                message: "Tag de curso adicionada ao usuário",
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users"
            );
        }
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
                const message =
                    "Histórico da avaliação informada não pode ser encontrado";
                _messages.badRequest(res, req, message, { message });
            } else {
                const userAttempts = await Promise.all(
                    evaluationsHistoric.map(async(evaluationHistoric) => {
                        const questionResponse = await Promise.all(
                            evaluationHistoric.answers.map(async(answer) => {
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
                            performance: evaluationHistoric.amountQuestionsCorrect /
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
                "Erro interno no servidor",
                "users",
                "create"
            );
        }
    },

    async getAllConteudistas(req, res) {
        try {
            const users = await User.find({
                groupsAD: { $in: ["PERFIL_Conteudista"] },
            });
            _messages.success(res, req, users);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno no servidor",
                "users",
                "conteudistas"
            );
        }
    },
};