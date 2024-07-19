const { processTrailTracking } = require('../../utils/functions.js');
const { Tracking } = require('../tracking/model.js')
const { Trail } = require('../trails/model');
const { ClassModel } = require('../courses/model');

module.exports = {
  async returnContentConcludedOrRevoked(trailId, networkLogin) {
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

  async returnContentCourses(classId, userId) {
    const classFromCourse = await ClassModel.findById(classId)
    const inClass = classFromCourse.users.some((user) => user._id == userId || user.userID == userId)
    return {
      name: classFromCourse.name,
      dateApplicationInitial: classFromCourse.dateApplicationInitial,
      dateApplicationFinal: classFromCourse.dateApplicationFinal,
      location: classFromCourse.location,
      status: getClassStatus(classFromCourse, inClass),
    }
  },

};


function getClassStatus (classFromCourse, inClass) {
  try {
      const today = new Date()
      const courseHasSeats = classFromCourse.users.length < classFromCourse.limit ? true : false
      const isCourseInProgress = classFromCourse.dateApplicationInitial <= today && classFromCourse.dateApplicationFinal >= today && courseHasSeats
      const isCourseOpen = classFromCourse.dateApplicationInitial >= today
      const isCourseClosed = classFromCourse.dateApplicationFinal <= today

      if (isCourseInProgress) {
          return "in-progress"
      }
      if (inClass) {
          return "registered"
      }
      if (isCourseClosed || !courseHasSeats) {
          return "closed"
      }
      if (isCourseOpen) {
          return "open"
      }

      return null
  } catch (error) {
      console.log(error);
      reject(error);
  }
}