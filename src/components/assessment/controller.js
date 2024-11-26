const axios = require('axios');
const _messages = require('../../utils/messages');
const { getUserByToken } = require('../../utils/functions');
const { handleError } = require('../../utils/errors');
const { Group } = require('../groups/model');
const { User } = require('../users/model');
const AssessmentBusiness = require('./business');
const { getTagsElegiblesByToken, getGroupCodesByToken } = require('../sections/business');
const { azureBlob } = require('../../utils/files');

const host = process.env.API_ASSESSMENT;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-client-key': process.env.API_KEY_ASSESSMENT };

async function parseCycleBodyAndUploadImages(req) {
    const reqFields = req.fields?.payload;

    if (!reqFields) throw new Error('Invalid request');

    const reqFiles = Object.entries(req.files ?? []).map(([, file]) => file);

    const body = JSON.parse(reqFields);

    if (body.isProcessedOnEnd) {
        body.isProcessedOnEnd = body.isProcessedOnEnd === 'true';
    }

    if (body.allowMultipleAttempts) {
        body.allowMultipleAttempts = body.allowMultipleAttempts === 'true';
    }

    if (body.trainingPillars?.length) {
        body.trainingPillars = body.trainingPillars.map(pillar => {
            pillar.range = pillar.range?.map(range => {
                if (range.min) range.min = Number(range.min);
                if (range.max) range.max = Number(range.max);

                if (range.image) {
                    range.file = reqFiles.find(image => image.name === range.image);
                }

                return range;
            }) ?? [];

            return pillar;
        });
    }

    for await (const [pillarIndex, pillar] of Object.entries(body.trainingPillars)) {
        for await (const [rangeIndex, range] of Object.entries(pillar.range)) {
            if (range.file) {
                body.trainingPillars[pillarIndex].range[rangeIndex].image = await azureBlob(range.file, 'cycles/pillars/ranges') ?? null;
                delete body.trainingPillars[pillarIndex].range[rangeIndex].file;
            }
        }
    }

    return body;
}

