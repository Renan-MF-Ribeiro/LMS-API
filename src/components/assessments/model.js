const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const lessonStatus = Object.freeze({
    NOT_ATTEMPTED: 'not attempted',
    INCOMPLETE: 'incomplete',
    FAILED: 'failed',
    PASSED: 'passed',
})

const EvalutionsSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    sort: { type: Number, required: true, default: 0 }, // 0 - SORTEAMENTO NA CATEGORIA / 1 - SORTEAMENTO GERAL
    attempts: { type: Number, required: false },
    duration: { type: Number, required: false },
    feedback: { type: Number, required: false, default: 0 }, // 0 - NÃO / 1 - SIM
    randomQuestions: { type: Number, required: false, default: 0 }, // 0 - NÃO / 1 - SIM
    active: { type: Number, required: false, default: 1 },
    categories: { type: [{ type: 'ObjectId', ref: 'categories' }] },
    deleted: { type: Number, default: 0 },
}, {
    ...optionsSchema,
})

const HistoricEvaluationSchema = new mongoose.Schema({
    idEvaluation: { type: 'ObjectId', ref: 'evaluations' },
    amountOfQuestions: { type: Number, required: true },
    amountQuestionsAnswered: { type: Number, default: 0 },
    amountQuestionsCorrect: { type: Number, default: 0 },
    questions: { type: [{ type: 'ObjectId', ref: 'questions' }] },
    answers: { type: Array, required: false }, // SERÁ UM ARRAY DE OBJETOS, CONTENDO A QUESTÃO RESPONDIDA, ALTERNATIVA CORRETA, E ALTERNATIVA RESPONDIDA
    user: { type: 'ObjectId', ref: 'users' },
    item: { type: 'ObjectId', ref: 'Item' },
    lessonStatus: {
        type: String,
        enum: Object.values(lessonStatus),
        default: lessonStatus.NOT_ATTEMPTED,
        required: true
    },
    duration: { type: Number, default: 0 },
    expiredCompletion: { type: Date, default: null }
}, {
    ...optionsSchema,
})

const LogsEvaluationSchema = new mongoose.Schema({
    idHistoricEvaluation: { type: 'ObjectId', ref: 'historic_evaluations' },
}, {
    ...optionsSchema,
})

const Evaluation = mongoose.model('evaluations', EvalutionsSchema)
const HistoricEvaluation = mongoose.model('historic_evaluations', HistoricEvaluationSchema)
const LogsEvaluation = mongoose.model('logs_evaluation', LogsEvaluationSchema)

module.exports = {
    Evaluation,
    HistoricEvaluation,
    LogsEvaluation,
}
