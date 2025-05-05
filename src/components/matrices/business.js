const { getCoursesByIds } = require('../courses/business');
const { getTrailByIds } = require('../trails/business');
const { User } = require('../users/model');

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

    buildCoursesResponse: async (courses) => {

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
    }
}

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
}

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
        }
        else {
            return obj;
        }
    };

    return process(data);
}
module.exports = business