const AssessmentController = {
    async listPillars (req, res) {
        try {
            const searchParams = new URLSearchParams(req.query);
            const uri = `${host}/pillars/${clientId}?${searchParams}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async createPillar (req, res) {
        try {
            const uri = `${host}/pillars/${clientId}`;
            const { data } = await axios.post(uri, req.body, { headers });
            await handlePillarTags(req.body.eligibilities);

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async updatePillar (req, res) {
        try {
            const uri = `${host}/pillars/${clientId}`;
            const { data } = await axios.put(uri, req.body, { headers });
            await handlePillarTags(req.body.eligibilities);

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async getPillar (req, res) {
        try {
            const { pillarId } = req.params;
            const uri = `${host}/pillars/${clientId}/${pillarId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async deletePillar (req, res) {
        try {
            const { pillarId } = req.params;
            const uri = `${host}/pillars/${clientId}/${pillarId}`;
            const { data } = await axios.delete(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listCycles (req, res) {
        try {
            const searchParams = new URLSearchParams(req.query);
            const uri = `${host}/cycles/${clientId}?${searchParams}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listCyclesAndPillars (req, res) {
        try {
            const uri = `${host}/cycles/cycles-and-pillars/${clientId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async createCycle(req, res) {
        try {
            const uri = `${host}/cycles/${clientId}`;

            if (req.is('json')) {
                const { data } = await axios.post(uri, req.body, { headers });
                return _messages.success(res, req, data);
            }

            const body = await parseCycleBodyAndUploadImages(req);
            const { data } = await axios.put(uri, body, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async updateCycle(req, res) {
        try {
            const uri = `${host}/cycles/${clientId}`;

            if (req.is('json')) {
                const { data } = await axios.put(uri, req.body, { headers });
                return _messages.success(res, req, data);
            }

            const body = await parseCycleBodyAndUploadImages(req);
            const { data } = await axios.put(uri, body, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async deleteCycle (req, res) {
        try {
            const { cycleId } = req.params;
            const uri = `${host}/cycles/${clientId}/${cycleId}`;
            const { data } = await axios.delete(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listClientMatrices (req, res) {
        try {
            const searchBy = req.query.searchBy;
            const { pageSize, pageIndex } = req.query;
            const { orderBy, direction } = req.query;

            let uri = `${host}/matrix/${clientId}`;

            uri += `?pageSize=${pageSize}&pageIndex=${pageIndex}&orderBy=${orderBy}&direction=${direction}`;

            if (searchBy && searchBy.length > 0) uri += `&searchBy=${searchBy}`;

            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async createMatrix (req, res) {
        try {
            const uri = `${host}/matrix`;

            const { data } = await axios.post(uri, { ...req.body, clientId }, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async updateMatrixPeriod (req, res) {
        try {
            const { matrixId, periodId } = req.params;
            const uri = `${host}/matrix/update-period/${matrixId}/${periodId}`;

            const body = {
                weightsByPeriod: {
                    periodId,
                    xWeights: req.body.xWeights,
                    yWeights: req.body.yWeights,
                },
            };
            const { data } = await axios.patch(uri, body, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async updateMatrix (req, res) {
        try {
            const { matrixId } = req.params;
            const body = req.body;
            delete body.weightsByPeriod
            const uri = `${host}/matrix/update-matrix/${clientId}/${matrixId}`;
            const { data } = await axios.put(uri, body, { headers });
            console.log(data)
            return _messages.success(res, req, data);
        } catch (error) {
            console.log(error)
            return handleError(res, req, error);
        }
    },

    async softDeleteMatrix (req, res) {
        try {
            const { id } = req.params;

            const uri = `${host}/matrix/${id}`;

            const { data } = await axios.delete(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async getHistoric (req, res) {
        try {
            const { cycleId, periodId } = req.params;
            const { _id } = await getUserByToken(req);

            const uri = `${host}/historics/${clientId}/${_id.toString()}/${cycleId}/${periodId}`;

            const { data } = await axios.get(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async getHistoricDetails (req, res) {
        try {
            const { cycleId, periodId } = req.params;
            const { _id } = await getUserByToken(req);

            const uri = `${host}/historics/${clientId}/${_id.toString()}/${cycleId}/${periodId}/details`;

            const { data } = await axios.get(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async getUserMatrixDetails (req, res) {
        try {
            const { matrixId, periodId } = req.params;
            const { _id } = await getUserByToken(req);

            const uri = `${host}/historics/user-matrix-details/${clientId}/${_id.toString()}/${matrixId}/${periodId}`;

            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async review (req, res) {
        try {
            const { _id: userId } = await getUserByToken(req);
            const { pillarId, cycleId, periodId, questionId, alternativeId } = req.body

            const uri = `${host}/historics/${clientId}/review`;
            const { data } = await axios.post(
                uri,
                {
                    userId,
                    pillarId,
                    cycleId,
                    periodId,
                    questionId,
                    alternativeId,
                },
                { headers }
            );
            await AssessmentBusiness.updateUserEligibilities(userId, pillarId, cycleId, periodId);

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async getCyclesAndPeriods (req, res) {
        try {
            const { _id: userId } = await getUserByToken(req);

            const uri = `${host}/historics/${clientId}/cycles-and-periods?userId=${userId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async interests (req, res) {
        try {
            const { _id, groupsAD } = await getUserByToken(req);
            const groups = await Group.find({
                name: { $in: groupsAD },
            });
            const eligibilities = groups
                .flatMap((group) => group.tags)
                .flatMap((tag) => tag.value)
                .join(',');

            console.log({ eligibilities });

            const uri = `${host}/historics/${clientId}/interests?userId=${_id}&eligibilities=${eligibilities}`;

            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async historicCycleQuestions (req, res) {
        try {
            const { _id } = await getUserByToken(req);
            const { cycleId, periodId } = req.params;
            const uri = `${host}/historics/${clientId}/questions/${cycleId}/${periodId}/${_id}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async getHistoricBySection(req, res) {
        try {
            const sectionId = req.params.sectionId;
            
            const { _id } = await getUserByToken(req);
            
            const uri = `${host}/historics/${clientId}/${_id.toString()}/section/${sectionId}`;
            
            const { data } = await axios.get(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },
            
    async cycleBySection (req, res) {
        try {

            const { trainingSectionId } = req.query;
            const uri = `${host}/cycles/trainingSection/${trainingSectionId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listTrainingSectionsStatus(req, res) {
        const user = await getUserByToken(req);
        const tags = await getTagsElegiblesByToken(req);
        const classGroups = await getGroupCodesByToken(req, tags);

        const userTags = [...tags, ...classGroups].map(tag => tag.value ?? tag.display ?? tag);

        try {
            const data = await AssessmentBusiness.listTrainingSectionsStatus(user._id, userTags)

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listTrainingSection(req, res) {
        try {
            const data = await AssessmentBusiness.listTrainingSection(_id)

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    }
};

async function handlePillarTags (eligibilities) {
    if (!eligibilities) return;

    const tags = eligibilities.flatMap(({ tags }) => tags);
    for (const tag of tags) {
        const group = await Group.findOne({
            $or: [{ 'tags.display': tag }, { 'tags.value': tag }],
        });
        if (!group) {
            await Group.create({
                name: tag,
                tags: [{
                    display: tag,
                    value: tag
                }],
            });
        }
    }
}

module.exports = AssessmentController;
