const { Section } = require("../sections/model");

async function listTrainingSections(req, res) {
    const sections = await Section
        .find({
            isTraining: true,
        })
        .select('_id title description')
        .lean();

    res.status(200).json(sections);
}

module.exports = {
    listTrainingSections,
};