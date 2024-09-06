const { DynamicSection } = require('./model')
const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')
const { DEFAULT_TYPES, Showcase } = require('../configuration/model')

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

            const total = await DynamicSection.find(query).countDocuments()

            const sections = await DynamicSection.find(query)
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

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
                'DynamicSection',
                'get',
            )
        }
    },

    async update (req, res) {
        try {
            const body = req.body
            const sectionId = body._id
            delete body.sectionId

            const findSection = await DynamicSection.find({ _id: sectionId })

            if (findSection.length) {
                await DynamicSection.findOneAndUpdate({ _id: sectionId }, body)
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'dynamicSection_showcase',
                    'update',
                )
            }

            _messages.success(res, req, 'Page salva!')

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'dynamicSection_showcase',
                '/update',
            )
        }
    },

    async create (req, res) {
        try {
            const body = req.body

            const lastPosition = await Showcase.find().countDocuments()
            body.position = lastPosition
            body.type = DEFAULT_TYPES.dynamicSection
            const dynamicSection = await DynamicSection.create(body)

            _messages.success(res, req, dynamicSection, 'Seleção salva!')

        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'dynamicSection_showcase',
                '/create',
            )
        }
    },

    async delete (req, res) {
        try {
            const { id } = req.params
            const findSection = await DynamicSection.find({ _id: id })

            if (findSection.length) {
                await DynamicSection.deleteOne({ _id: id })
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'dynamicSection_showcase',
                    'update',
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
                'dynamicSection_showcase',
                '/create',
            )
        }
    }

}
