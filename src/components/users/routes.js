const express = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const _controller = require('./controller');
const multiparty = require('connect-multiparty');
const formidable = require('express-formidable');
const { authenticatePassportSAML, authenticatePassportOPENID, authenticatePassportOPENIDcallback } = require('../../utils/passport');
const {
    isAdmin,
    isAdminOrInstructor,
    validateTokenRoute,
} = require('../../utils/middlewares');

const Saml2js = require('saml2js');
const { clearSASTokenFromResponse } = require('../../utils/cookies');
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
    .post(
        '/change-photo',
        validateTokenRoute,
        formidable(),
        _controller.changePhoto
    )
    .get('/auth/isAuthenticated', _controller.isAuthenticated)
    .get('/auth/isAuthenticatedNginx/:token', _controller.isAuthenticatedNginx)
    .get('/me', _controller.selfData)
    .post('/gamification/names', validateTokenRoute, _controller.handleNames)
    .post('/users', validateTokenRoute, isAdmin, _controller.create)
    .post('/import', validateTokenRoute, formidable(), _controller.import)
    .post('/import/onboarding', validateTokenRoute, formidable(), _controller.importOnboarding)
    .get('/', validateTokenRoute, isAdminOrInstructor, _controller.returnUsers)
    .get(
        '/onboarding',
        validateTokenRoute,
        isAdminOrInstructor,
        (req, res, next) => {
            req.query.onboarding = true;
            return next();
        },
        _controller.returnUsers
    )
    .put('/', validateTokenRoute, isAdmin, _controller.updateUser)
    .get('/users/:userId', validateTokenRoute, isAdmin, _controller.findById)
    .get('/import-users-test', validateTokenRoute, _controller.importUserTest)
    .get('/export-users', validateTokenRoute, _controller.exportUsers)
    .get('/envioemail', validateTokenRoute, _controller.email)
    .post(
        '/import-users-disabled',
        validateTokenRoute,
        multiparty(),
        _controller.importUsersDisabled
    )
    .post('/emulation', validateTokenRoute, _controller.emulation)
    .post(
        '/import-update-status',
        validateTokenRoute,
        multiparty(),
        _controller.importUpdateStatusUsers
    )
    .post('/signup', _controller.signup)
    .post('/activate', _controller.activateUser)
    .post('/sso', _controller.singleSignOn)
    .get('/sso/openid/callback', authenticatePassportOPENIDcallback, _controller.openIdCallback)
    .get(
        '/sso/openid',
        authenticatePassportOPENID,
    )
    .get(
        '/sso/saml',
        authenticatePassportSAML,
    )
    .post(
        '/sso/saml/callback',
        authenticatePassportSAML,
        (req, res, next) => {
            const xmlResponse = req.body.SAMLResponse;
            const parser = new Saml2js(xmlResponse);
            req.samlUserObject = parser.toObject();
            next();
        },
        _controller.ssoCallback
    )
    .post('/device', validateTokenRoute, _controller.updateDeviceId)
    .get(
        '/collaboration/list',
        validateTokenRoute,
        isAdmin,
        _controller.returnCollaborativeUsers
    )
    .put(
        '/collaboration/apply',
        validateTokenRoute,
        isAdmin,
        _controller.setCollaborator
    )
    .put(
        '/collaboration/remove',
        validateTokenRoute,
        isAdmin,
        _controller.removeCollaborator
    )
    .put(
        '/collaboration/moderation',
        validateTokenRoute,
        isAdmin,
        _controller.toggleCollaboratorModeration
    )
    .post(
        '/password/reset',
        validateTokenRoute,
        isAdmin,
        _controller.resetUserPassword
    )
    .put('/update', validateTokenRoute, _controller.updateUserById)
    .get('/conteudistas', validateTokenRoute, _controller.getAllConteudistas)
    .get('/details', validateTokenRoute, _controller.returnUserById)
    .get(
        '/feedbackelegibility',
        validateTokenRoute,
        _controller.feedbackElegible
    )
    .post('/remove-permission', validateTokenRoute, _controller.deleteGroups)
    .post('/add-permission', validateTokenRoute, _controller.addGroups)
    .post('/remove-class-tag', validateTokenRoute, _controller.deleteClassTag)
    .post('/add-class-tag', validateTokenRoute, _controller.addClassTag)
    .post('/update-class-tag', validateTokenRoute, _controller.updateClassTag)
    .get(
        '/evaluations/:idEvaluation',
        validateTokenRoute,
        _controller.evaluationProgress
    )
    .get('/mfa/token', _controller.validateMfaToken)
    .post('/mfa/generate', _controller.generateMultiFactor)
    .post('/mfa/validate', _controller.validateMultiFactor)
    .post('/authorization', _controller.updateWebPushAuthorization)
    .get('/map', validateTokenRoute, _controller.getUserMap)
    .put('/map', validateTokenRoute, _controller.putUserMap)
    .post(
        '/map/read-headers',
        validateTokenRoute,
        formidable(),
        _controller.readSheetHeaders
    );

