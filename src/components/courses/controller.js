const { User } = require('../users/model');
const mongoose = require('mongoose');
const {
    CourseModel,
    ClassModel,
    MaterialModel,
    ProgramModel,
    CourseEvaluationModel,
    WaitListsByUser,
    WaitListsByCourses,
    UsersWithProcessedTags,
    WaitListModel,
} = require('./model');
const moment = require('moment-timezone');
const { DOMAIN, AZURE_BLOB_URL } = process.env;

const { azureBlob, readXLSXAttendanceList } = require('../../utils/files');

const { Group } = require('../groups/model');

const { dispatch } = require('../webhooks/controller');

const { Trail } = require('../trails/model');

const { sendMessageToKafka, processTargetUsers } = require('../new-messages/business');

const { internalServer, success, badRequest } = require('../../utils/messages');

const { pagination, ordernation, getUserByToken, isDateOutOfRange } = require('../../utils/functions');

const {
    uploadMaterial,
    getStoreUSers,
    getAppliedCourses,
    getClassByID,
    returnProgramaID,
    processAttendanceListImport,
    enrichCoursesWithClasses,
    prepareBodyForMessage,

} = require('./business');

const {
    checkItemCompleted,
    getTrailCompletion,
    getTagsElegiblesByToken,
    checkEligibilityTagsAnd,
} = require('../sections/business');

const { canRegisterOrCancel } = require('../sections/business')

const { default: axios } = require('axios');
const ApiError = require('../../errors/ApiError');
const { getMessengerConfig } = require('../config/business');
const _business = require('./business');

