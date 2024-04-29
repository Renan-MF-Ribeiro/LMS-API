const mongoose = require('mongoose');
const { connect } = require('../../utils/db');

connect();

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const CourseSChema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        program: { type: 'ObjectId', ref: 'program' },
        dateInitial: { type: Date, required: true },
        dateFinal: { type: Date },
        workload: { type: Number, required: true },
        materials: {
            type: [{ type: 'ObjectId', ref: 'material' }],
            default: [],
        },
        certificateLayout: { type: 'ObjectId' },
        certificate: { type: Number, default: 0 },
        certificateDue: { type: Object, default: null },
        deleted: { type: Number, default: 0 },
        status: { type: Number, default: 1 },
        passingScore: { type: Number, required: false, default: null },
        isEvaluationAvailable: { type: Boolean, required: true, default: true },
        isSelfRegistrationEnabled: {
            type: Boolean,
            required: true,
            default: false,
        },
        qrCode: {
            type: String, required: true, trim: true,
            transform: (qrCode) => {
                if (qrCode == 'undefined' || qrCode == 'null' || !qrCode) {
                    return null
                }
                return qrCode
            },
        },
        tags: { type: Array, required: false },
        mandatory: { type: Array, required: false },
        completion: { type: Date, required: false },
        completionAt: { type: Date, required: false },
        thumbPath: { type: String, trim: true, required: false },
        instructor: { type: 'ObjectId', ref: 'users', required: false },
        inWaitList: { type: Boolean, required: false, default: false },
        score: { type: Number, required: false, default: null },
    },
    {
        ...schemaOptions,
    }
);

const MaterialSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        author: { type: String, default: 'CONTEUDISTA' },
    },
    {
        ...schemaOptions,
    }
);

const WaitListSchema = new mongoose.Schema(
    {
        userID: { type: 'ObjectId', ref: 'users', required: true },
        courseID: { type: 'ObjectId', ref: 'course', required: true },
        joinDate: { type: Date, required: false },
        sent: { type: Boolean, default: false }
    },
    {
        ...schemaOptions,
    }
);

const ProgramsSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        status: { type: Number, default: 1 },
    },
    {
        ...schemaOptions,
    }
);

const ClassSchema = new mongoose.Schema(
    {
        courseID: { type: 'ObjectId', ref: 'course', required: true },
        users: { type: Array, required: true },
        instructor: { type: 'ObjectId', ref: 'users', required: false },
        instructorTemp: { type: String, required: false },
        materials: {
            type: [{ type: 'ObjectId', ref: 'material' }],
            default: [],
        },
        qrcode: { type: String, required: false },
        qrCodeSelfRegistration: { type: String, required: false, default: '' },
        isSelfRegistrationEnabled: {
            type: Boolean,
            required: true,
            default: false,
        },
        dateApplication: { type: Date, required: false },
        dateApplicationInitial: { type: Date, required: false },
        dateApplicationFinal: { type: Date, required: false },
        canCreateClass: { type: Boolean, required: false },
    },
    {
        ...schemaOptions,
    }
);

const CourseEvaluationSchema = new mongoose.Schema(
    {
        classID: { type: 'ObjectId', ref: 'classes', required: true },
        studentID: { type: 'ObjectId', ref: 'users', required: true },
        answers: { type: Array, default: [] },
    },
    {
        ...schemaOptions,
    }
);



CourseSChema.index({
    title: 'text',
    description: 'text',
});

const CourseModel = mongoose.model('course', CourseSChema);
const MaterialModel = mongoose.model('material', MaterialSchema);
const ClassModel = mongoose.model('classes', ClassSchema);
const ProgramModel = mongoose.model('program', ProgramsSchema);
const WaitListModel = mongoose.model('waitlist', WaitListSchema);
const CourseEvaluationModel = mongoose.model(
    'course_evaluation',
    CourseEvaluationSchema
);

const vwCoursesWithTagsAndUsers = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    tags: { type: Array },
    mandatory: { type: Array },
    tagGroups: { type: Array },
    mandatoryGroups: { type: Array },
    user: {
        type: {
            name: { type: String, required: true },
            networkLogin: { type: String, required: false, default: null },
            email: { type: String, required: true },
            createdAt: { type: Date },
        },
        required: true,
    },
});

const vwWaitListsByCourses = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    users: { type: Array, required: true },
    sent: { type: Boolean, default: false }
});

const vwWaitListsUser = new mongoose.Schema({
    course: { type: Object, required: true },
    user: { type: Object, required: true },
    sent: { type: Boolean, default: false }
});

const vwCoursesWithUsers = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    users: { type: Array, required: true },
});

const vwUsersWithProcessedTags = new mongoose.Schema({
    userTags: { type: Array, required: true },
});

const CoursesWithTagsAndUsers = mongoose.model(
    'vwCoursesWithTagsAndUsers',
    vwCoursesWithTagsAndUsers,
    'vwCoursesWithTagsAndUsers'
);

const WaitListsByCourses = mongoose.model(
    'vwWaitListsByCourses',
    vwWaitListsByCourses,
    'vwWaitListsByCourses'
);

const WaitListsByUser = mongoose.model(
    'vwWaitListsUser',
    vwWaitListsUser,
    'vwWaitListsUser'
);

const CoursesWithUsers = mongoose.model(
    'vwCoursesWithUsers',
    vwCoursesWithUsers,
    'vwCoursesWithUsers'
);


const UsersWithProcessedTags = mongoose.model(
    'vwUsersWithProcessedTags',
    vwUsersWithProcessedTags,
    'vwUsersWithProcessedTags'
);

module.exports = {
    CourseModel,
    MaterialModel,
    ClassModel,
    ProgramModel,
    WaitListModel,
    CourseEvaluationModel,
    CoursesWithTagsAndUsers,
    WaitListsByCourses,
    WaitListsByUser,
    CoursesWithUsers,
    UsersWithProcessedTags
};
