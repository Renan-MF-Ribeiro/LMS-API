const { Types } = require("mongoose");
const ApiError = require("../../errors/ApiError");
const { getUserByToken, stripHtmlTags } = require("../../utils/functions");
const { certificateClient, getHeaders } = require("../certificates/business");
const { setAssessmentHistoricOnSections, populateSectionTrails } = require("../sections/business");
const { Section } = require("../sections/model");
const { Trail } = require("../trails/model");
const { getEligibilityInfoByUserId } = require("../../utils/user");

async function listTrainingSections(req, res) {
    const sections = await Section
        .find({
            isTraining: true,
            active: true,
        })
        .select('_id title description')
        .lean();

    res.status(200).json(sections);
}

async function listTrainingSectionDetails(req, res) {
    const sectionId = req.params.sectionId;

    const dbSection = await Section
        .findOne({
            _id: sectionId,
            isTraining: true,
            active: true
        })
        .select('_id title description trails')
        .lean()

    const [section] = await populateSectionTrails([dbSection], { select: '_id title' });

    if (!section) {
        throw new ApiError('Seção de treinamento não encontrada', 400, undefined, { skipDbLog: true });
    }

    res.status(200).json(section);
}

async function generateTrainingSectionCertificate(req, res) {
    const sectionId = req.params.sectionId;

    const user = await getUserByToken(req);

    const { sections: userSections, trackings } = await getEligibilityInfoByUserId(
        user._id,
        {
            sections: {
                limit: 1,
                filter: {
                    _id: new Types.ObjectId(sectionId),
                    isTraining: true,
                    active: true
                }
            }
        },
    );
    
    const sections = await setAssessmentHistoricOnSections(user._id, userSections ?? []);
    
    const section = sections[0];

    if (!section) {
        throw new ApiError('Seção de treinamento não encontrada', 404, undefined, { skipDbLog: true });
    }

    const exceptionCertificateTrails = section.exceptionCertificateTrails ?? [];

    const trails = section.trails;

    const completedTrails = trails
        .filter(trail => !trail.isException)
        .filter(trail => !exceptionCertificateTrails.map(trailId => String(trailId)).includes(String(trail._id)))
        .filter(trail => trail.completion === 1);

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
            'Não foi possível gerar o certificado, pois o usuário não completou nenhuma trilha obrigatória',
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

    let initialDate = null;

    if (section.certificateLayout) {
        const { data: dataLayout } = await certificateClient.get(
            `/layouts/find-one/${section.certificateLayout}`,
            { headers: getHeaders(req), validateStatus: false }
        );

        if (dataLayout?.modelOptions?.initialDate) {
            const initialDateType = dataLayout.modelOptions.initialDateType ?? 'trail';

            if (initialDateType === 'item') {
                // find the first item tracking date
                const firstItemTracking = trackings.reduce((current, tracking) => {
                    if (!current) return tracking;

                    if (tracking.createdAt < current.createdAt) {
                        return tracking;
                    }

                    return current;
                }, null);

                initialDate = firstItemTracking?.createdAt ?? null;
            } else {
                const firstTrail = trails.reduce((current, trail) => {
                    if (!current) return trail;

                    if (trail.startDate < current.startDate) {
                        return trail;
                    }

                    return current;
                }, null);

                initialDate = firstTrail?.startDate ?? null;
            }
        }
    }

    const body = {
        clientId: Number(process.env.CLIENT_ID),
        userId: user.networkLogin,
        userName: user.name,
        sectionId: section._id,
        sectionName: section.title,
        sectionDescription: stripHtmlTags(section.description ?? ''),
        layoutId: section.certificateLayout,
        certificateDue: section.certificateDue,
        expirationDate,
        completionDate,
        courseLoad: courseLoadStr,
        workload: null,
        initialDate,
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

    const { sections } = await getEligibilityInfoByUserId(
        user._id,
        {
            sections: {
                filter: {
                    isTraining: true,
                    active: true,
                    deleted: 0
                }
            }
        }
    );

    res.json(
        await setAssessmentHistoricOnSections(user._id, sections)
    );
}

module.exports = {
    listTrainingSections,
    listTrainingSectionDetails,
    generateTrainingSectionCertificate,
    listTrainingTrackings
};