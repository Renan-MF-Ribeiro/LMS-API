const _messages = require('../../../utils/messages');
const {
	getTrailCompletion,
} = require('../../sections/business');
const { processTrailTracking } = require('../../../utils/functions.js');
const { handleError } = require('../../../utils/errors');
const { populateTrails } = require('../../trails/business');
const { EventModel, EVENT_TYPE } = require('./model');
const { User } = require('../../users/model.js');

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

	async calendarEventConclusion(user, props) {
		try {
			const { item, completion = null, lessonStatus = null } = props;
			const trails = await populateTrails(true, {
				'items.itemID': { $in: [item] },
			});

			const foundUser = await User.findOne({
				networkLogin: user.networkLogin,
			});

			const allTrackingUser = await Tracking.find({
				userLogin: user.networkLogin,
				$or: [
					{ expiredCompletion: { $exists: false } },
					{ expiredCompletion: { $eq: null } },
				],
			});

			for (const trail of trails) {
				const processedTrail = processTrailTracking(trail, allTrackingUser);
				const isAboutToComplete = {
					...processedTrail.trail,
					items: processedTrail.trail.items.map((i) => {
						return i.itemID._id.equals(item)
							? {
								...i,
								completion: !lessonStatus
									? completion
									: lessonStatus === 'passed'
										? 1
										: 0,
							}
							: i;
					}),
				};

				const foundItem = processedTrail.trail.items.find((i) => {
					return i.itemID._id.equals(item);
				});

				if (
					!!foundItem &&
					foundItem.completion !== 1 &&
					getTrailCompletion(isAboutToComplete) === 1
				) {
					await EventModel.create({
						title: trail.title,
						userId: foundUser._id,
						trailid: trail._id,
						type: EVENT_TYPE.CONCLUSION
					})
				}
			}
			return _messages.success(res, req);
		} catch (error) {
			return handleError(res, req, error)
		}
	},
};

module.exports = EventsController;
