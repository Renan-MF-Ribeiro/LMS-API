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
    .post('/recovery-password', _controller.recoveryPassword)
    .post('/change-password', _controller.changePassword)
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
    .get('/collaboration/list', validateTokenRoute, _controller.returnCollaborativeUsers)
    .put('/collaboration/apply', isAdmin, _controller.setCollaborator)
    .put('/collaboration/remove', isAdmin, _controller.removeCollaborator)
    .put('/collaboration/moderation', isAdmin, _controller.toggleCollaboratorModeration)

// .get('/script-users', validateTokenRoute, _controller.scriptUsers)
