const _messages = require('../../utils/messages')
const { elegiblesContents, recentsSections } = require('../sections/business')
const { populateTrails } = require('../trails/business')

module.exports = {
    async getShowCaseTrails (req, res) {
        try {
            let trails = await populateTrails(true, {
                enabled: true,
                showcase: true,
            })

            trails = trails.map(trail => {
                trail = processTrailAndItems(trail)
                return prepareObject(trail)
            })

            let resultSections = []

            const arrSections = await elegiblesContents(trails)
            const arrRecentsSections = await recentsSections(trails)

            resultSections = arrSections.concat(arrRecentsSections)

            _messages.success(res, req, resultSections)
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'showcase', 'getShowCaseTrails')
        }
    },

    async getShowCaseTrailById (req, res) {
        try {
            const { trailId } = req.params
            const trails = await populateTrails(true, {
                _id: trailId,
            })

            const trail = processTrailAndItems(trails[0])

            const obj = prepareObject(trail)
            _messages.success(res, req, obj)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'showcase', 'getShowCaseTrailById')
        }
    },
}

function processTrailAndItems (trail) {
    let duration = 0
    for (const item of trail.items) {
        duration += item.itemID.durationHours
    }

    trail.items = trail.items.map(item => {
        return {
            _id: item._id,
            title: item.itemID.title,
            description: item.itemID.description,
            durationHours: item.itemID.durationHours,
        }
    })

    trail.duration = duration

    return trail
}

function prepareObject (trail) {
    return {
        _id: trail._id,
        title: trail.title,
        description: trail.description,
        startDate: trail.startDate,
        endDate: trail.endDate,
        tags: trail.tags,
        createdAt: trail.createdAt,
        updatedAt: trail.updatedAt,
        items: trail.items,
        duration: trail.duration,
    }
}
