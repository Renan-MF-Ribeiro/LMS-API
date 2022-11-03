const _messages = require('../../utils/messages')
const { Item } = require('../items/model')
const { Tracking } = require('../tracking/model')
const { Trail } = require('../trails/model')
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
    averageGroupCourses,
    averageGroupRatings,
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
                $or: [
                    { title: new RegExp(`.${searchBy}.`, 'i')},
                    { description: new RegExp(`.${searchBy}.`, 'i')},
                    { tags: { $in: tags } },
                    { mandatory: { $in: tags } },
                ],
                enabled: true,
            })
            filterTrails = filterTrails.filter(trail => checkIfTheTrackIsValid(trail))

            const items = await Item.find({
                description: new RegExp(`.${searchBy}.`, 'i'),
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

            const allTrails = await Trail.countDocuments()

            const resultTrails = await trailsCompletedOrInProgress(req)
            const certificates = await returnCertificates(resultTrails.trailsCompleted, user)
            const { numberOfItemsCompleted, numberOfItemsInProgress, numberOfItemsNotStarted, numberOfItemsMandatoryNotStarted, numberOfItemsMandatoryCompleted, numberOfItemsMandatoryInProgress } = await getNumberOfItemsCompletedOrInProgressOrNotStarted(req)
            const { averageStudentCourses, numberTrailsCompleted, numberTrailsElegibles } = await studentAverageCourses(user, req) // Não necessita de mudanças

            const groupA = process.env.groupA
            const groupB = process.env.groupB

            const averageGroupACourses = await averageGroupCourses(user, groupA)
            const averageGroupBCourses = await averageGroupCourses(user, groupB)

            const averageStudent = await calculateAverageStudent(user) // Não necessita de mudanças

            const averageGroupARatings = await averageGroupRatings(user, groupA)
            const averageGroupBRatings = await averageGroupRatings(user, groupB)

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
                averageGroupACourses,
                averageGroupBCourses,
                averageStudent,
                averageGroupARatings,
                averageGroupBRatings,
                courses,
                certificates,
                allTrails,
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
