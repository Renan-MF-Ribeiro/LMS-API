const { getCoursesByIds } = require('../courses/business');
const { getTrailByIds } = require('../trails/business');

async function populateCoursesAndTrails(data) {
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
}

module.exports = {
    populateCoursesAndTrails,
}