const ApiError = require("../../errors/ApiError");
const { getUserByToken, processTrailTracking } = require("../../utils/functions");
const { certificateClient, getHeaders } = require("../certificates/business");
const { Group } = require("../groups/model");
const { checkEligibilityTagsAnd, checkIfTheTrackIsValid, getTagsElegiblesByToken, setAssessmentHistoricOnSections } = require("../sections/business");
const { Section } = require("../sections/model");
const { Tracking } = require("../tracking/model");
const { populateTrails } = require("../trails/business");
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
        throw new ApiError('Seção de treinamento não encontrada', 404, undefined, { skipDbLog: true });
    }

    res.status(200).json(section);
}

async function generateTrainingSectionCertificate(req, res) {
    const sectionId = req.params.sectionId;

    const section = await Section
        .findOne({
            _id: sectionId,
            isTraining: true,
            active: true
        })
        .select('_id title description certificateLayout certificateDue trails')
        .lean();

    if (!section) {
        throw new ApiError('Seção de treinamento não encontrada', 404, undefined, { skipDbLog: true });
    }

    const user = await getUserByToken(req);
    const tags = await getTagsElegiblesByToken(req);

    const trailsDb = (await populateTrails(true, { enabled: true, _id: { $in: section.trails } }))
        ?.filter(trail => checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && !trail.collaborative)
        ?.filter((trail) => checkIfTheTrackIsValid(trail));

    const allItemsId = Array.from(
        new Set(
            trailsDb.map(trail => trail.items.map(item => item.itemID._id)).flat()
        )
    );

    const allTrackingUser = await Tracking.find({
        userLogin: user.networkLogin,
        item: { $in: allItemsId },
        $or: [
            { expiredCompletion: { $exists: false } },
            { expiredCompletion: { $eq: null } },
        ],
    });

    const completedTrails = trailsDb.map((trail) => {
        const processedTrail = processTrailTracking(trail, allTrackingUser);
        return processedTrail.trail;
    }).filter(trail => trail.completion === 1);

    const items = completedTrails.map(trail => {
        const totalMinutes = Math.round(trail.durationHours);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const trailTimeStr = `${hours > 0 ? `${hours}h` : ''} ${minutes > 0 ? `${minutes}m` : ''}`.trim();

        return {
            title: trail.title,
            time: trailTimeStr,
        }
    })

    const courseLoadTotalMinutes = Math.round(
        completedTrails.reduce((acc, trail) => acc + trail.durationHours, 0)
    );
    const courseLoadHours = Math.floor(courseLoadTotalMinutes / 60);
    const courseLoadMinutes = courseLoadTotalMinutes % 60;
    const courseLoadStr = `${courseLoadHours > 0 ? `${courseLoadHours}h` : ''} ${courseLoadMinutes > 0 ? `${courseLoadMinutes}m` : ''}`.trim();

    const completionDate = completedTrails.reduce((acc, trail) => {
        if (!trail.completionAt) return acc;

        const trailCompletionDate = new Date(trail.completionAt);

        if (!acc) {
            return trailCompletionDate;
        }

        if (acc < trailCompletionDate) {
            return trailCompletionDate;
        }

        return acc;
    }, null);

    if (!completionDate) {
        throw new ApiError(
            'Não foi possível gerar o certificado, pois o usuário não completou nenhuma trilha',
            400,
            undefined,
            { skipDbLog: true }
        );
    }

    let expirationDate = null;

    if (section.certificateDue?.type && section.certificateDue?.value) {
        const dueType = section.certificateDue.type; // fixed | availability

        if (dueType === 'fixed') {
            expirationDate = new Date(section.certificateDue.value);
        } else {
            expirationDate = new Date(
                new Date(completionDate)
                    .setDate(completionDate.getDate() + section.certificateDue.value)
            );
        }
    }

    const body = {
        clientId: Number(process.env.CLIENT_ID),
        userId: user.networkLogin,
        userName: user.name,
        sectionId: section.id,
        sectionName: section.title,
        sectionDescription: section.description,
        layoutId: section.certificateLayout,
        certificateDue: section.certificateDue,
        expirationDate,
        completionDate,
        courseLoad: courseLoadStr,
        workload: null,
        items,
    }

    const { data } = await certificateClient.post(
        '/certificates',
        body,
        { headers: getHeaders(req), responseType: 'arraybuffer' }
    );

    const file = Buffer.from(data, 'binary');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificado-${user.name}-${section.title}.pdf"`);
    res.send(file);
}

async function listTrainingTrackings(req, res) {
    const sections = await Section
        .find({
            isTraining: true,
            active: true
        })
        .select('_id title description certificateLayout certificateDue trails isTraining')
        .lean();

    const user = await getUserByToken(req);
    const tags = await getTagsElegiblesByToken(req);

    const trailsId = Array.from(new Set(sections.map(section => section.trails).flat()));

    const trailsDb = (await populateTrails(true, { enabled: true, _id: { $in: trailsId } }))
        ?.filter(trail => checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && !trail.collaborative)
        ?.filter((trail) => checkIfTheTrackIsValid(trail));

    const allItemsId = Array.from(
        new Set(
            trailsDb.map(trail => trail.items.map(item => item.itemID._id)).flat()
        )
    );

    const allTrackingUser = await Tracking.find({
        userLogin: user.networkLogin,
        item: { $in: allItemsId },
        $or: [
            { expiredCompletion: { $exists: false } },
            { expiredCompletion: { $eq: null } },
        ],
    });

    const allTrails = trailsDb.map((trail) => {
        const processedTrail = processTrailTracking(trail, allTrackingUser);
        return processedTrail.trail;
    });

    const mapSections = sections.map(section => {
        const sectionTrails = allTrails.filter(trail => {
            return sections.find(section => section.trails.map(t => String(t)).includes(String(trail._id)));
        });

        return { ...section, trails: sectionTrails }
    });

    await setAssessmentHistoricOnSections(user._id, mapSections);

    res.json(mapSections);
}

module.exports = {
    listTrainingSections,
    listTrainingSectionDetails,
    generateTrainingSectionCertificate,
    listTrainingTrackings
};