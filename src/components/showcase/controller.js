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
                let duration = 0
                for (const item of trail.items) {
                    duration += item.itemID.durationHours
                }

                trail.items = trail.items.map(item => {
                    return {
                        durationHours: item.itemID.durationHours,
                    }
                })

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
                    duration,
                }
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
}
