const ApiError = require("../../errors/ApiError");
const { Section } = require("../sections/model");
const { Trail } = require("../trails/model");

async function listTrainingSections(req, res) {
    const sections = await Section
        .find({
            isTraining: true,
            active: true
        })
        .select('_id title description')
        .lean();

    res.status(200).json(sections);
}

async function listTrainingSectionDetails(req, res) {
    const sectionId = req.params.sectionId;

    const section = await Section
        .findOne({
            _id: sectionId,
            isTraining: true,
            active: true
        })
        .select('_id title description trails')
        .populate({
            path: 'trails',
            model: Trail,
            select: '_id title'
        })
        .lean();

    if (!section) {
        throw new ApiError('Seção de treinamento não encontrada', 404);
    }

    res.status(200).json(section);
}

module.exports = {
    listTrainingSections,
    listTrainingSectionDetails,
};