module.exports = {
    async createCourse (req, res) {
        try {
            const materials = JSON.parse(req.fields.materials);
            const files = req.files;
            const body = req.fields;
            const arrMaterials = [];
            let flagDate = true;
            body.dimensions = JSON.parse(body.dimensions);
            body.tags = JSON.parse(body.tags);
            body.mandatory = JSON.parse(body.mandatory);
            body.obligatory = JSON.parse(body.obligatory);
            body.certificateDue = JSON.parse(body.certificateDue);
            body.certificateDateType = JSON.parse(body.certificateDateType);

            let thumbPath;
            const { thumb, banner } = req.files;
            if (thumb) {
                thumbPath = await azureBlob(thumb, 'items/thumbs');
                body.thumbPath = thumbPath.replace(AZURE_BLOB_URL, DOMAIN);
            }

            let bannerPath;
            if (banner) {
                bannerPath = await azureBlob(banner, 'items/banners');
                body.banner = bannerPath.replace(AZURE_BLOB_URL, DOMAIN);
            }

            if (!body.passingScore || body.passingScore === 'null')
                delete body.passingScore;
            if (!body.certificateLayout || body.certificateLayout === 'null')
                delete body.certificateLayout;
            if (body.dateInitial > body.dateFinal) flagDate = false;

            body.startDate = (body.startDate === 'null' || !body.startDate) ? null : body.startDate;

            body.endDate = (body.endDate === 'null' || !body.endDate) ? null : body.endDate;

            if (flagDate) {
                if (body.isEvaluationAvailable) {
                    body.isEvaluationAvailable = body.isEvaluationAvailable == 'true';
                } else {
                    body.isEvaluationAvailable = false;
                }

                const flagCourse = await CourseModel.findOne({
                    title: { $eq: body.title },
                    deleted: 0,
                });

                if (flagCourse) {
                    badRequest(
                        res,
                        req,
                        'Já existe um curso cadastrado com esse título',
                        'Já existe um curso cadastrado com esse título',
                        'courses',
                        '/createCourse'
                    );
                } else {
                    const programID = await returnProgramaID(body.program);
                    body.program = programID;

                    delete body.materials;
                    const courseCreated = await CourseModel.create(body);

                    await dispatch('create', 'course', courseCreated);

                    if (materials) {
                        const materialsArray = Array.isArray(materials)
                            ? [...materials]
                            : [materials];
                        for (const material of materialsArray) {
                            const materialID = await uploadMaterial(
                                files[material],
                                'CONTEUDISTA',
                                `courses/${courseCreated._id}body/materials`
                            );
                            arrMaterials.push(materialID);
                        }
                    }

                    await CourseModel.findByIdAndUpdate(courseCreated._id, {
                        materials: arrMaterials,
                    });
                    success(res, req, 'Curso criado com sucesso!');
                }
            } else {
                badRequest(
                    res,
                    req,
                    'A data final da aplicação tem que ser maior que a inicial!',
                    'A data final da aplicação tem que ser maior que a inicial!',
                    'courses',
                    '/createCourse'
                );
            }
        } catch (error) {
            console.log(error);
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/createCourse'
            );
        }
    },

    async allCourses (req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const total = await CourseModel.find(
                searchBy
                    ? {
                        $text: { $search: searchBy },
                        deleted: 0,
                    }
                    : {
                        deleted: 0,
                    }
            ).countDocuments();

            const courses = await CourseModel.find(
                searchBy
                    ? {
                        title: { $regex: searchBy, $options: 'i' },
                        deleted: 0,
                    }
                    : {
                        deleted: 0,
                    }
            )
                .populate({
                    path: 'materials',
                    match: { author: 'CONTEUDISTA' },
                })
                .populate('program', 'title')
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            const programs = await ProgramModel.find().select('title');

            success(res, req, {
                data: courses,
                total,
                programs,
            });
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/courses'
            );
        }
    },

    async getPrograms (req, res) {
        try {
            const programs = await ProgramModel.find().select('title');
            success(res, req, programs);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getPrograms'
            );
        }
    },

    async updateCourse (req, res) {
        try {
            const materials = req.fields.materials ? JSON.parse(req.fields.materials) : null;
            const body = req.fields;
            const arrMaterials = [];
            const files = req.files;
            let flagDate = true;
            if (body.tags) body.tags = JSON.parse(body.tags);
            if (body.dimensions) body.dimensions = JSON.parse(body.dimensions);
            if (body.mandatory) body.mandatory = JSON.parse(body.mandatory);
            if (body.obligatory) body.obligatory = JSON.parse(body.obligatory);
            if (body.certificateDue) body.certificateDue = JSON.parse(body.certificateDue);
            if (body.certificateDateType) body.certificateDateType = JSON.parse(body.certificateDateType);
            const { thumb, banner } = req.files;
            let thumbPath;
            if (thumb) {
                thumbPath = await azureBlob(thumb, 'items/thumbs');
                body.thumbPath = thumbPath.replace(AZURE_BLOB_URL, DOMAIN);
            }

            let bannerPath;
            if (banner) {
                bannerPath = await azureBlob(banner, 'items/banners');
                body.banner = bannerPath.replace(AZURE_BLOB_URL, DOMAIN);
            }

            if (!body.passingScore || body.passingScore === 'null')
                body.passingScore = null;
            if (!body.certificateLayout || body.certificateLayout === 'null')
                delete body.certificateLayout;

            if (body.dateInitial > body.dateFinal) flagDate = false;

            body.startDate = (body.startDate === 'null' || !body.startDate) ? null : body.startDate;

            body.endDate = (body.endDate === 'null' || !body.endDate) ? null : body.endDate;

            if (!flagDate) {
                badRequest(
                    res,
                    req,
                    'A data final da aplicação tem que ser maior que a inicial!',
                    'A data final da aplicação tem que ser maior que a inicial!',
                    'courses',
                    '/updateCourse'
                );
            } else {
                if (body.isEvaluationAvailable) {
                    body.isEvaluationAvailable = body.isEvaluationAvailable == 'true';
                } else {
                    body.isEvaluationAvailable = false;
                }

                const flagCourse = await CourseModel.findOne({
                    title: { $eq: body.title },
                    deleted: 0,
                });

                if (flagCourse && flagCourse._id.toString() !== body._id) {
                    badRequest(
                        res,
                        req,
                        'Já existe um curso cadastrado com esse título',
                        'Já existe um curso cadastrado com esse título',
                        'courses',
                        '/createCourse'
                    );
                } else {
                    const programID = await returnProgramaID(body.program);
                    body.program = programID;

                    if (materials) {
                        const materialsArray = Array.isArray(materials)
                            ? [...materials]
                            : [materials];
                        for (const material of materialsArray) {
                            const materialID = await uploadMaterial(
                                files[material],
                                'CONTEUDISTA',
                                `courses/${body._id}body/materials`
                            );
                            arrMaterials.push(materialID);
                        }
                    }

                    const currentCourse = await CourseModel.findById(body._id);
                    body.materials = currentCourse.materials.concat(arrMaterials);

                    if (body.status == 0) {
                        body.isEvaluationAvailable = false;
                    }

                    await CourseModel.findByIdAndUpdate(body._id, body);

                    await dispatch('update', 'course', body);

                    if (body.isEvaluationAvailable == false) {
                        await ClassModel.updateMany(
                            { courseID: body._id },
                            {
                                qrcode: null,
                            }
                        );
                    }

                    success(res, req, 'Atualizado com sucesso');
                }
            }
        } catch (error) {
            console.log(error);
            internalServer(res, req, error.message, 'Erro interno no servidor', '/updateCourse');
        }
    },

    async deleteCourse (req, res) {
        try {
            const { id } = req.params;
            await CourseModel.findByIdAndUpdate(id, { deleted: 1 });
            await dispatch('delete', 'course', { id });

            success(res, req, 'Curso excluído com sucesso!');
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/deleteCourse'
            );
        }
    },

    async instructorAllCourses (req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;
            let arrCoursesFinal;

            const query = searchBy
                ? {
                    title: { $regex: '' || searchBy, $options: 'i' },
                    deleted: 0,
                    status: 1,
                }
                : {
                    deleted: 0,
                    status: 1,
                }
            const total = await CourseModel.find(query).countDocuments();
            const courses = await CourseModel.find(query)
                .populate({
                    path: 'materials',
                    match: { author: 'CONTEUDISTA' },
                })
                .populate({
                    path: 'groups',
                    select: ['office', 'tags'],
                })
                .populate('program', 'title')
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            arrCoursesFinal = courses;

            success(res, req, {
                data: arrCoursesFinal,
                total
            });
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/instructorAllCourses'
            );
        }
    },

    async getCourseById (req, res) {
        try {
            const { id } = req.params;
            const course = await CourseModel.findById(id)
                .populate({
                    path: 'materials',
                    match: { author: 'CONTEUDISTA' },
                }).populate('program', 'title');
            const programs = await ProgramModel.find().select('title');

            success(res, req, { course, programs });
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseById'
            );
        }
    },

    async getUsers (req, res) {
        try {
            const user = await getUserByToken(req);
            const storeUsers = await getStoreUSers(user.store);
            success(res, req, storeUsers);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getUsers'
            );
        }
    },

    async createClass (req, res) {
        try {
            let {
                courseID,
                users,
                registrationDeadline,
                cancellationDeadline,
                dateApplicationInitial,
                dateApplicationFinal,
                minister,
                requester,
                qrcode,
                qrCodeSelfRegistration,
                isSelfRegistrationEnabled,
                limit,
                location,
                costs,
                name,
                signup,
            } = req.fields;

            const costsArray = costs ? JSON.parse(costs) : null;

            let message;
            let flagDate = true;

            if (dateApplicationInitial && dateApplicationFinal) {
                if (dateApplicationInitial >= dateApplicationFinal) {
                    flagDate = false;
                    message = 'A data final da aplicação tem que ser maior que a inicial!';
                }
            } else {
                flagDate = false;
                message = 'Todas as datas são obrigatórias!';
            }

            if (!flagDate) {
                badRequest(
                    res,
                    req,
                    message,
                    message,
                    'courses',
                    '/createClass'
                );
            } else {
                const materials = JSON.parse(req.fields.materials);
                const files = req.files;
                const arrMaterials = [];
                let user = await getUserByToken(req);
                let instructorID = user.id;
                let namesCourse = '';
                let canCreateClass = true;

                const course = await CourseModel.findById(courseID).populate({
                    path: 'groups',
                    select: 'trails',
                });

                if (canCreateClass) {
                    const dateInitial = new Date(course.dateInitial)
                    const dateFinal = new Date(course.dateFinal)
                    const applicationInitial = new Date(dateApplicationInitial);
                    const applicationFinal = new Date(dateApplicationFinal);

                    if (
                        applicationInitial < dateInitial ||
                        applicationInitial > dateFinal ||
                        applicationFinal < dateInitial ||
                        applicationFinal > dateFinal
                    ) {
                        return badRequest(
                            res,
                            req,
                            '',
                            'Atenção, a data deve corresponder ao período de início e fim do curso!',
                            'courses',
                            '/createClass'
                        );
                    } else {
                        if (materials) {
                            const materialsArray = Array.isArray(materials)
                                ? [...materials]
                                : [materials];
                            for (const material of materialsArray) {
                                const materialID = await uploadMaterial(
                                    files[material],
                                    'INSTRUTOR',
                                    `courses/${courseID}body/materials`
                                );
                                arrMaterials.push(materialID);
                            }
                        }

                        const nowDate = new Date();

                        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;


                        const newUsers = JSON.parse(users).map((user) => {
                            return {
                                ...user,
                                ip,
                                userID: mongoose.Types.ObjectId(user._id ?? user.userID),
                                presenceAt: user.presence ? nowDate : null,
                                createdAt: nowDate,
                                updatedAt: nowDate,
                            };
                        });

                        const createdClass = await ClassModel.create({
                            courseID,
                            users: newUsers,
                            instructor: instructorID,
                            requester,
                            minister,
                            qrcode: req.body.qrcode,
                            materials: arrMaterials,
                            registrationDeadline: !registrationDeadline ? 0 : registrationDeadline,
                            cancellationDeadline: !cancellationDeadline ? 0 : cancellationDeadline,
                            dateApplicationInitial,
                            dateApplicationFinal,
                            canCreateClass,
                            qrcode: qrcode,
                            qrCodeSelfRegistration: qrCodeSelfRegistration,
                            isSelfRegistrationEnabled: isSelfRegistrationEnabled,
                            limit,
                            location,
                            costs: costsArray,
                            name,
                            signup,
                        });

                        await dispatch('create', 'class', createdClass);

                        const classesFromCourse = await ClassModel.find({ courseID });

                        const arrUserId = [];
                        for (let user of JSON.parse(users)) {
                            arrUserId.push(user._id);
                            const removalPromises = classesFromCourse.map((classFromCourse) => {
                                const inClass = classFromCourse.users.some(
                                    (u) => u._id == user._id || u.userID == user._id
                                );

                                if (classFromCourse._id.equals(createdClass._id) || !inClass) {
                                    return Promise.resolve();
                                }

                                return ClassModel.findOneAndUpdate(
                                    { _id: classFromCourse._id },
                                    { $pull: { users: { _id: user._id, presence: false } } }
                                );
                            });

                            await Promise.all(removalPromises);
                        }

                        const messengerConfig = await getMessengerConfig();

                        const classBody = createdClass.toObject ? createdClass.toObject() : createdClass;
                        const classBodyForMessage = await prepareBodyForMessage(classBody, location);

                        for (const user of newUsers) {
                            const message = {
                                category: 'notify',
                                communication: ['notification', 'email'],
                                mode: 'manual',
                                target: {
                                    type: 'users',
                                    value: {
                                        users: [user._id],
                                    },
                                },
                                text: `${user.name}, você foi inscrito com sucesso na turma "${classBodyForMessage.name}"! Prepare-se para aprender e aproveitar ao máximo essa experiência.`,
                                textHtml: `<p>${user.name}, você foi inscrito com sucesso na turma "${classBodyForMessage.name}"! Prepare-se para aprender e aproveitar ao máximo essa experiência.</p>`,
                                thumbnail: messengerConfig.emailTemplate.thumbnail,
                                title: `Treinamentos: ${name}`,
                                class: classBodyForMessage,
                                courses: true,
                            }

                            await createMessagesFromBackend(message);
                        }

                        success(res, req, 'Criado com sucesso!');
                        return;
                    }
                } else {
                    badRequest(
                        res,
                        req,
                        'O instrutor não completou todas as trilhas',
                        `O instrutor selecionado deve concluir as trilhas ${namesCourse}`,
                        'courses',
                        'createClass'
                    );
                    return;
                }
            }
        } catch (error) {
            console.log('createClass error', error);
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                'instructor/createClass'
            );
        }
    },

    async updateClass (req, res) {
        try {
            let {
                courseID,
                users,
                classID,
                qrcode,
                minister,
                requester,
                registrationDeadline,
                cancellationDeadline,
                dateApplicationInitial,
                dateApplicationFinal,
                qrCodeSelfRegistration,
                isSelfRegistrationEnabled,
                limit,
                location,
                costs,
                name,
                signup,
            } = req.fields;
            const materials = JSON.parse(req.fields.materials);
            const costsArray = JSON.parse(costs);
            const files = req.files;
            const currentMaterials = await ClassModel.findById(classID);
            const arrMaterials = currentMaterials.materials;
            let flagDate = true;
            isSelfRegistrationEnabled = isSelfRegistrationEnabled == 'true';

            if (dateApplicationInitial || dateApplicationFinal) {
                if (dateApplicationInitial && dateApplicationFinal === '') {
                    flagDate = true;
                } else {
                    if (dateApplicationInitial >= dateApplicationFinal) flagDate = false;
                }
            }

            if (!flagDate) {
                badRequest(
                    res,
                    req,
                    'A data final da aplicação tem que ser maior que a inicial!',
                    'A data final da aplicação tem que ser maior que a inicial!!',
                    'courses',
                    '/createClass'
                );
            } else {
                let user = await getUserByToken(req);
                let instructorID = user.id;
                const course = await CourseModel.findById(courseID).populate({
                    path: 'groups',
                    select: 'trails',
                });

                if (course.deleted === 0 && course.status === 1) {
                    const dateInitial = new Date(course.dateInitial)
                    const dateFinal = new Date(course.dateFinal)
                    const applicationInitial = new Date(dateApplicationInitial);
                    const applicationFinal = new Date(dateApplicationFinal);
                    if (
                        applicationInitial < dateInitial ||
                        applicationInitial > dateFinal ||
                        applicationFinal < dateInitial ||
                        applicationFinal > dateFinal
                    ) {
                        return badRequest(
                            res,
                            req,
                            '',
                            'Atenção, a data deve corresponder ao período de início e fim do curso!',
                            'courses',
                            '/createClass'
                        );
                    }

                    if (materials) {
                        const materialsArray = Array.isArray(materials)
                            ? [...materials]
                            : [materials];
                        for (const material of materialsArray) {
                            const materialID = await uploadMaterial(
                                files[material],
                                'INSTRUTOR',
                                `courses/${courseID}body/materials`
                            );
                            arrMaterials.push(materialID);
                        }
                    }

                    const nowDate = new Date();
                    const usersArr = JSON.parse(users);
                    const changedUsers = [];
                    const addedUsers = [];

                    const oldUsers =
                        (await ClassModel.findById(classID).select('users'))?.users ?? [];

                    for (let user of usersArr) {
                        const oldUserIndex =
                            oldUsers?.findIndex(
                                (u) =>
                                    String(u._id) === String(user._id) ||
                                    String(u.userID) === String(user._id)
                            ) ?? -1;
                        const oldUser = oldUserIndex >= 0 && oldUsers[oldUserIndex];

                        const presenceAt = user.presence
                            ? user.presenceAt
                                ? new Date(user.presenceAt)
                                : nowDate
                            : null;

                        const userId = user._id ?? user.userID;

                        if (oldUser) {
                            const presenceChanged =
                                Boolean(oldUser.presence) !== Boolean(user.presence);
                            const gradesChanged = Number(oldUser.grades) !== Number(user.grades);

                            if (presenceChanged || gradesChanged) {
                                changedUsers.push({
                                    index: oldUserIndex,
                                    user: {
                                        ...user,
                                        userID: mongoose.Types.ObjectId(userId),
                                        presenceAt,
                                        updatedAt: nowDate,
                                    },
                                });
                            }
                        } else {
                            addedUsers.push({
                                ...user,
                                userID: mongoose.Types.ObjectId(userId),
                                presenceAt,
                                createdAt: nowDate,
                                updatedAt: nowDate,
                            });
                        }
                    }

                    const removedUsers = oldUsers.filter(
                        (oldUser) =>
                            !usersArr.some(
                                (user) =>
                                    String(user._id) === String(oldUser._id) ||
                                    String(user._id) === String(oldUser.userID)
                            )
                    );
                    const classBody = {
                        courseID,
                        instructor: instructorID,
                        requester,
                        minister,
                        materials: arrMaterials,
                        qrcode,
                        qrCodeSelfRegistration: qrCodeSelfRegistration,
                        isSelfRegistrationEnabled: isSelfRegistrationEnabled,
                        registrationDeadline: !registrationDeadline ? 0 : registrationDeadline,
                        cancellationDeadline: !cancellationDeadline ? 0 : cancellationDeadline,
                        dateApplicationInitial,
                        dateApplicationFinal,
                        limit,
                        location,
                        costs: costsArray,
                        name,
                        signup,
                        // Atualiza usuários
                        $set: changedUsers.reduce((acc, { index, user }) => {
                            acc[`users.${index}`] = user;
                            return acc;
                        }, {}),
                    }
                    // Atualiza classe e usuários
                    await ClassModel.findByIdAndUpdate(classID, classBody);
                    await dispatch('update', 'class', { _id: classID, ...classBody });
                    // Adiciona usuários
                    if (addedUsers.length) {
                        await ClassModel.findByIdAndUpdate(classID, {
                            $push: { users: { $each: addedUsers } },
                        });

                        const messengerConfig = await getMessengerConfig();

                        const classBodyForMessage = await prepareBodyForMessage(classBody, location);
                        for (const user of addedUsers) {
                            const message = {
                                category: 'notify',
                                communication: ['notification', 'email'],
                                mode: 'manual',
                                target: {
                                    type: 'users',
                                    value: {
                                        users: [user._id],
                                    },
                                },
                                text: `${user.name}, sua inscrição na turma "${classBodyForMessage.name}" foi atualizada! veja os detalhes abaixo.`,
                                textHtml: `<p>${user.name}, sua inscrição na turma "${classBodyForMessage.name}" foi atualizada! veja os detalhes abaixo.</p>`,
                                thumbnail: messengerConfig.emailTemplate.thumbnail,
                                title: `Treinamentos: ${name}`,
                                class: classBodyForMessage,
                                courses: true,
                            };

                            await createMessagesFromBackend(message);
                        }
                    }

                    // Remove somente usuários que não estão presentes
                    if (removedUsers.length) {
                        await ClassModel.findByIdAndUpdate(classID, {
                            $pull: {
                                users: {
                                    _id: { $in: removedUsers.map((u) => u._id) },
                                    presence: false,
                                },
                            },
                        });
                    }

                    success(res, req, 'Atualizado com sucesso!');
                } else {
                    badRequest(
                        res,
                        req,
                        'O curso não pode ser atualizado, porque está inativado!',
                        'O curso não pode ser atualizado, porque está inativado!',
                        'courses',
                        '/updateClass'
                    );
                }
            }
        } catch (error) {
            console.log('updateClass error', error);
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/updateClass'
            );
        }
    },

    async appliedCourses (req, res) {
        try {
            const user = await getUserByToken(req);
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const { searchBy, isAdmin } = req.query;

            const { courses, total } = await getAppliedCourses(
                user._id,
                order,
                sort,
                skip,
                limit,
                searchBy,
                isAdmin
            );
            success(res, req, {
                data: courses,
                total,
            });
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/createClass'
            );
        }
    },

    async appliedCourse (req, res) {
        try {
            const { courseID, classID } = req.params;
            const course = await CourseModel.findById(courseID)
                .populate('materials')
                .populate('program', 'title');
            const classUsers = await getClassByID(classID);

            success(res, req, {
                course,
                classUsers,
            });
        } catch (error) {
            console.error(error);
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/appliedCourse'
            );
        }
    },

    async printAttendanceList (req, res) {
        try {
            const { courseId, classId } = req.params;
            const onlyPresenceFlag = req.query?.onlyPresence !== undefined;

            const course = await CourseModel.findById(courseId);
            const foundClass = await getClassByID(classId);
            // console.log(foundClass)
            const { data } = await axios.post(
                `${process.env.API_PDF_PRINTER}/attendance-list`,
                {
                    courseName: course.title ?? ' ',
                    startDate: foundClass.dateApplicationInitial
                        ? moment(foundClass.dateApplicationInitial)
                            .locale('pt-BR')
                            .subtract(3, 'hours')
                            .format('DD [de] MMMM [de] YYYY - HH:mm[h]')
                        : ' ',
                    endDate: foundClass.dateApplicationFinal
                        ? moment(foundClass.dateApplicationFinal)
                            .locale('pt-BR')
                            .subtract(3, 'hours')
                            .format('DD [de] MMMM [de] YYYY - HH:mm[h]')
                        : ' ',
                    instructor: foundClass.minister ?? ' ',
                    attendances: foundClass.users
                        .filter((user) => (onlyPresenceFlag ? !!user.presence : true))
                        .map((user) => ({
                            userName: user.name ?? ' ',
                            networkLogin: user.registration ?? ' ',
                            attendance: user.presence ?? false,
                            attendanceDate: user.presenceAt
                                ? moment(user.presenceAt).format('DD/MM/YYYY')
                                : ' ',
                            attendanceType: user.origin && user.presence
                                ? user.origin === 'instructor'
                                    ? 'Instrutor'
                                    : 'QR Code'
                                : ' ',
                        })),
                },
                {
                    headers: { Authorization: req.headers.authorization },
                    responseType: 'arraybuffer',
                }
            );

            const file = Buffer.from(data, 'binary');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${course.title}.pdf`);
            res.send(file);
        } catch (error) {
            console.error(error);
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/print-attendance-list'
            );
        }
    },

    async deleteMaterial (req, res) {
        try {
            const arrMaterials = [];
            const { materialID, classID } = req.params;

            const { materials } = await ClassModel.findById(classID);

            for (const material of materials) {
                if (material._id.toString() !== materialID) {
                    arrMaterials.push(material);
                }
            }

            await ClassModel.findByIdAndUpdate(classID, {
                materials: arrMaterials,
            });
            await MaterialModel.findByIdAndRemove(materialID);
            success(res, req, 'Material Excluído com sucesso!');
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/deleteMaterial'
            );
        }
    },

    async deleteMaterialCourse (req, res) {
        try {
            const arrMaterials = [];
            const { materialID, courseID } = req.params;
            const { materials } = await CourseModel.findById(courseID);

            for (const material of materials) {
                if (material._id.toString() !== materialID) {
                    arrMaterials.push(material._id);
                }
            }

            await CourseModel.findByIdAndUpdate(courseID, {
                materials: arrMaterials,
            });
            await MaterialModel.findByIdAndRemove(materialID);

            success(res, req, 'Material Excluído com sucesso!');
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/deleteMaterial'
            );
        }
    },

    async searchUser (req, res) {
        try {
            const { searchBy } = req.query;
            let { usersInClass } = req.body;
            const { skip, limit } = pagination(req);
            const { id } = req.params;
            usersInClass = usersInClass.map((userID) => mongoose.Types.ObjectId(userID));

            // Buscar o curso e pegar os valores de tags e obrigatoriedades
            const course = await CourseModel.findOne(
                { _id: id },
                { title: 1, tags: "$tags.value", mandatory: "$mandatory.value" }
            );

            // Buscar os grupos correspondentes às tags e obrigatoriedades
            const [tagGroups, mandatoryGroups] = await Promise.all([
                Group.find(
                    { "tags.value": { $in: course.tags } },
                    { name: 1 }
                ),
                Group.find(
                    { "tags.value": { $in: course.mandatory } },
                    { name: 1 }
                )
            ]);

            const tagGroupNames = tagGroups.map(group => group.name);
            const mandatoryGroupNames = mandatoryGroups.map(group => group.name);

            // Buscar usuários ativos que não estão na lista de usersInClass
            let query = {
                status: { $regex: "ATIVO", $options: "i" },
                _id: { $nin: usersInClass }
            };

            if (searchBy) {
                query.$or = [
                    { name: { $regex: searchBy, $options: "i" } },
                    { networkLogin: { $regex: searchBy, $options: "i" } },
                    { registration: { $regex: searchBy, $options: "i" } }
                ];
            }

            const currentDate = new Date()

            // Busca todos os usuários que correspondem aos critérios básicos
            const users = await User.find(query).sort({ name: 1 }).lean();

            // Filtrar apenas usuários qualificados com base em tags e grupos
            const eligibleUsers = users.filter(user => {
                const classGroupCodes = (user.classGroups || [])
                    .filter(classGroup =>
                        classGroup.status === 2 &&
                        new Date(classGroup.startDate) <= currentDate &&
                        new Date(classGroup.limitDate) >= currentDate
                    )
                    .map(classGroup => classGroup.groupCode);

                const allGroupCodes = [...(user.groupsAD || []), ...classGroupCodes];

                const mandatoryIntersection = allGroupCodes.filter(code =>
                    course.mandatory.includes(code) || mandatoryGroupNames.includes(code)
                );

                const tagsIntersection = allGroupCodes.filter(code =>
                    course.tags.includes(code) || tagGroupNames.includes(code)
                );

                if (mandatoryIntersection.length > 0) {
                    return mandatoryIntersection.length >= course.mandatory.length;
                } else {
                    return tagsIntersection.length > 0;
                }
            });

            const data = eligibleUsers.slice(skip, skip + limit)
            const total = eligibleUsers.length

            success(res, req, { data, total });
        } catch (error) {
            console.error(error);
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/searchUser'
            );
        }
    },

    async deleteClass (req, res) {
        try {
            const { classID } = req.params;
            const { materials } = await ClassModel.findById(classID);
            await ClassModel.findByIdAndRemove(classID);

            for (const material of materials) {
                await MaterialModel.findByIdAndRemove(material._id);
            }
            success(res, req, 'Excluído com sucesso');
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/deleteClass'
            );
        }
    },

    async courseEvaluation (req, res) {
        try {
            const { classID, answers } = req.body;
            const student = await getUserByToken(req);
            const { users } = await ClassModel.findById(classID);
            const filterUser = users.filter(
                (user) => user.userID === student.id || user._id.toString() === student.id
            );
            if (filterUser.length > 0) {
                const evaluation = await CourseEvaluationModel.updateOne(
                    { classID: classID, studentID: student.id },
                    {
                        classID,
                        answers,
                        studentID: student.id,
                    },
                    { upsert: true }
                );

                success(res, req, evaluation);
            } else {
                badRequest(
                    res,
                    req,
                    'O aluno não participou do curso',
                    'Atenção! Não é possível responder essa avaliação.',
                    'courses',
                    '/courseEvaluation'
                );
            }
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/courseEvaluation'
            );
        }
    },

    async verifyCourseEvaluation (req, res) {
        try {
            const { classID } = req.params;
            const student = await getUserByToken(req);
            const { users } = await ClassModel.findById(classID);
            const filterUser = users.filter(
                (user) =>
                    (user.userID === student.id || user._id.toString() === student.id) &&
                    user.presence
            );
            if (filterUser.length > 0) {
                const evaluationVerify = await CourseEvaluationModel.find({
                    classID: { $eq: classID },
                    studentID: { $eq: student.id },
                });

                if (evaluationVerify.length > 0) {
                    badRequest(
                        res,
                        req,
                        'O aluno já respondeu essa avaliação',
                        'Atenção! Essa avaliação já foi respondida.',
                        'courses',
                        '/courseEvaluation'
                    );
                } else {
                    success(res, req, {
                        flag: true,
                        msg: 'O aluno pode responder essa avaliação.',
                    });
                }
            } else {
                badRequest(
                    res,
                    req,
                    'O aluno não participou do curso',
                    'Atenção! Não é possível responder essa avaliação.',
                    'courses',
                    '/courseEvaluation'
                );
            }
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/courseEvaluation'
            );
        }
    },

    async getCourseEvaluations (req, res) {
        try {
            const { classID } = req.params;
            const student = await getUserByToken(req);
            const studentID = student._id;
            const evaluation = await CourseEvaluationModel.find({
                classID: { $eq: classID },
                studentID: { $eq: studentID },
            });
            success(res, req, evaluation.length > 0 ? evaluation : null);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseEvaluations'
            );
        }
    },

    async getCourseByQrCode (req, res) {
        try {
            const body = req.body;
            const course = await ClassModel.findOne({
                qrcode: { $eq: body.qrcode },
            }).populate('courseID', 'title');

            success(res, req, course);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseByQrCode'
            );
        }
    },

    async getCourseByQrCodeSelfRegistration (req, res) {
        try {
            const { body } = req;
            const { _id, name } = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            const classCourse = await ClassModel.findOne({
                qrCodeSelfRegistration: { $eq: body.qrcode },
            }).populate('courseID', ['title', 'tags', 'mandatory']);

            if (!classCourse) {
                return badRequest(
                    res,
                    req,
                    'Não foi possível encontrar uma turma correspondente ao QRCode informado.',
                    'Não foi possível encontrar uma turma correspondente ao QRCode informado.',
                    'courses',
                    '/getCourseByQrCodeSelfRegistration'
                );
            }

            const eligibility = checkEligibilityTagsAnd(
                tags ?? [],
                classCourse.courseID?.mandatory ?? [],
                classCourse.courseID?.tags ?? []
            );

            if (!eligibility) {
                return badRequest(
                    res,
                    req,
                    'O aluno não está elegível a este treinamento',
                    `Atenção! O usuário ${name} não está elegível a este treinamento.`,
                    'courses',
                    '/getCourseByQrCodeSelfRegistration'
                );
            }


            const course = await CourseModel.findById(classCourse.courseID._id)

            const isCourseDateOutOfRange = isDateOutOfRange(course.dateInitial, course.dateFinal);
            const isClassDateOutOfRange = isDateOutOfRange(
                classCourse.dateApplicationInitial,
                classCourse.dateApplicationFinal
            );

            if (isCourseDateOutOfRange || isClassDateOutOfRange) {
                const reason = isCourseDateOutOfRange ? 'ao curso' : 'a turma'

                return badRequest(
                    res,
                    req,
                    `Não foi possível assinar presença devido ${reason} não estar com data vigente.`,
                    `Não foi possível assinar presença devido ${reason} não estar com data vigente.`,
                    'courses',
                    '/getCourseByQrCodeSelfRegistration'
                );
            }

            let user = classCourse.users.find((user) => String(user._id) === String(_id));

            if (!user) {
                const student = await getUserByToken(req);

                if (!classCourse.signup) {
                    return badRequest(
                        res,
                        req,
                        `O usuário ${student.name} não está inscrito na turma.`,
                        `O usuário ${student.name} não está inscrito na turma.`,
                        'courses',
                        '/getCourseByQrCodeSelfRegistration'
                    );
                }

                const studentRegister = {
                    _id: student._id,
                    userID: student._id,
                    name: student.name,
                    email: student.email,
                    networkLogin: student.networkLogin,
                    registration: student.registration,
                    presence: false,
                    grades: 0,
                };

                const foundClass = await ClassModel.findOneAndUpdate(
                    { _id: classCourse._id },
                    { $addToSet: { users: studentRegister } }
                );
                await dispatch('update', 'class', foundClass);
                user = studentRegister;
            }

            return success(res, req, {
                title: classCourse.courseID.title,
                inClass: !!user,
                _id: classCourse._id,
                registered: user?.presence,
            });
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseByQrCodeSelfRegistration'
            );
        }
    },

    async getCourseDetailByQrCode (req, res) {
        try {
            const { body } = req;
            const course = await CourseModel.findOne({
                qrcode: { $eq: body.qrcode },
            });

            success(res, req, course);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseByQrCode'
            );
        }
    },

    async selfRegistration (req, res) {
        try {
            const { body } = req;
            const user = await getUserByToken(req);
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

            const nowDate = new Date();

            const course = await ClassModel.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(body.qrcode),
                    'users.userID': new mongoose.Types.ObjectId(user._id),
                },
                {
                    $set: {
                        'users.$.presence': true,
                        'users.$.device': body.browser,
                        'users.$.browser': body.device,
                        'users.$.origin': 'QRCODE',
                        'users.$.presenceAt': nowDate,
                        'users.$.updatedAt': nowDate,
                        'users.$.ip': ip,
                    },
                },
                { new: true }
            );

            success(res, req, course);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseByQrCode'
            );
        }
    },

    async listJoin (req, res) {
        try {
            const { body } = req;
            const user = await getUserByToken(req);

            const userID = String(user._id);

            const course = await _business.listJoin(user, body.classesID)

            const messengerConfig = await getMessengerConfig();

            const classBodyForMessage = await prepareBodyForMessage(course, course.location);

            const message = {
                category: 'notify',
                communication: ['notification', 'email'],
                mode: 'manual',
                target: {
                    type: 'users',
                    value: {
                        users: [user._id],
                    },
                },
                text: `${user.name}, você foi inscrito com sucesso na turma "${classBodyForMessage.name}"! Prepare-se para aprender e aproveitar ao máximo essa experiência.`,
                textHtml: `<p>${user.name}, você foi inscrito com sucesso na turma "${classBodyForMessage.name}"! Prepare-se para aprender e aproveitar ao máximo essa experiência.</p>`,
                thumbnail: messengerConfig.emailTemplate.thumbnail,
                title: `Treinamentos: ${course.name}`,
                class: classBodyForMessage,
                courses: true,
            };
            await createMessagesFromBackend(message);

            success(res, req, course);
        } catch (error) {
            if (error instanceof ApiError) {
                return badRequest(
                    res,
                    req,
                    error.message,
                    error.message,
                    'courses',
                    '/list-Join'
                );
            };
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/list-join'
            );
        }
    },

    async listLeave (req, res) {
        const { classesID } = req.body;
        const user = await getUserByToken(req);

        const { cancellationDeadline, dateApplicationInitial } = await ClassModel.findById(classesID)

        const canCancel = canRegisterOrCancel(dateApplicationInitial, cancellationDeadline)

        if (!canCancel) {
            throw new ApiError('Não é possível mais cancelar usa inscrição na classe.', 400)
        }
        const classUpdated = await ClassModel.findOneAndUpdate(
            { _id: classesID },
            { $pull: { users: { userID: user._id } } },
            { new: true }
        );
        await dispatch('update', 'class', classUpdated);

        success(res, req, classUpdated)
    },

    async getInstructorByInstructorGroup (req, res) {
        try {
            const { params } = req;
            const tags = [];
            const usersFilter = [];
            const groups = [];

            const course = await CourseModel.findById(params.courseID, 'groups').populate(
                'groups',
                'tags'
            );

            course.groups.tags.forEach((tag) => {
                tags.push(tag.value.toString());
            });

            const groupsAD = await Group.find({
                deleted: 0,
                active: 1,
            });

            groupsAD.forEach((group) => {
                group.tags.forEach((tag) => {
                    if (tags.includes(tag.value.toString())) groups.push(group);
                });
            });

            for (const group of groups) {
                const users = await User.find(
                    {
                        groupsAD: { $in: group.name },
                        status: 'ATIVO',
                    },
                    ['groupsAD', 'name', '_id', 'networkLogin']
                );

                for (const user of users) {
                    usersFilter.push(user);
                }
            }

            if (usersFilter.length > 0) {
                usersFilter.sort((a, b) => (a.name < b.name ? -1 : 1));
            }

            success(res, req, usersFilter);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getInstructorByInstructorGroup'
            );
        }
    },

    async verifyInstructor (req, res) {
        try {
            const { params } = req;
            const trails = [];
            let namesCourse = '';
            let canCreateClass = true;
            let isEC = false;
            let isInstructorStore = false;

            const user = await getUserByToken(req);
            const course = await CourseModel.findById(params.courseID).populate({
                path: 'groups',
                select: ['trails', 'office', 'tags'],
            });
            const groupEC = await Group.find({
                name: 'GL_ACADMODA_EC_LIDERTREINADOR',
            });
            if (
                user.groupsAD.includes('GL_ACADMODA_EC_LIDERTREINADOR') &&
                groupEC[0].active === 1
            ) {
                isEC = true;
            }

            const groupLJ = await Group.find({
                name: 'GL_ACADMODA_LJ_LIDERTREINADOR',
            });
            if (
                user.groupsAD.includes('GL_ACADMODA_LJ_LIDERTREINADOR') &&
                groupLJ[0].active === 1
            ) {
                isInstructorStore = true;
            }

            if (
                user.groupsAD.includes('GL_ACADMODA_EC_LIDERTREINADOR') &&
                user.groupsAD.includes('GL_ACADMODA_LJ_LIDERTREINADOR') &&
                groupEC[0].active === 1
            ) {
                isEC = true;
                isInstructorStore = true;
            }

            if (isInstructorStore) {
                // isEC = false
                const arrCompletions = [];

                for (const trail of course.groups.trails) {
                    trails.push(trail);
                }

                for (const t of trails) {
                    const trail = await Trail.findById(t);

                    for (const i of trail.items) {
                        const completion = await checkItemCompleted(i, user);
                        i.completion = completion;
                    }

                    trail.completion = getTrailCompletion(trail);
                    arrCompletions.push(trail.completion);

                    if (trail.completion !== 1) {
                        namesCourse += ',' + trail.title;
                    }
                }

                if (arrCompletions.includes(null) || arrCompletions.includes(0)) {
                    canCreateClass = false;
                }
            }

            if (canCreateClass) {
                success(res, req, {
                    isEC,
                });
            } else {
                badRequest(
                    res,
                    req,
                    'O instrutor não completou todas as trilhas',
                    `Para acessar a criação da turma as trilhas ${namesCourse} devem ser concluídas.`,
                    'courses',
                    'createClass'
                );
            }
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/verifyInstructor'
            );
        }
    },

    async joinWaitList (req, res) {
        try {
            let { body } = req;
            const user = await getUserByToken(req);
            const alreadyJoined = await WaitListModel.findOne({
                userID: body.userID,
                courseID: body.courseID,
                sent: false,
            });

            if (alreadyJoined) {
                return badRequest(
                    res,
                    req,
                    `O usuário ${user.name} já está na lista de espera deste curso.`,
                    `O usuário ${user.name} já está na lista de espera deste curso.`,
                    'courses',
                    'joinWaitList'
                );
            }

            body.joinDate = new Date();

            const waitList = await WaitListModel.create(body);
            return success(res, req, waitList);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'waitlist',
                '/waitlist-join'
            );
        }
    },

    async getWaitListByUser (req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const query = searchBy
                ? {
                    $or: [
                        { 'user.name': { $regex: searchBy, $options: 'i' } },
                        {
                            'course.title': {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                    ],
                }
                : {};

            const total = await WaitListsByUser.find(query).countDocuments();

            const data = await WaitListsByUser.find(query)
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            success(res, req, { data, total });
        } catch (error) {
            console.log(error);
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseByQrCode'
            );
        }
    },

    async getWaitListByCourse (req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const query = searchBy
                ? {
                    $or: [
                        {
                            'course.title': {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                    ],
                }
                : {};

            const total = await WaitListsByCourses.find(query).countDocuments();

            const data = await WaitListsByCourses.find(query)
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            success(res, req, { data, total });
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseByQrCode'
            );
        }
    },

    async getWaitlistAndElegibleUsersByCourse (req, res) {
        try {
            const courseId = req.query.courseId;
            const elegibleUsers = [];
            const waitlistUsers = await WaitListsByCourses.findOne({
                _id: courseId,
                sent: false,
            }).select('users');
            // console.log('waitlistUsers', waitlistUsers);
            const foundClass = await ClassModel.findOne({
                courseID: courseId,
            }).populate('courseID', ['title', 'tags', 'passingScore']);

            const foundCourse = await CourseModel.findOne({ _id: courseId });

            const tags = foundCourse.tags.map((e) => e.value);

            // const usersWithMandatoryTags = await UsersWithProcessedTags.find({
            //     userTags: { $all: mandatoryTags },
            // });
            const usersWithTags = await UsersWithProcessedTags.find({
                userTags: { $in: tags },
            });

            // const users = usersWithMandatoryTags.concat(usersWithTags);
            for (let user of usersWithTags) {
                let userInClass;
                if (foundClass) {
                    userInClass = foundClass.users.find((u) => u.userID == user._id);
                }
                if (userInClass) {
                    if (userInClass.grades < foundClass.courseID.passingScore) {
                        elegibleUsers.push({
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                        });
                    }
                } else {
                    elegibleUsers.push({
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                    });
                }
            }

            const elegibleUsersTotal = elegibleUsers ? elegibleUsers.length : 0;
            const waitlistUsersTotal = waitlistUsers ? waitlistUsers.users.length : 0;

            success(res, req, {
                waitlistUsers,
                waitlistUsersTotal,
                elegibleUsers,
                elegibleUsersTotal,
            });
        } catch (error) {
            console.log(error);
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'courses',
                '/getCourseByQrCode'
            );
        }
    },

    /**
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    async importAttendanceList (req, res) {
        const file = req.files?.file;
        const { courseId, classId } = req.params;

        if (!file) {
            return badRequest(
                res,
                req,
                'Arquivo não enviado',
                'Arquivo não enviado',
                'courses',
                '/import-attendance-list'
            );
        }

        try {
            console.time('importAttendanceList - READING FILE');
            const { data, labels, labelMap, worksheet, workbook } = await readXLSXAttendanceList(
                file.path,
                'Sua Carga Aqui'
            );
            console.timeEnd('importAttendanceList - READING FILE');

            if (Object.keys(labelMap).some((label) => !labels.includes(label))) {
                return badRequest(
                    res,
                    req,
                    'Arquivo inválido',
                    'Arquivo inválido',
                    'courses',
                    '/import-attendance-list'
                );
            }

            const { results } = await processAttendanceListImport(courseId, classId, data);

            results.forEach((item) => {
                const row = worksheet.getRow(item.rowNumber);
                const cell = row.getCell(labels.length);
                if (item.message) cell.value = item.message;
            });

            res.set({
                'Content-Disposition': `attachment; filename="${file.name}_results.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            await workbook.xlsx.write(res);

            res.end();
        } catch (error) {
            console.error(error);
            return internalServer(
                res,
                req,
                error.message,
                error.message,
                'courses',
                '/import-attendance-list'
            );
        }
    },

    async historicByUser (req, res) {
        try {
            const userId = req.params.userId;
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;
            const classesFromUser = await ClassModel.find({
                $or: [
                    { 'users.userID': userId },
                    { 'users._id': userId },
                    { 'users._id': mongoose.Types.ObjectId(userId) }
                ]
            }).select({
                courseID: 1,
                users: 1,
                dateApplicationInitial: 1,
                dateApplicationFinal: 1,
                name: 1,
            })

            let query = {
                deleted: { $eq: 0 },
                status: { $eq: 1 },
                _id: { $in: classesFromUser.map(c => c.courseID) }
            }

            if (searchBy) {
                query = {
                    ...query,
                    $or: [
                        {
                            title: {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                    ],
                }
            }

            const total = await CourseModel.find(query).countDocuments();

            const data = await CourseModel.find(query)
                .select({
                    title: 1,
                    passingScore: 1,
                    certificate: 1,
                    certificateLayout: 1,
                    certificateDue: 1,
                    workload: 1,
                    dateFinal: 1,
                    dateInitial: 1
                }).lean()
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));


            success(res, req, {
                data: enrichCoursesWithClasses(data, classesFromUser, userId),
                total
            });

        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'list historic courses by user',
                '/getCourseByQrCode'
            );
        }

    },

    async removeUserClass (req, res) {
        try {
            const { classeId, userId } = req.params;
            const classUpdated = await ClassModel.findOneAndUpdate(
                { _id: classeId },
                {
                    $pull: {
                        users: { _id: userId }
                    }
                },
                { new: true }
            );

            success(res, req, classUpdated);
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'remove user from class',
                '/removeUserClass'
            );
        }
    }

};

async function createMessagesFromBackend (body) {
    try {
        const campaign = body;
        const target = campaign.target;
        let targetUsers = [];

        if (!target.value.user) {
            targetUsers = await processTargetUsers(target, campaign.category);
        } else {
            targetUsers.push({ ...target.value.user });
        }

        await sendMessageToKafka(campaign, targetUsers);
    } catch (error) {
        console.log(error);
    }
}
