const _messages = require('../../utils/messages');
const {
    elegiblesContents,
    recentsSections,
    checkIfTheTrackIsValid,
} = require('../sections/business');
const { populateTrails } = require('../trails/business');

module.exports = {
    async getShowCaseTrails(req, res) {
        try {
            let trails = await populateTrails(true, {
                enabled: true,
                showcase: true,
            });

            trails = trails.map((trail) => {
                trail = processTrailAndItems(trail);
                return prepareObject(trail);
            });

            let resultSections = [];

            const arrSections = await elegiblesContents(trails);
            const arrRecentsSections = await recentsSections(trails);

            resultSections = arrSections.concat(arrRecentsSections);

            if (resultSections.length > 0) {
                resultSections.sort((a, b) =>
                    a.position < b.position ? -1 : 1
                );
            }

            _messages.success(res, req, resultSections);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'showcase',
                'getShowCaseTrails'
            );
        }
    },

    async getShowCaseTrailById(req, res) {
        try {
            const { findValue } = req.params;

            const query = findValue.match(/^[0-9a-fA-F]{24}$/)
                ? {
                      $or: [{ _id: findValue }, { titleURL: findValue }],
                  }
                : { titleURL: findValue };

            const trails = await populateTrails(true, query);

            const trail = processTrailAndItems(trails[0]);

            const obj = prepareObject(trail);
            _messages.success(res, req, obj);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'showcase',
                'getShowCaseTrailById'
            );
        }
    },

    async getOnlyShowCaseTrails(req, res) {
        try {
            let trails = await populateTrails(
                true,
                { showcase: true },
                { createdAt: -1 }
            );

            trails = trails.map((trail) => {
                trail = processTrailAndItems(trail);
                return prepareObject(trail);
            });

            if (trails.length > 0) {
                trails.sort((a, b) =>
                    new Date(a.startDate).getTime() <
                    new Date(b.startDate).getTime()
                        ? -1
                        : 1
                );
            }

            _messages.success(res, req, trails);
        } catch (error) {}
    },

    async searchTrails(req, res) {
        try {
            const searchBy = req.query.searchBy;
            let filterTrails = [];

            filterTrails = await populateTrails(true, {
                $text: { $search: `"${searchBy}"` },
                showcase: true,
                enabled: true,
            });
            filterTrails = filterTrails.filter((trail) =>
                checkIfTheTrackIsValid(trail)
            );

            filterTrails = filterTrails.map((trail) => {
                trail = processTrailAndItems(trail);
                return prepareObject(trail);
            });

            _messages.success(res, req, filterTrails);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'home',
                'searchTrailsItems'
            );
        }
    },
};

function processTrailAndItems(trail) {
    let duration = 0;
    for (const item of trail.items) {
        duration += item.itemID.durationHours;
    }

    trail.items = trail.items.map((item) => {
        return {
            _id: item._id,
            title: item.itemID.title,
            description: item.itemID.description,
            durationHours: item.itemID.durationHours,
        };
    });

    trail.duration = duration;

    return trail;
}

function prepareObject(trail) {
    return {
        _id: trail._id,
        title: trail.title,
        titleURL: trail.titleURL,
        description: trail.description,
        startDate: trail.startDate,
        endDate: trail.endDate,
        tags: trail.tags,
        createdAt: trail.createdAt,
        updatedAt: trail.updatedAt,
        items: trail.items,
        duration: trail.duration,
        thumbPath: trail.thumbPath,
        externalPlayer: trail.externalPlayer,
        innerTextStatus: trail.innerTextStatus,
        innerText: trail.innerText,
    };
}
