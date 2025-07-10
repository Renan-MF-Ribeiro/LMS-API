const { Types } = require('mongoose');
const { getCoursesByIds, getCoursesByUserID } = require('../courses/business');
const { getTrailByIds, getTrailsWithTrackings } = require('../trails/business');
const { User } = require('../users/model');
const { string } = require('zod');
const { ClassModel } = require('../courses/model');

const business = {
    populateCoursesAndTrails: async (data) => {
        const ids =
            data.skill_recommendations?.flatMap((skill) => [
                ...(skill.trailIds || []),
                ...(skill.coursesIds || []),
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
                courses: (skill.coursesIds || [])
                    .map((id) => courseMap.get(id.toString()))
                    .filter(Boolean),
                trailIds: undefined,
                coursesIds: undefined,
            })),
        };

        return response;
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

    buildEvaluationsResultSuggestions: async (data, userNetworkLogin, userId) => {
        if (!data?.skill_recommendations?.length) return [];

        const trailIds = new Set();
        const courseIds = new Set();
        for (const skill of data.skill_recommendations) {
            (skill.trailIds || []).forEach((t) => trailIds.add(t.trailId));
            (skill.coursesIds || []).forEach((c) => courseIds.add(c.courseId));
        }

        const [trails, courses] = await Promise.all([
            getTrailsWithTrackings(Array.from(trailIds), userNetworkLogin),
            getCoursesByIds(Array.from(courseIds)),
        ]);

        const trailMap = new Map(trails.map((t) => [t._id.toString(), t]));

        const courseMap = new Map(
            courses.map((course) => [course._id.toString(), course])
        );

        const courseClassesWithUsers = await ClassModel.find(
            {
                courseID: { $in: Array.from(courseIds).map(id => new Types.ObjectId(id)) },
                $or: [
                    { 'users.userID': new Types.ObjectId(userId), dateApplicationFinal: { $gte: new Date() } },
                    {
                        users: {
                            $elemMatch: {
                                userID: new Types.ObjectId(userId),
                                presenceAt: { $exists: true },
                                presence: true
                            }
                        },
                    }
                ]
            },
        )
            .select('_id name dateApplicationFinal courseID users.userID users.presence users.presenceAt')
            .sort({ _id: -1 })
            .lean();

        return data.skill_recommendations.map((skill) => {
            const skillTrails = (skill.trailIds || [])
                .map(({ trailId, released }) => {
                    const trail = trailMap.get(trailId);
                    return trail ? { ...trail, released } : null;
                })
                .filter(Boolean);

            const skillCourses = (skill.coursesIds || [])
                .map(({ courseId, released }) => {
                    const course = courseMap.get(courseId);
                    const courseClass = courseClassesWithUsers.find(
                        (courseClass) => String(courseClass.courseID) === String(courseId)
                            && courseClass.users.some((user) => String(user.userID) === String(userId))
                    ) ?? null;
                    const courseClassUserInfo = courseClass?.users.find((user) => String(user.userID) === String(userId)) ?? null;

                    return course ? {
                        ...course,
                        status: courseClassUserInfo?.presence ? 'completed' : 'pending',
                        released: !!courseClass && released ? true : false,
                        classes: courseClass ? {
                            name: courseClass?.name,
                            _id: courseClass?._id,
                            presence: courseClassUserInfo?.presence,
                            presenceAt: courseClassUserInfo?.presenceAt ?? null,
                            dateApplicationFinal: courseClass?.dateApplicationFinal ?? null
                        } : null
                    } : null;
                })
                .filter(Boolean);

            return {
                skillName: skill.skillName,
                skillId: skill.skillId,
                content: {
                    trails: skillTrails,
                    courses: skillCourses,
                },
            };
        });
    },

    buildSuggestions: async (data) => {
        const idToDateMap = new Map();

        data.recommendedTrails?.forEach((trail) => {
            idToDateMap.set(trail?.id, trail?.createdAt);
        });

        data.recommendedCourses?.forEach((course) => {
            idToDateMap.set(course?.courseId, course?.createdAt);
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

    getUserLastPresenceInCourse: async (userId) => {
        const classes = await getCoursesByUserID(userId);

        return classes?.reduce((latestPresence, classItem) => {
            classItem.users.forEach((user) => {
                if (user._id.toString() === userId.toString() && user.presenceAt) {
                    if (!latestPresence || user.presenceAt > latestPresence) {
                        latestPresence = user.presenceAt;
                    }
                }
            });
            return latestPresence;
        }, null);
    }
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
