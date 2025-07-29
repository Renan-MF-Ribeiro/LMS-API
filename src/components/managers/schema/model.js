const mongoose = require('mongoose');
const { connect } = require('../../../utils/db');

connect();

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};
const recommendedTrailsType = {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'trails', required: true },
    createdAt: { type: Date, required: false, default: Date.now },
};

const recommendedCoursesType = {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'courses', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'classes', required: true },
    createdAt: { type: Date, required: false, default: Date.now },
    released: { type: Boolean, required: false, default: false },
};

const RecommendedContentSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
        recommendedCourses: { type: [recommendedCoursesType], required: false, default: [] },
        recommendedTrails: { type: [recommendedTrailsType], required: false, default: [] },
    },
    {
        ...optionsSchema,
    }
);

RecommendedContentSchema.index({
    networkLogin: 'text',
});

const RecommendedContent = mongoose.model('users_recommended_content', RecommendedContentSchema);

module.exports = RecommendedContent;
