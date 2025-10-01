const { getUserByToken } = require('../../utils/functions');
const { User } = require('../users/model');
const { mentoringApi } = require('./http-adapter');

async function populateTrailFields(data) {
    const trails = await Trail.findOne({ _id: { $in: data } }, 'title titleURL thumbPath').lean();

    return [trails] || undefined;
}

/*
Função recursiva pra popular usuários de arrays ou objetos vindos do SocialApi
Funciona recebendo um objeto ou um array de objetos

## Parãmetros:
- reference: Campo com object ou array de IDs dos usuários à serem populados (ex: userId)
- fieldName: Nome que será dado no lugar do 'reference' ao final da recursão (ex: Users)
- data: Object ou array de Object que deve ser populado
*/

async function populateUserFields(mappings, data) {
    const isArray = Array.isArray(data.data);
    const dataToProcess = isArray ? data.data : [data.data];

    // Coletar todos os IDs das referências em todos os níveis
    const ids = collectIds(dataToProcess, mappings);
    if (ids.length === 0) return data;
    // Buscar usuários de uma só vez
    const users = await User.find(
        { _id: { $in: ids } },
        '_id name profilePhoto email office status'
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

async function populateBlockedUserFields(data) {
    const isArray = Array.isArray(data);
    const dataToProcess = isArray ? data : [data];

    const ids = dataToProcess.map(item => item._id.toString());
    if (ids.length === 0) return data;

    const users = await User.find(
        { _id: { $in: ids } },
        '_id name profilePhoto email office status'
    ).lean();

    const usersWithBlockedAt = users.map(user => {
        return {
            ...user,
            blockedAt: dataToProcess.find(item => item._id.toString() === user._id.toString())?.blockedAt || null
        };
    });
    return usersWithBlockedAt;
}

// Função para coletar IDs de todas as referências na estrutura de dados
function collectIds(data, mappings) {
    const ids = [];
    const traverse = (obj) => {
        if (Array.isArray(obj)) {
            obj.forEach(traverse);
        } else if (obj && typeof obj === 'object') {
            mappings.forEach(({ reference }) => {
                const val = obj[reference];
                if (val != null) {
                    if (Array.isArray(val)) {
                        val.forEach((id) => id && ids.push(id));
                    } else {
                        ids.push(val);
                    }
                }
            });
            Object.values(obj).forEach(traverse);
        }
    };

    traverse(data);
    return [...new Set(ids)];
}

function collectBlockedIds(data) {
    const ids = [];

    const traverse = (obj, path = '') => {
        if (Array.isArray(obj)) {
            console.log('Traversing array at path:', path);
            obj.forEach((item, idx) => traverse(item, `${path}[${idx}]`));
        } else if (obj && typeof obj === 'object') {
            if (obj.blockedMentees && Array.isArray(obj.blockedMentees)) {
                obj.blockedMentees.forEach((blockedMentee, idx) => {
                    if (blockedMentee._id) {
                        console.log(`Found blockedMentee._id at ${path}.blockedMentees[${idx}]:`, blockedMentee._id);
                        ids.push(blockedMentee._id.toString());
                    }
                });
            }
            Object.entries(obj).forEach(([key, value]) => traverse(value, path ? `${path}.${key}` : key));
        }
    };

    console.log('Starting collectBlockedIds with data:', data);
    traverse(data);
    const uniqueIds = [...new Set(ids)];
    console.log('Collected blocked IDs:', uniqueIds);
    return uniqueIds;
}

async function processData(data, mappings, userMap) {
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

async function getHierarchicalMentorIds(req) {
    const [hierarchiesResponse, requestUser] = await Promise.all([
        mentoringApi.get('/config/hierarchies'),
        getUserByToken(req),
    ]);

    const allHierarchies = hierarchiesResponse.data?.data || [];

    const hierarchiesWithInfo = allHierarchies.hierarchies?.map((h) => {
        return {
            menteeLevel: h.menteeLevel?.map(
                (mentee) => {
                    const hierarchies = allHierarchies.structures.find((structureLevel) => structureLevel.level === mentee.level)
                    return {
                        field: hierarchies?.field,
                        value: hierarchies?.value,
                        level: mentee.level
                    }
                }
            ),
            mentorLevel: allHierarchies.structures.find((structureLevel) => structureLevel.level === h.mentorLevel.level) || {},
        };
    })

    const matchingHierarchies = hierarchiesWithInfo?.filter(hierarchy =>
        hierarchy.menteeLevel?.some(menteeCondition =>
            requestUser[menteeCondition.field] === menteeCondition.value
        )
    );

    const mentorConditions = [];
    const seenConditions = new Set();

    matchingHierarchies?.forEach(({ mentorLevel }) => {
        const conditionKey = `${mentorLevel?.field}:${mentorLevel?.value}`;
        if (!seenConditions.has(conditionKey)) {
            seenConditions.add(conditionKey);
            mentorConditions.push({
                [mentorLevel?.field]: mentorLevel?.value
            });
        }
    });
    let mentors = [];
    if (mentorConditions.length > 0) {
        mentors = await User.find({ $or: mentorConditions }, '_id');
    }
    return mentors.map(mentor => mentor._id) || []
}
module.exports = {
    populateUserFields,
    populateBlockedUserFields,
    getHierarchicalMentorIds
};
