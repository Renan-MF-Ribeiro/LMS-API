const express = require('express')
const _controller = require('./controller')
const multiparty = require('connect-multiparty')
const formidable = require('express-formidable')
const passport = require('../../utils/passport')
const {
    isAdmin,
    isAdminOrInstructor,
    validateTokenRoute,
} = require('../../utils/middlewares')

const Saml2js = require('saml2js')
module.exports = express.Router()
    .post('/auth', _controller.ldapSignIn)
    .post('/accept-terms', validateTokenRoute, _controller.acceptTerms)
    .post('/accept-terms-collaboration', validateTokenRoute, _controller.acceptTermsCollaboration)
    .post('/recovery-password', _controller.recoveryPassword)
    .post('/change-password', _controller.changePassword)
    .post('/change-password-email', _controller.changePasswordByEmail)
    .post('/change-photo', validateTokenRoute, formidable(), _controller.changePhoto)
    .get('/auth/isAuthenticated', _controller.isAuthenticated)
    .get('/auth/isAuthenticatedNginx/:token', _controller.isAuthenticatedNginx)
    .get('/me', _controller.selfData)
    .post('/users', validateTokenRoute, isAdmin, _controller.create)
    .post('/import', validateTokenRoute, formidable(), _controller.import)
    .get('/', validateTokenRoute, isAdminOrInstructor, _controller.returnUsers)
    .put('/', validateTokenRoute, isAdmin, _controller.updateUser)
    .get('/users/:userId', validateTokenRoute, isAdmin, _controller.findById)
    .get('/import-users-test', validateTokenRoute, _controller.importUserTest)
    .get('/export-users', validateTokenRoute, _controller.exportUsers)
    .get('/envioemail', validateTokenRoute, _controller.email)
    .post('/import-users-disabled', validateTokenRoute, multiparty(), _controller.importUsersDisabled)
    .post('/emulation', validateTokenRoute, _controller.emulation)
    .post('/import-update-status', validateTokenRoute, multiparty(), _controller.importUpdateStatusUsers)
    .post('/signup', _controller.signup)
    .post('/activate', _controller.activateUser)
    .post('/sso', _controller.singleSignOn)
    .get('/sso/saml', passport.authenticate('saml', {
        successRedirect: '/',
        failureRedirect: '/login',
    }))
    .post('/sso/saml/callback', passport
        .authenticate('saml', { failureRedirect: '/', failureFlash: true }), (req, res, next) => {
        const xmlResponse = req.body.SAMLResponse
        const parser = new Saml2js(xmlResponse)
        req.samlUserObject = parser.toObject()
        next()
    },
    _controller.ssoCallback)
    .post('/device', validateTokenRoute, _controller.updateDeviceId)
    .get('/collaboration/list', validateTokenRoute, isAdmin, _controller.returnCollaborativeUsers)
    .put('/collaboration/apply', validateTokenRoute, isAdmin, _controller.setCollaborator)
    .put('/collaboration/remove', validateTokenRoute, isAdmin, _controller.removeCollaborator)
    .put('/collaboration/moderation', validateTokenRoute, isAdmin, _controller.toggleCollaboratorModeration)
    .post('/password/reset', validateTokenRoute, isAdmin, _controller.resetUserPassword)
    .put('/update', validateTokenRoute, _controller.updateUserById)
    .get('/conteudistas', validateTokenRoute, _controller.getAllConteudistas)
    .get('/details', validateTokenRoute, _controller.returnUserById)
    .get('/feedbackelegibility', validateTokenRoute, _controller.feedbackElegible)
    .post('/remove-permission', validateTokenRoute, _controller.deleteGroups)
    .post('/add-permission', validateTokenRoute, _controller.addGroups)
    .post('/remove-class-tag', validateTokenRoute, _controller.deleteClassTag)
    .post('/add-class-tag', validateTokenRoute, _controller.addClassTag)

    // HL-1263
    .get('/evaluations/:idEvaluation', validateTokenRoute, _controller.evaluationProgress)

// .get('/script-users', validateTokenRoute, _controller.scriptUsers)
