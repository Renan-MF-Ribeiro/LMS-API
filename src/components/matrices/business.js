const { getCoursesByIds } = require('../courses/business');
const { getTrailByIds } = require('../trails/business');

const business = {
    populateCoursesAndTrails: async (data) => {
        const ids = data.skill_recommendations?.flatMap(skill => [
            ...(skill.trailIds || []),
            ...(skill.courseIds || [])
        ]) || [];

        const trails = await getTrailByIds(ids);
        const courses = await getCoursesByIds(ids);

        const response = {
            ...data,
            skill_recommendations: data.skill_recommendations?.map(skill => {
                return {
                    ...skill,
                    trails,
                    courses,
                    trailIds: undefined,
                    courseIds: undefined,
                }
            })


        }
        return response;
    },

    buildCoursesResponse: (courses) => {

        const urlRegex = /^(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|net|org|io|gov|edu)(?:\/\S*)?$/i;
        const response = courses.map((course) => {
            return {
                _id: course.courseID?.id,
                title: course.courseID?.title,
                description: course.courseID?.description,
                concludedAt: course.users?.[0]?.presenceAt,
                location: course.location,
                type: urlRegex.test(course.location) ? 'Online' : 'Presencial'
            }
        })

        return response
    }
}

module.exports = business