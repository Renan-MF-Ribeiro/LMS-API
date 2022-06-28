const express = require('express')
const router = express.Router()
const multiparty = require('connect-multiparty')
const _controller = require('./controller')
const _controllerCategories = require('./categories/controller')
const _controllerQuestions = require('./questions/controller')
const _controllerAlternative = require('./alternatives/controller')
const {
    isStudent,
    isAccountant,
} = require('../../utils/middlewares')

const formidable = require('express-formidable')

router
    // CATEGORIES
    .get('/categories/actives/:id', isAccountant, _controllerCategories.returnCategoriesActives)
    .get('/categories/:id', isAccountant, _controllerCategories.returnCategories)
    .post('/categories', isAccountant, _controllerCategories.createCategory)
    .put('/categories', isAccountant, _controllerCategories.updateCategory)
    .delete('/categories/:id', isAccountant, _controllerCategories.deleteCategory)

    // QUESTIONS
    .get('/questions/:id/:categoryId', isAccountant, _controllerQuestions.returnQuestions)
    .post('/questions', isAccountant, _controllerQuestions.createQuestion)
    .put('/questions', isAccountant, _controllerQuestions.updateQuestion)
    .put('/question/rigth-answer', isAccountant, _controllerQuestions.rigthAnswer)
    .put('/question/change-status', isAccountant, _controllerQuestions.changeStatus)
    .delete('/questions/:id', isAccountant, _controllerQuestions.deleteQuestion)

    // ALTERNATIVES
    .get('/alternatives/:id', isAccountant, _controllerAlternative.getAlternatives)
    .post('/alternatives', isAccountant, _controllerAlternative.createAlternative)
    .put('/alternatives', isAccountant, _controllerAlternative.updateAlternative)
    .delete('/alternatives/:id', isAccountant, _controllerAlternative.deleteAlternative)

    // EVALUATION
    .post('/', isAccountant, _controller.createEvaluation)
    .post('/import', isAccountant, formidable(), _controller.importQuestions)
    .post('/question-response', isStudent, _controller.questionResponse)
    .post('/countdown-evaluation', isStudent, _controller.countdownEvaluation)
    .post('/finalize-evaluation', isStudent, _controller.finalizeEvaluation)
    .put('/', isAccountant, _controller.updateEvaluation)
    .get('/check-evaluation-started/:idItem/:id', isStudent, _controller.checkEvaluationStarted)
    .get('/start-evaluation/:idItem/:id', isStudent, _controller.startEvaluation)
    .get('/next-question/:id', isStudent, _controller.nextQuestion)
    .get('/evaluation/:id', isStudent, _controller.returnEvaluation)
    .get('/actives', isAccountant, _controller.getActivesEvaluations)
    .get('/', isAccountant, _controller.getAllEvaluations)
    .delete('/:id', isAccountant, _controller.deleteEvaluation)

module.exports = router
