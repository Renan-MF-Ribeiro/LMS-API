const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')
const { Showcase } = require('./model')
const { Tracking } = require('../../tracking/model')
const { Trail } = require('../../trails/model')
const { TrailViews } = require('../../trails/trail-views.model')
const moment = require('moment')

module.exports = {
    async getList (req, res) {
        try {
            const { sort, order } = _functions.ordernation(req)
            const { skip, limit } = _functions.pagination(req)
            const searchBy = req.query.searchBy
            const query = searchBy
                ? {
                    $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                }
                : {}

            const total = await Showcase.find(query).countDocuments()

            const sections = await Showcase.find(query)
                .sort({ position: 1 })
                .sort({
                    [order]: sort,
                })

            _messages.success(res, req, {
                data: sections,
                total,
            })
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Showcase',
                'get',
            )
        }
    },

    async getBlocks (req, res) {
        try {
            const blocks = await Showcase.find({ enabled: true })
                .sort({ position: 1 }).select('_id, type')

            _messages.success(res, req, blocks)
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Showcase',
                'getBlocks',
            )
        }
    },

    async getById (req, res) {
        try {
            const { id } = req.params
            const block = await Showcase.findById({ _id: id, enabled: true })
            if (block.type == 'mostSeen') {
                const lastNinetyDays = moment().subtract(90, 'days').toISOString()
                const showcaseTrails = await Trail.find({ showcase: true })
                const trails = await TrailViews.aggregate(
                    [
                        {
                            $match: {
                                trailId: {
                                    $in: showcaseTrails.map(({ _id }) => _id)
                                }
                            }
                        },
                        {
                            $project: {
                                trailId: 1,
                                count: {
                                    $sum: {
                                        $reduce: {
                                            input: '$views',
                                            initialValue: 0,
                                            in: {
                                                $cond: {
                                                    if: { $gte: ['$$this.date', lastNinetyDays] },
                                                    then: { $add: ['$$value', '$$this.count'] },
                                                    else: { $add: ['$$value', 0] }
                                                }

                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $sort: {
                                count: -1
                            }
                        },
                        {
                            $limit: 6
                        },
                        {
                            $lookup: {
                                from: 'trails',
                                as: 'trail',
                                foreignField: '_id',
                                localField: 'trailId'
                            }
                        },
                        {
                            $unwind: '$trail'
                        },
                        {
                            $project: {
                                'trail._id': 1,
                                'trail.title': 1,
                                'trail.thumbPath': 1,
                                'trail.titleURL': 1,
                                count: 1,
                                _id: 0
                            }
                        }
                    ]
                )

                block.trails = trails.map(({ trail, count }) => ({
                    _id: trail._id,
                    title: trail.title,
                    thumbPath: trail.thumbPath,
                    titleURL: trail.titleURL,
                    count
                }))
            }
            if (block.type == 'selection') {
                block.trails = await Trail.find({ _id: { $in: block.trails } }).sort({ _id: -1 })
            }

            _messages.success(res, req, block)
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Showcase',
                'getBlocks',
            )
        }
    },

    async orderChange (req, res) {
        try {
            const Showcases = req.body

            for (const sectionShowcase of Showcases) {
                const { id, position } = sectionShowcase
                await Showcase.findByIdAndUpdate(id, { position })
            }

            _messages.success(res, req, 'Atualizado com sucesso!')
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Showcases',
                '/updatePosition',
            )
        }
    },

    async update (req, res) {
        try {
            const body = req.body
            const sectionId = body._id
            delete body.sectionId

            const findSection = await Showcase.find({ _id: sectionId })

            if (findSection.length) {
                await Showcase.findOneAndUpdate({ _id: sectionId }, body)
                _messages.success(res, req, 'Seção Atualizada!')
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'sections_showcase',
                    'update',
                )
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'sections_showcase',
                '/update',
            )
        }
    },

    async changeStatus (req, res) {
        try {
            const body = req.body
            const sectionId = body._id

            console.log(body)
            const findSection = await Showcase.find({ _id: sectionId })
            if (findSection.length) {
                await Showcase.findOneAndUpdate({ _id: sectionId }, { enabled: body.enabled })
                _messages.success(res, req, 'Seção Atualizada!')
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'sections_showcase',
                    'update',
                )
            }
        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'sections_showcase',
                '/update',
            )
        }
    },

    async delete (req, res) {
        try {
            const { id } = req.params
            const findSection = await Showcase.find({ _id: id })

            if (findSection.length) {
                await Showcase.deleteOne({ _id: id })
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'Showcase',
                    'delete',
                )
            }
            _messages.success(res, req, 'Seção removida!')
        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Showcase',
                'delete',
            )
        }
    }
}
