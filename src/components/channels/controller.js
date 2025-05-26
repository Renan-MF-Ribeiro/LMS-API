const _messages = require('../../utils/messages');
const _functions = require('../../utils/functions');
const { Channel } = require('./model');
const { azureBlob } = require('../../utils/files');
const { DOMAIN, AZURE_BLOB_URL } = process.env;
const { Section } = require('../sections/model');
const { Trail } = require('../trails/model');
const { getTagsElegiblesByToken, checkEligibilityTagsAnd, getSectionTrailId } = require('../sections/business');
const { Theme } = require('../theme/palette/model');
const { handleSegmentationOnCreate, handleSegmentationOnQuery } = require('../config/business');
const { getDbCurrentFeatures } = require('../../utils/features');
const mentorConfigController = require('../mentoring/config/controller');


module.exports = {
    async getChannels (req, res) {
        try {
            const { sort, order } = _functions.ordernation(req);
            const { skip, limit } = _functions.pagination(req);
            const searchBy = req.query.searchBy;

            let OptionalChannel = [{}];

            const features = await getDbCurrentFeatures(req);

            if (!features?.alura) {
                OptionalChannel.push({ type: { $ne: 'alura' } })
            }

            if (!features?.collaborationComponent) {
                OptionalChannel.push({ type: { $ne: 'collaboration' } })
            }

            const query = { $and: [
                ...OptionalChannel
            ] }

            if (searchBy) {
                query.$and.push({
                    title: { $regex: searchBy, $options: 'i' }
                })
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const total = await Channel.find(query).countDocuments();

            const channels = await Channel.find(query).sort({ [order]: sort })

            _messages.success(res, req, {
                data: channels,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                'get'
            );
        }
    },
    async getChannelsElegibles (req, res) {
        const tags = await getTagsElegiblesByToken(req);
        const user = await _functions.getUserByToken(req);

        try {
            const features = await getDbCurrentFeatures(req);
            const query = { $and: [
                { tags: { $in: tags.map((tag) => tag.value) } },
                { enabled: true }
            ]}

            if(features?.mentoring){
                const mentoringBlocked = await mentorConfigController.isBlocked(user._id);
                if (mentoringBlocked) {
                    query.$and.push({ type: { $ne: 'mentoring' } });
                } 
            }

            // if (req?.segmentation) {
            //     handleSegmentationOnQuery(req, 'owner', query)
            // }

            let channels = await Channel
                .find(query)
                .sort({ position: 'asc' })
                .populate({ path: 'theme', match: { deleted: 0 }, })


            const existingMentoringChannel = await Channel.findOne({ type: 'mentoring' });

            if (!existingMentoringChannel) {
                await Channel.create({
                    enabled: true,
                    tags: ['ELEGE_geral'],
                    banners: [],
                    idSections: [],
                    title: 'Mentorias',
                    position: 4,
                    type: 'mentoring'
                });
            }

            channels = await Promise.all(channels.map(async (channel) => {
                if (channel.type === 'alura') return channel
                if (channel.type === 'feed') return channel

                if(features?.mentoring && channel.type === 'mentoring') return channel

                if (features?.collaborationComponent && channel.type === 'collaboration') return channel

                const sectionQuery = { $and: [
                    { _id: { $in: channel.idSections } }
                ] }

                // if (req?.segmentation) {
                //     handleSegmentationOnQuery(req, 'owner', sectionQuery)
                // }

                const sections = await Section.find(sectionQuery).select('trails');
                const trailsIds = sections.flatMap(
                    (section) => section.trails
                        ?.map(trail => getSectionTrailId(trail))
                        .filter(Boolean)
                );

                const trailQuery = { $and: [
                    { _id: { $in: trailsIds } }
                ] }

                // if (req?.segmentation) {
                //     handleSegmentationOnQuery(req, 'owner', trailQuery)
                // }

                const trails = await Trail.find(trailQuery);

                const hasEligibleTrails = trails.some((trail) =>
                    checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && !trail.collaborative
                );

                return hasEligibleTrails ? channel : null;
            }));

            channels = channels.filter((channel) => channel)

            _messages.success(res, req, channels);
        } catch (error) {
            console.log(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                'get'
            );
        }
    },

    async create (req, res) {
        try {
            let body = JSON.parse(req.fields.payload);

            let fileArray = Object.keys(req.files).map((key) => req.files[key]);

            for (let i in body.banners) {
                let path = await azureBlob(fileArray[i], 'channels/banners');
                body.banners[i].path = path;
            }

            const findChannel = await Channel.find({ title: body.title });

            if (findChannel.length) {
                return _messages.forbidden(
                    res,
                    req,
                    'Registro duplicado',
                    'Este canal já está cadastrado.',
                    'channels',
                    'create'
                );
            }

            if (req?.segmentation) {
                await handleSegmentationOnCreate(req, body)
            }

            const channel = await Channel.create(body);
            _messages.success(
                res,
                req,
                channel,
                'Criação de dados',
                'channels',
                'create',
                channel,
                [],
                true,
                'CREATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                '/create'
            );
        }
    },

    async update (req, res) {
        try {
            let body = JSON.parse(req.fields.payload);
            const channelId = body.channelId;
            delete body.channelId;

            if (Object.keys(req.files).length !== 0) {
                let fileArray = Object.keys(req.files).map(
                    (key) => req.files[key]
                );

                let indexBannersWithNoPath = body.banners.reduce(function (
                    r,
                    v,
                    i
                ) {
                    return r.concat(typeof v.path != 'string' ? i : []);
                },
                    []);

                for (let index in indexBannersWithNoPath) {
                    let path = await azureBlob(
                        fileArray[index],
                        'channels/banners'
                    );
                    body.banners[indexBannersWithNoPath[index]].path = path;
                }
            }

            const findChannel = await Channel.find({ _id: channelId });

            if (findChannel.length) {
                const channel = await Channel.findOneAndUpdate({ _id: channelId }, body, { new: true });
                _messages.success(
                    res,
                    req,
                    channel,
                    'Atualização de dados',
                    'channels',
                    'update',
                    channel,
                    findChannel[0],
                    true,
                    'UPDATE'
                );
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Canal não encontrado',
                    'Este canal não foi encontrado.',
                    'channels',
                    'update'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                '/create'
            );
        }
    },

    async delete (req, res) {
        try {
            const findChannel = await Channel.find({ _id: req.params.id });
            if (findChannel.length) {
                const channel = await Channel.findOneAndDelete({ _id: req.params.id });
                _messages.success(
                    res,
                    req,
                    channel,
                    'Canal deletado com sucesso',
                    'channels',
                    'delete',
                    [],
                    findChannel[0],
                    true,
                    'DELETE'
                );
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Canal não encontrado',
                    'Este canal não foi encontrado.',
                    'channels',
                    'delete'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                '/create'
            );
        }
    },

    async updatePosition (req, res) {
        try {
            const channels = req.body;

            for (const channel of channels) {
                const { id, position } = channel;
                await Channel.findByIdAndUpdate(id, { position });
            }

            _messages.success(res, req, 'Atualizado com sucesso!');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                '/updatePosition'
            );
        }
    },
};
