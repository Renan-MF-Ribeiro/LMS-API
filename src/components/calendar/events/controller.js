const _messages = require('../../../utils/messages');
const {
    getTrailCompletion,
} = require('../../sections/business');
const { processTrailTracking } = require('../../../utils/functions.js');
const { handleError } = require('../../../utils/errors');
const { populateTrails } = require('../../trails/business');
const { EventModel, EVENT_TYPE } = require('./model');
const { User } = require('../../users/model.js');
const { CourseModel } = require('../../courses/model.js');
const { Tracking } = require('../../tracking/model.js')

const EventsController = {
    async createCalendarEvent(req, res) {
        try {
            const event = await EventModel.create(req.body)
            return _messages.success(res, req, event);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async updateCalendarEvent(req, res) {
        try {
            const event = await EventModel.findByIdAndUpdate(req.body._id, req.body)
            return _messages.success(res, req, event);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async removeCalendarEvent(req, res) {
        try {
            const event = await EventModel.findByIdAndDelete(req.body._id)
            return _messages.success(res, req, event);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async getCalendarEventsByDate(start, end, userId) {
        try {
            const events = await EventModel.find({
                $and: [
                    { createdAt: { $gte: start } },
                    { createdAt: { $lte: end } },
                    { userId }
                ]
            }).select('title type createdAt trailId classId').lean()
            return events
        } catch (error) {
            console.log(error)
        }
    },

    async calendarEventClass(courseId, classId, userId) {
        try {
            const course = await CourseModel.findById(courseId)
            await EventModel.create({
                title: course.title,
                userId,
                classId,
                type: EVENT_TYPE.COURSE
            })
            return _messages.success();
        } catch (error) {
            console.log(error)
        }
    },

    async calendarEventRevoked(userId, trail) {
        try {
            await EventModel.create({
                title: trail.title,
                userId,
                trailId: trail._id,
                type: EVENT_TYPE.REVOKED
            })
            return _messages.success();
        } catch (error) {
            console.log(error)
        }
    },

    async calendarEventConclusion(networkLogin, props) {
        try {
            const { item } = props;

            const trails = await populateTrails(true, {
                'items.itemID': { $in: [item] },
            });

            const foundUser = await User.findOne({
                networkLogin: networkLogin,
            });

            const allTrackingUser = await Tracking.find({
                userLogin: networkLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            for (const trail of trails) {
                const processedTrail = processTrailTracking(trail, allTrackingUser).trail;

                if (
                    !!processedTrail &&
                    processedTrail.completion === 1
                ) {
                    await EventModel.findOneAndUpdate({
                        userId: foundUser._id,
                        trailId: processedTrail._id,
                        type: EVENT_TYPE.CONCLUSION
                    }, {
                        $set: {
                            title: processedTrail.title,
                            userId: foundUser._id,
                            trailId: processedTrail._id,
                            type: EVENT_TYPE.CONCLUSION
                        }
                    }, { upsert: true })
                }
            }
            return
        } catch (error) {
            console.log(error)
        }
    },
};

module.exports = EventsController;
