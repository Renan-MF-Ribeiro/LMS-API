const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const {
    isAccountantOrIntegrator,
    isAccountant,
    isIntegrator,
} = require('../../utils/middlewares')

router
    .get('/return-onboardings', isAccountantOrIntegrator, _controller.returnOnboardings)
    .get('/return-onboardings-actives', isAccountantOrIntegrator, _controller.returnOnboardingsActives)
    .get('/return-checklist/:id', isIntegrator, _controller.returnChecklist)
    .get('/checklist-applied', isIntegrator, _controller.checklistApplied)
    .post('/create-onboarding', isAccountant, _controller.createOnboarding)
    .post('/save-checklist', isIntegrator, _controller.saveChecklist)
    .put('/update-onboarding', isAccountant, _controller.updateOnboarding)
    .put('/checklist-applied', isIntegrator, _controller.updateChecklistApplied)
    .delete('/delete-onboarding/:id', isAccountant, _controller.deleteOnboarding)
    .delete('/checklist-applied/:id', isIntegrator, _controller.deleteChecklistApplied)

module.exports = router
