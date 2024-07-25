const { processTrailTracking } = require('../../utils/functions.js');
const { Tracking } = require('../tracking/model.js')
const { Trail } = require('../trails/model');
const { ClassModel } = require('../courses/model');

module.exports = {
  async returnContentConclusion(trailId, networkLogin) {
    const trail = await Trail.findById(trailId).lean()
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
      console.log(processedTrail)
      return {
        duration: processedTrail.duration ? processedTrail.duration : 0,
        completionDate: processedTrail.completionAt,
        workload: processedTrail.scoreAverage ? processedTrail.scoreAverage : 0,
        layoutId: processedTrail.certificateLayout,
        trailId: trail._id,
        title: processedTrail.title,
      }
    }
  },
};
