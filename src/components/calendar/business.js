const { processTrailTracking } = require('../../utils/functions.js');
const { Tracking } = require('../tracking/model.js')
const { Trail } = require('../trails/model');
const { ClassModel } = require('../courses/model');
const { EVENT_TYPE } = require('./events/model.js')

module.exports = {
  async returnContentConclusion(trailId, networkLogin, event) {
    const trail = await Trail.findById(trailId).populate({
      path: 'items.itemID',
      select: { '_id': 1, 'title': 1, 'contentPath': 1, 'durationHours': 1, 'thumbPath': 1, 'titleURL': 1, 'bannerPath': 1, 'startDate': 1, 'endDate': 1, 'highlighted': 1, 'description': 1, "format": 1, 'passingScore': 1 },
      populate: {
          path: 'idEvaluation',
          select: 'description',
      },
  }).lean()
    if(trail){
      const itemsIds = trail.items.map((i) => i.itemID._id);
      const allTrackingUser = await Tracking.find({
        userLogin: { $eq: networkLogin },
        item: { $in: itemsIds },
        $or: [
          { expiredCompletion: { $exists: false } },
          { expiredCompletion: { $eq: null } },
        ],
      });
  
      const processedTrail = processTrailTracking(trail, allTrackingUser).trail;
      return {
        duration: processedTrail.duration ? processedTrail.duration : 0,
        completionDate: event.type === EVENT_TYPE.REVOKED ? event.eventStartDate : processedTrail.completionAt,
        workload: processedTrail.scoreAverage ? processedTrail.scoreAverage : 0,
        layoutId: processedTrail.certificateLayout,
        trailId: trail._id,
        title: processedTrail.title,
      }
    }
  },
};
