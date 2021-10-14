const _messages = require('../../utils/messages')
const { Item } = require('../items/model')
const { Tracking } = require('../tracking/model')
const { checkIfTheTrackIsValid } = require('../sections/business')
const { User } = require('../users/model')
const {
    getUserByToken,
    getTagsGroupsByToken,
    processTrailTracking,
} = require('../../utils/functions')
const {
    trailsCompletedOrInProgress,
    studentAverageCourses,
    schoolAverageCourses,
    schoolYearAverageCourses,
    calculateAverageStudent,
    calculateAverageSchool,
    calculateAverageSchoolYear,
    getNumberOfItemsCompletedOrInProgressOrNotStarted,
    getStudentCourses,
    returnCertificates,
} = require('./business')

const { populateTrails } = require('../trails/business')

// const { updateAverageCourses } = require('../../utils/cron')

const ItemController = {
    async searchTrailsItems (req, res) {
        try {
            const user = await getUserByToken(req)
            const tags = await getTagsGroupsByToken(req)
            const searchBy = req.query.searchBy
            let filterTrails = []
            const result = []

            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
            })

            for (const tag of user.tags) {
                delete tag.createdAt
                tags.push(tag)
            }

            filterTrails = await populateTrails(true, {
                $text: { $search: `"${searchBy}"` },
                $or: [
                    { tags: { $in: tags } },
                    { mandatory: { $in: tags } },
                ],
                enabled: true,
            })
            filterTrails = filterTrails.filter(trail => checkIfTheTrackIsValid(trail))

            const items = await Item.find({
                $text: { $search: `"${searchBy}"` },
                enabled: true,
                deleted: { $eq: 0 },
            })

            for (const item of items) {
                const itemTrail = await populateTrails(true, {
                    'items.itemID': { $in: item._id },
                    $or: [
                        { tags: { $in: tags } },
                        { mandatory: { $in: tags } },
                    ],
                    enabled: true,
                })

                if (itemTrail) {
                    for (const t of itemTrail) {
                        const isValidTrail = checkIfTheTrackIsValid(t)
                        if (isValidTrail) {
                            const index = filterTrails.findIndex(val => val.id === itemTrail.id)
                            if (index === -1) {
                                filterTrails.push(t)
                            }
                        }
                    }
                }
            }

            for (let trail of filterTrails) {
                const isValid = checkIfTheTrackIsValid(trail)
                if (isValid) {
                    const processedTrail = processTrailTracking(trail, allTrackingUser)
                    trail = processedTrail.trail
                    result.push(trail)
                }
            }

            _messages.success(res, req, result)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'home', 'searchTrailsItems')
        }
    },

    async dashboardStudent (req, res) {
        try {
            const user = await getUserByToken(req)
            const courses = await getStudentCourses(req)

            const resultTrails = await trailsCompletedOrInProgress(req)
            const certificates = await returnCertificates(resultTrails.trailsCompleted, user)
            const { numberOfItemsCompleted, numberOfItemsInProgress, numberOfItemsNotStarted, numberOfItemsMandatoryNotStarted, numberOfItemsMandatoryCompleted, numberOfItemsMandatoryInProgress } = await getNumberOfItemsCompletedOrInProgressOrNotStarted(req)
            const { averageStudentCourses, numberTrailsCompleted, numberTrailsElegibles } = await studentAverageCourses(user, req) // Não necessita de mudanças

            const averageSchoolCourses = await schoolAverageCourses(user)
            const averageSchoolYearCourses = await schoolYearAverageCourses(user)

            const averageStudent = await calculateAverageStudent(user) // Não necessita de mudanças
            const averageSchool = await calculateAverageSchool(user)
            const averageSchoolYear = await calculateAverageSchoolYear(user)

            await User.findByIdAndUpdate(user._id, { averageRating: averageStudent.toFixed(2), numberTrailsCompleted, numberTrailsElegibles })

            _messages.success(res, req, {
                resultTrails,
                numberOfItemsCompleted,
                numberOfItemsInProgress,
                numberOfItemsNotStarted,
                numberOfItemsMandatoryNotStarted,
                numberOfItemsMandatoryCompleted,
                numberOfItemsMandatoryInProgress,
                averageStudentCourses,
                averageSchoolCourses,
                averageSchoolYearCourses,
                averageStudent,
                averageSchool,
                averageSchoolYear,
                courses,
                certificates,
            })
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'home', 'dashboardStudent')
        }
    },

    async searchStudentCourses (req, res) {
        try {
            await getStudentCourses(req)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'home', '/searchStudentCourses')
        }
    },
}

module.exports = ItemController
