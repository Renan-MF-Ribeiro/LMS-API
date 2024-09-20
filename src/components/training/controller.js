const ApiError = require("../../errors/ApiError");
const { getUserByToken, processTrailTracking } = require("../../utils/functions");
const AssessmentBusiness = require("../assessment/business");
const { certificateClient, getHeaders } = require("../certificates/business");
const { Group } = require("../groups/model");
const { checkEligibilityTagsAnd, checkIfTheTrackIsValid, getTagsElegiblesByToken } = require("../sections/business");
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
        const trailTime = trail.durationHours;

        const hours = Math.floor(trailTime);
        const minutes = Math.round((trailTime - hours) * 60);

        const trailTimeStr = `${hours > 0 ? `${hours}h` : ''} ${minutes > 0 ? `${minutes}m` : ''}`.trim();

        return {
            title: trail.title,
            time: trailTimeStr,
        }
    })

    const courseLoad = completedTrails.reduce((acc, trail) => acc + trail.durationHours, 0); // carga horária

    const courseLoadHours = Math.floor(courseLoad);
    const courseLoadMinutes = Math.round((courseLoad - courseLoadHours) * 60);
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
    const user = await getUserByToken(req);
    const eligibilities = user.groupsAD.filter((group) => group.startsWith('ELEGE_'));

    const groups = await Group.find({ name: { $in: eligibilities } });
    const trails = await Trail.find({
        'tags.value': {
            $in: groups.flatMap((group) => group.tags.map((tag) => tag?.value || tag?.display)),
        },
    });

    const sections = await Section.find({
        isTraining: true,
        active: true,
        trails: { $in: trails.map((trail) => trail._id) },
    })
        .select('_id title description trails')
        .populate(Trail.name, '_id tags')
        .lean();

    const trackings = await Tracking.find({
        userLogin: user.networkLogin,
        item: {
            $in: trails.flatMap((trail) => trail.items.flatMap((item) => item.itemID)),
        },
    });

    const processedTrails = [];
    for (const trail of trails) {
        processedTrails.push(processTrailTracking(trail, trackings).trail);
    }

    const trainingSectionsStatus = await AssessmentBusiness.listTrainingSectionsStatus(user._id);

    const processedSections = sections.map((section) => {
        const trainingSectionStatus = trainingSectionsStatus.find((trainingSectionStatus) => {
            return section._id.equals(trainingSectionStatus.trainingSectionId);
        });

        const processedSectionTrails = section.trails.map((trail) => {
            return processedTrails.find((processedTrail) => {
                return processedTrail._id.equals(trail._id);
            });
        });

        const isBlocked = !!trainingSectionStatus?.isBlocked;
        const optionalTrailsId = trainingSectionStatus?.optionalTrailsId ?? [];

        const isCompleted = processedSectionTrails
            .filter((trail) => !optionalTrailsId.includes(trail))
            .every((trail) => trail.completion === 1)

        return {
            title: section.title,
            description: section.description,
            isBlocked,
            optionalTrailsId,
            completion: !isCompleted ? 0 : 1,
        };
    });

    res.send(processedSections);
}

module.exports = {
    listTrainingSections,
    listTrainingSectionDetails,
    generateTrainingSectionCertificate,
    listTrainingTrackings
};