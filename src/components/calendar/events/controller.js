const _messages = require('../../../utils/messages');
const {
    getTrailCompletion,
} = require('../../sections/business');
const { processTrailTracking } = require('../../../utils/functions.js');
const { handleError } = require('../../../utils/errors');
const { populateTrails } = require('../../trails/business');
const { EventModel, EVENT_TYPE, TARGET_ID } = require('./model');
const { User } = require('../../users/model.js');
const { CourseModel, WaitListModel, ClassModel } = require('../../courses/model.js');
const { Tracking } = require('../../tracking/model.js')
const axios = require("axios")

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

    async getCalendarEventsByDate(start, end, user, tags, token) {
        try {
            const events = []
            const courses = await getCoursesElegible(start, end, user, tags)

            const certificateEvents = [];
            if (token) {
                const _certificateEvents = await getAllExpDatesByUser(start, end, user, token);
                certificateEvents.push(..._certificateEvents);
            }

            const foundEvents = await EventModel.find({
                $and: [
                    { eventStartDate: { $gte: start } },
                    { eventEndDate: { $lte: end } },
                    { userId: user._id }
                ]
            }).lean()

            for (const course of courses) {
                if (course.classes) {
                    for (let c of course.classes) {
                        const courseEvent = {
                            title: c.name,
                            userId: user._id,
                            target: {
                                id: c._id,
                                type: TARGET_ID.COURSE
                            },
                            type: EVENT_TYPE.COURSE,
                            eventStartDate: c.dateApplicationInitial,
                            eventEndDate: c.dateApplicationFinal,
                            content: {
                                dateApplicationInitial: c.dateApplicationInitial,
                                dateApplicationFinal: c.dateApplicationFinal,
                                location: c.location,
                                status: c.status,
                                courseID: course._id
                            }
                        }
                        events.push(courseEvent)
                    }
                }
            }

            const allEvents = events.concat(foundEvents, certificateEvents)
            return allEvents
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

    async calendarEventCertificate(userId, certificate) {
        try {
            await EventModel.findOneAndUpdate({
                title: certificate.trailName,
                userId,
                target: {
                    id: certificate._id,
                    type: TARGET_ID.CERTIFICATE
                },
                type: EVENT_TYPE.CERTIFICATE
            }, {
                $set: {
                    title: certificate.trailName,
                    userId,
                    target: {
                        id: certificate._id,
                        type: TARGET_ID.CERTIFICATE
                    },
                    type: EVENT_TYPE.CERTIFICATE
                }
            }, { upsert: true })
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
                        target: {
                            id: processedTrail._id,
                            type: TARGET_ID.CONCLUSION
                        },
                        type: EVENT_TYPE.CONCLUSION
                    }, {
                        $set: {
                            title: processedTrail.title,
                            userId: foundUser._id,
                            target: {
                                id: processedTrail._id,
                                type: TARGET_ID.CONCLUSION
                            },
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

async function getCoursesElegible(start, end, user, tags) {
    return new Promise(async (resolve, reject) => {
        try {
            let elegibleCourses = await CourseModel.find({
                // dateInitial: { $gte: start },
                // dateFinal: { $lte: end },    
                tags: { $in: tags },
                deleted: { $eq: 0 },
                status: { $eq: 1 },
            })
                .select({
                    title: 1,
                    thumbPath: 1,
                    _id: 1,
                    description: 1,
                    passingScore: 1,
                    certificate: 1,
                    certificateLayout: 1,
                    workload: 1,
                    instructor: 1,
                })
                .lean();
            const coursePromises = elegibleCourses.map(async (course) => {
                const alreadyJoined = await WaitListModel.findOne({
                    userID: user._id,
                    courseID: course._id,
                    sent: false,
                });

                const today = new Date()
                const classesFromCourse = await ClassModel.find({
                    courseID: course._id
                }).populate({
                    path: 'materials',
                    match: { author: 'INSTRUTOR' },
                })
                    .populate('instructor', ['name']);;

                let inWaitList = false;
                if (alreadyJoined) {
                    inWaitList = true;
                }
                let certificateElegible = false
                let certificateData = null

                classesFromCourse.forEach((e) => {
                    if (String(e.courseID._id) === String(course._id)) {
                        const userInClass = e.users.find((u) => u._id == user._id || u.userID == user._id)
                        let grade = 0
                        let presence = false
                        if (userInClass) {
                            presence = userInClass.presence;
                            grade = userInClass.grades ? userInClass.grades : 0;
                            const passingScore = course.passingScore ? course.passingScore : 0;
                            certificateElegible = grade >= passingScore;
                        }
                        if (certificateElegible && presence)
                            certificateData = {
                                completionAt: e.dateApplicationFinal,
                                qrcode: e.qrcode,
                                certificate: course.certificate,
                                certificateLayout: course.certificateLayout,
                                studentMaterials: e.materials,
                                workload: course.workload,
                                instructor: e.instructor,
                                grade: grade,
                                status: certificateElegible,
                            };

                        course.presence = presence;
                        course.completionAt = e.dateApplicationFinal;
                        course.instructor = e.instructor;
                    }
                });
                const classes = classesFromCourse.map((classFromCourse) => {
                    const inClass = classFromCourse.users.some((u) => String(u._id) === String(user._id) || String(u.userID) === user._id)
                    
                    return {
                        _id: classFromCourse._id,
                        createdAt: classFromCourse.createdAt,
                        name: classFromCourse.name,
                        dateApplicationInitial: classFromCourse.dateApplicationInitial,
                        dateApplicationFinal: classFromCourse.dateApplicationFinal,
                        location: classFromCourse.location,
                        status: getClassStatus(classFromCourse, inClass, course.presence),
                    };
                }).filter((classCourse) => classCourse)

                course.certificateElegible = certificateData;
                course.inWaitList = inWaitList;
                course.classes = classes;
                course.hasClasses = classes.length > 0;
                return course;
            });

            elegibleCourses = await Promise.all(coursePromises);

            resolve(elegibleCourses);
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
}

function canRegisterOrCancel (initialDate, minutes) {
    if (!minutes) return true;
    const currentDate = new Date()
    currentDate.setMinutes(currentDate.getMinutes() - 180);

    const deadline = new Date(initialDate);
    deadline.setMinutes(deadline.getMinutes() - minutes);

    return deadline >= currentDate;
}

function getClassStatus (classFromCourse, inClass, presence) {
    try {
        const { dateApplicationInitial, dateApplicationFinal, registrationDeadline, cancellationDeadline } = classFromCourse;
        const today = new Date()
        const courseHasSeats = classFromCourse.users.length < classFromCourse.limit || !classFromCourse.limit ? true : false
        const isCourseInProgress = dateApplicationInitial <= today && dateApplicationFinal >= today && courseHasSeats
        const isCourseOpen = dateApplicationInitial >= today
        const isCourseClosed = dateApplicationFinal <= today

        const canRegister = canRegisterOrCancel(dateApplicationInitial, registrationDeadline)
        const canCancel = canRegisterOrCancel(dateApplicationInitial, cancellationDeadline)

        if (presence) {
            return "concluded"
        }
        if (isCourseInProgress) {
            return "in-progress"
        }
        if (inClass) {
            return "registered"
        }
        if (isCourseClosed || !courseHasSeats || !canRegister || !canCancel) {
            return "closed"
        }
        if (isCourseOpen && (canRegister || canCancel)) {
            return "open";
        }

        return null
    } catch (error) {
        console.log(error);
        reject(error);
    }

}

async function getAllExpDatesByUser(start, end, user, token) {
    try {
        const uri = `${process.env.API_CERTIFIER}/certificates/find/${user.networkLogin}?clientId=${process.env.CLIENT_ID}`;
        const { data } = await axios.get(uri, { headers: { Authorization: 'Bearer ' + token } });
        const events = []
        for (let certificate of data) {
            if (certificate.emissionDate >= start && certificate.emissionDate <= end) {
                const certificateEvent = {
                    title: certificate.trailName,
                    userId: user._id,
                    eventStartDate: certificate.emissionDate,
                    target: {
                        id: certificate.trailId,
                        type: TARGET_ID.TRAIL
                    },
                    type: EVENT_TYPE.CERTIFICATE,
                }
                events.push(certificateEvent)
            }

            if (certificate.expirationDate) {
                if (certificate.expirationDate >= start && certificate.expirationDate <= end) {
                    const revokedEvent = {
                        title: certificate.trailName,
                        userId: user._id,
                        eventStartDate: certificate.expirationDate,
                        target: {
                            id: certificate.trailId,
                            type: TARGET_ID.TRAIL
                        },
                        type: EVENT_TYPE.REVOKED,
                    }
                    events.push(revokedEvent)
                }
            }
        }
        return events
    }
    catch (error) {
        console.log(error);
    }
}

module.exports = EventsController;
