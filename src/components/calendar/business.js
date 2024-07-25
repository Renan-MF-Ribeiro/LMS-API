const { processTrailTracking } = require('../../utils/functions.js');
const { Tracking } = require('../tracking/model.js')
const { Trail } = require('../trails/model');
const { ClassModel } = require('../courses/model');

module.exports = {
  async returnContentConclusion(trailId, networkLogin) {
    const trail = await Trail.findById(trailId).lean()

    const itemsIds = trail.items.map((i) => i.itemID._id);
    const allTrackingUser = await Tracking.find({
      userLogin: { $eq: networkLogin },
      item: { $in: itemsIds },
      $or: [
        { expiredCompletion: { $exists: false } },
        { expiredCompletion: { $eq: null } },
      ],
    });

    const processedTrail = processTrailTracking(trail, allTrackingUser);
    return {
      duration: processedTrail.trail.duration ? processedTrail.trail.duration : 0,
      completionDate: processedTrail.trail.completionAt,
      workload: processedTrail.trail.scoreAverage ? processedTrail.trail.scoreAverage : 0,
      layoutId: processedTrail.trail.certificateLayout,
      trailId: trail._id,
      title: processedTrail.trail.title,
    }
  },
};
