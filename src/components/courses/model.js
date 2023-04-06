const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const CourseSChema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dateInitial: { type: Date, required: true },
    dateFinal: { type: Date },
    workload: { type: Number, required: true },
    materials: { type: [{ type: 'ObjectId', ref: 'material' }], default: [] },
    deleted: { type: Number, default: 0 },
    status: { type: Number, default: 1 },
    passingScore: { type: Number, required: false, default: null },
    isEvaluationAvailable: { type: Boolean, required: true, default: true },
    isSelfRegistrationEnabled: { type: Boolean, required: true, default: false },
    qrCode: { type: String, required: true, trim: true },
    tags: { type: Array, required: false },
}, {
    ...schemaOptions,
})

const MaterialSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    author: { type: String, default: 'CONTEUDISTA' },
}, {
    ...schemaOptions,
})

const ClassSchema = new mongoose.Schema({
    courseID: { type: 'ObjectId', ref: 'course', required: true },
    users: { type: Array, required: true },
    instructor: { type: 'ObjectId', ref: 'users', required: false },
    instructorTemp: { type: String, required: false },
    materials: { type: [{ type: 'ObjectId', ref: 'material' }], default: [] },
    qrcode: { type: String, required: false },
    qrCodeSelfRegistration: { type: String, required: false, default: '' },
    isSelfRegistrationEnabled: { type: Boolean, required: true, default: false },
    dateApplication: { type: Date, required: false },
    dateApplicationInitial: { type: Date, required: false },
    dateApplicationFinal: { type: Date, required: false },
    canCreateClass: { type: Boolean, required: false },
    
}, {
    ...schemaOptions,
})


const CourseEvaluationSchema = new mongoose.Schema({
    classID: { type: 'ObjectId', ref: 'classes', required: true },
    studentID: { type: 'ObjectId', ref: 'users', required: true },
    answers: { type: Array, default: [] },
}, {
    ...schemaOptions,
})

CourseSChema.index({
    title: 'text',
    description: 'text',
})

const CourseModel = mongoose.model('course', CourseSChema)
const MaterialModel = mongoose.model('material', MaterialSchema)
const ClassModel = mongoose.model('classes', ClassSchema)
const CourseEvaluationModel = mongoose.model('course_evaluation', CourseEvaluationSchema)

module.exports = {
    CourseModel,
    MaterialModel,
    ClassModel,
    CourseEvaluationModel,
}
