const { Types } = require('mongoose');
const { getCoursesByIds } = require('../courses/business');
const { getTrailByIds } = require('../trails/business');
const { User } = require('../users/model');
const { string } = require('zod');

const business = {
    populateCoursesAndTrails: async (data) => {
        const ids =
            data.skill_recommendations?.flatMap((skill) => [
                ...(skill.trailIds || []),
                ...(skill.courseIds || []),
            ]) || [];

        const trails = await getTrailByIds(ids);
        const courses = await getCoursesByIds(ids);

        const trailMap = new Map(trails.map((t) => [t._id.toString(), t]));
        const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

        const response = {
            ...data,
            skill_recommendations: data.skill_recommendations?.map((skill) => ({
                ...skill,
                trails: (skill.trailIds || [])
                    .map((id) => trailMap.get(id.toString()))
                    .filter(Boolean),
                courses: (skill.courseIds || [])
                    .map((id) => courseMap.get(id.toString()))
                    .filter(Boolean),
                trailIds: undefined,
                courseIds: undefined,
            })),
        };

        return response;
    },

    buildCoursesResponse: async (courses) => {
        const response = courses.map((course) => {
            return {
                _id: course.courseID?.id,
                title: course.courseID?.title,
                description: course.courseID?.description,
                concludedAt: course.users?.[0]?.presenceAt,
                location: course.location,
                type: 'Presencial',
            };
        });

        return response;
    },

    sortCoursesByConcludedAt: async (courses) => {
        return courses.sort((a, b) => {
            const dateA = new Date(a.concludedAt).getTime();
            const dateB = new Date(b.concludedAt).getTime();
            return dateB - dateA; // Ordena do mais recente para o mais antigo
        });
    },

    populateUserFields: async (mappings, data) => {
        const isArray = Array.isArray(data.data);
        const dataToProcess = isArray ? data.data : [data.data];

        // Coletar todos os IDs das referências em todos os níveis
        const ids = collectIds(dataToProcess, mappings);
        if (ids.length === 0) return data;
        // Buscar usuários de uma só vez
        const users = await User.find(
            { _id: { $in: ids } },
            '_id name profilePhoto email office'
        ).lean();

        const usersWithStringIds = users.map((user) => ({
            ...user,
            _id: user._id.toString(), // Convert MongoDB ObjectID to string
        }));

        const userMap = new Map(usersWithStringIds.map((user) => [user._id, user]));

        // Processar os dados substituindo as referências
        const processedData = await processData(dataToProcess, mappings, userMap);

        return {
            ...data,
            data: isArray ? processedData : processedData[0],
        };
    },

    buildEvaluationsResultSuggestions: async (data) => {
        const populated = async () => {
            if(data.skill_recommendations?.length === 0) return data;
            const ids =
                data.skill_recommendations?.flatMap((skill) => [
                    ...(skill.trailIds || []),
                    ...(skill.coursesIds || []),
                ]) || [];
            const [trails, courses] = await Promise.all([getTrailByIds(ids), getCoursesByIds(ids)]);

            const trailMap = new Map(
                trails.map((t) => [t._id.toString(), { ...t, status: 'concluded' }])
            );
            const courseMap = new Map(
                courses.map((c) => [c._id.toString(), { ...c, status: 'concluded' }])
            );

            return {
                ...data,
                skill_recommendations: data.skill_recommendations?.map((skill) => ({
                    ...skill,
                    trails: (skill.trailIds || [])
                        .map((id) => trailMap.get(id.toString()))
                        .filter(Boolean),
                    courses: (skill.courseIds || [])
                        .map((id) => courseMap.get(id.toString()))
                        .filter(Boolean),
                })),
            };
        };

        const populatedData = await populated();

        return populatedData?.skill_recommendations?.map((skill) => ({
            skillName: skill.skillName,
            skillId: skill.skillId,
            content: {
                trails: skill.trails || [],
                courses: skill.courses || [],
            },
        }));
    },
    buildSuggestions: async (data) => {
        const idToDateMap = new Map();
        data.forEach((item) => {
            console.log(item);
            item.recommendedTrails?.forEach((trail) => {
                idToDateMap.set(trail.id, trail.createdAt);
            });

            item.recommendedCourses?.forEach((course) => {
                idToDateMap.set(course.courseId, course.createdAt);
            });
        });

        const ids = Array.from(idToDateMap.keys()).flat();

        const [trails, courses] = await Promise.all([getTrailByIds(ids), getCoursesByIds(ids)]);

        return [
            ...trails.map((trail) => ({
                ...trail,
                type: 'Online',
                createdAt: idToDateMap.get(trail._id.toString()),
            })),
            ...courses.map((course) => ({
                ...course,
                type: 'Presencial',
                createdAt: idToDateMap.get(course.id) || new Date(0),
            })),
        ];
    },
};
const collectIds = (data, mappings) => {
    const ids = [];
    const traverse = (obj) => {
        if (Array.isArray(obj)) {
            obj.forEach(traverse);
        } else if (obj && typeof obj === 'object') {
            mappings.forEach(({ reference }) => {
                const val = obj[reference];
                if (val != null) {
                    if (Array.isArray(val)) {
                        val.forEach((id) => id && ids.push(id.toString()));
                    } else {
                        ids.push(val.toString());
                    }
                }
            });
            Object.values(obj).forEach(traverse);
        }
    };

    traverse(data);
    return [...new Set(ids)];
};

const processData = async (data, mappings, userMap) => {
    const process = async (obj) => {
        if (Array.isArray(obj)) {
            return Promise.all(obj.map(process));
        } else if (obj && typeof obj === 'object') {
            const newObj = { ...obj };

            if (newObj._id && newObj._id._bsontype === 'ObjectID') {
                newObj._id = newObj._id.toString();
            }

            mappings.forEach(({ fieldName, reference }) => {
                const val = newObj[reference];
                if (val != null) {
                    newObj[fieldName] = Array.isArray(val)
                        ? val.map((id) => userMap.get(id.toString()) || null)
                        : userMap.get(val.toString()) || null;
                }
                if (reference !== fieldName) {
                    delete newObj[reference];
                }
            });

            for (const key of Object.keys(newObj)) {
                newObj[key] = await process(newObj[key]);
            }

            return newObj;
        } else {
            return obj;
        }
    };

    return process(data);
};
module.exports = business;
