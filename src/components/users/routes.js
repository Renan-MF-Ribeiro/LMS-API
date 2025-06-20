const express = require('express');
const rateLimit = require('express-rate-limit');
const _controller = require('./controller');
const multiparty = require('connect-multiparty');
const formidable = require('express-formidable');
const { authenticatePassport, parseSamlResponse } = require('../../utils/passport');
const {
    validateTokenRoute,
    isUserManager,
    isUserManagerOrSuperAdmin,
    isUserManagerOrSuperAdminOrElegibilityManager,
    canListUsers,
} = require('../../utils/middlewares');

const { clearSASTokenFromResponse, saveStrategyOnCookie } = require('../../utils/cookies');

module.exports = express
    .Router()
    .post(
        '/auth',
        rateLimit({
            windowMs: 1 * 60 * 1000, // 1 minutes
            limit: 10, // Limit each IP to 10 requests per `window` (here, per 1 minutes)
            standardHeaders: true,
            legacyHeaders: false,
        }),
        _controller.ldapSignIn
    )
    .post(
        '/logout',
        (req, res) => {
            clearSASTokenFromResponse(res);
            res.status(200).send('OK');
        }
    )
    .post('/accept-terms', validateTokenRoute, _controller.acceptTerms)
    .post('/watched-video', validateTokenRoute, _controller.watchedVideo)
    .post(
        '/accept-terms-collaboration',
        validateTokenRoute,
        _controller.acceptTermsCollaboration
    )
    .post(
        '/recovery-password',
        rateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            limit: 2,
            standardHeaders: true,
            legacyHeaders: false,
        }),
        _controller.recoveryPassword,
    )
    .post('/change-password', _controller.changePassword)
    .post('/change-password-email', _controller.changePasswordByEmail)
    .post('/change-photo', validateTokenRoute, formidable(), _controller.changePhoto)
    .get('/auth/isAuthenticated', _controller.isAuthenticated)
    .get('/auth/isAuthenticatedNginx/:token', _controller.isAuthenticatedNginx)
    .get('/me', _controller.selfData)
    .post('/gamification/names', validateTokenRoute, _controller.handleNames)
    .post('/users', validateTokenRoute, isUserManagerOrSuperAdmin, _controller.create)
    .post('/import', validateTokenRoute, isUserManagerOrSuperAdmin, formidable(), _controller.import) //added
    .post(
        '/import/onboarding',
        validateTokenRoute,
        isUserManagerOrSuperAdmin,
        formidable(),
        _controller.importOnboarding
    ) //added
    .get('/', validateTokenRoute, canListUsers, _controller.returnUsers)
    .get(
        '/onboarding',
        validateTokenRoute,
        canListUsers,
        (req, res, next) => {
            req.query.onboarding = true;
            return next();
        },
        _controller.returnUsers
    )
    .get(
        '/partners',
        validateTokenRoute,
        canListUsers,
        (req, res, next) => {
            req.query.partner = true;
            return next();
        },
        _controller.returnUsers
    )
    .get('/managers', validateTokenRoute, canListUsers, _controller.returnManagers)
    .put('/', validateTokenRoute, _controller.updateUser)
    .get('/users/:userId', validateTokenRoute, _controller.findById)
    .get('/import-users-test', validateTokenRoute, _controller.importUserTest)
    .get('/export-users', validateTokenRoute, _controller.exportUsers)
    .get('/envioemail', validateTokenRoute, _controller.email)
    .post(
        '/import-users-disabled',
        validateTokenRoute,
        multiparty(),
        _controller.importUsersDisabled
    )
    .post('/emulation', validateTokenRoute, isUserManagerOrSuperAdminOrElegibilityManager, _controller.emulation)
    .post(
        '/import-update-status',
        validateTokenRoute,
        multiparty(),
        _controller.importUpdateStatusUsers
    )
    .post('/signup', _controller.signup)
    .post('/activate', _controller.activateUser)
    .post('/sso', _controller.singleSignOn)
    .get(
        '/sso/saml',
        saveStrategyOnCookie,
        authenticatePassport,
    )
    .post(
        '/sso/saml/callback',
        authenticatePassport,
        parseSamlResponse,
        _controller.ssoCallback
    )
    .get(
        '/openid',
        saveStrategyOnCookie,
        authenticatePassport,
    )
    .get(
        '/openid/callback',
        authenticatePassport,
        _controller.openIdCallback
    )
    .post('/device', validateTokenRoute, _controller.updateDeviceId)
    .get(
        '/collaboration/list',
        validateTokenRoute,
        isUserManagerOrSuperAdmin,
        _controller.returnCollaborativeUsers
    )
    .put('/collaboration/apply', validateTokenRoute, isUserManagerOrSuperAdmin, _controller.setCollaborator)
    .put('/collaboration/remove', validateTokenRoute, isUserManagerOrSuperAdmin, _controller.removeCollaborator)
    .put(
        '/collaboration/moderation',
        validateTokenRoute,
        isUserManagerOrSuperAdmin,
        _controller.toggleCollaboratorModeration
    )
    .post('/password/reset', validateTokenRoute, isUserManager, _controller.resetUserPassword)
    .put('/update', validateTokenRoute, isUserManager, _controller.updateUserById)
    .get('/conteudistas', validateTokenRoute, _controller.getAllConteudistas)
    .get('/details', validateTokenRoute, _controller.returnUserById)
    .get('/feedbackelegibility', validateTokenRoute, _controller.feedbackElegible)
    .post('/remove-permission', validateTokenRoute, _controller.deleteGroups)
    .post('/add-permission', validateTokenRoute, isUserManagerOrSuperAdminOrElegibilityManager, _controller.addGroups)
    .post('/remove-class-tag', validateTokenRoute, isUserManagerOrSuperAdminOrElegibilityManager, _controller.deleteClassTag)
    .post('/add-class-tag', validateTokenRoute, _controller.addClassTag)
    .post('/update-class-tag', validateTokenRoute, _controller.updateClassTag)
    .get('/evaluations/:idEvaluation', validateTokenRoute, _controller.evaluationProgress)
    .get('/mfa/token', _controller.validateMfaToken)
    .post('/mfa/generate', _controller.generateMultiFactor)
    .post('/mfa/validate', _controller.validateMultiFactor)
    .post('/authorization', _controller.updateWebPushAuthorization)
    .get('/map', validateTokenRoute, _controller.getUserMap)
    .put('/map', validateTokenRoute, _controller.putUserMap)
    .post('/map/read-headers', validateTokenRoute, formidable(), _controller.readSheetHeaders);
