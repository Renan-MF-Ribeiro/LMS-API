const { User } = require('../users/model');
const mongoose = require('mongoose');
const config = require('../../../config.json');
const {
    CourseModel,
    ClassModel,
    MaterialModel,
    ProgramModel,
    CourseEvaluationModel,
    CoursesWithTagsAndUsers,
    WaitListsByUser,
    WaitListsByCourses,
    UsersWithProcessedTags,
    WaitListModel,
} = require('./model');
const moment = require('moment-timezone');
const { DOMAIN, AZURE_BLOB_URL } = process.env;

const { azureBlob, readXLSXAttendanceList } = require('../../utils/files');

const { Group } = require('../groups/model');

const { Trail } = require('../trails/model');

const { sendMessageToKafka, processTargetUsers } = require('../new-messages/business');

const { internalServer, success, badRequest } = require('../../utils/messages');

const { pagination, ordernation, getUserByToken } = require('../../utils/functions');

const {
    uploadMaterial,
    getStoreUSers,
    getAppliedCourses,
    getClassByID,
    returnProgramaID,
    processAttendanceListImport,
} = require('./business');

const {
    checkItemCompleted,
    getTrailCompletion,
    getTagsElegiblesByToken,
    checkEligibilityTagsAnd,
} = require('../sections/business');
const { default: axios } = require('axios');

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
            body.certificateDue = JSON.parse(body.certificateDue);

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

    async updateCourse (req, res) {
        try {
            const materials = req.fields.materials ? JSON.parse(req.fields.materials) : null;
            const body = req.fields;
            const arrMaterials = [];
            const files = req.files;
            let flagDate = true;
            body.tags = JSON.parse(body.tags);
            body.dimensions = JSON.parse(body.dimensions);
            body.mandatory = JSON.parse(body.mandatory);
            body.certificateDue = JSON.parse(body.certificateDue);


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
                body.certificateLayout = null;

            if (body.dateInitial > body.dateFinal) flagDate = false;

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

            const courses = await CourseModel.find(
                searchBy
                    ? {
                        title: { $regex: '' || searchBy, $options: 'i' },
                        deleted: 0,
                        status: 1,
                    }
                    : {
                        deleted: 0,
                        status: 1,
                    }
            )
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
                total: arrCoursesFinal.length,
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
            const course = await CourseModel.findById(id).populate('materials');
            success(res, req, course);
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
                dateApplicationInitial,
                dateApplicationFinal,
                minister,
                requester,
                qrCode,
                qrCodeSelfRegistration,
                isSelfRegistrationEnabled,
                limit,
                location,
                costs,
                name,
                signup,
            } = req.fields;
            let flagDate = true;

            const costsArray = costs ? JSON.parse(costs) : null;
            if (dateApplicationInitial || dateApplicationFinal) {
                if (dateApplicationInitial && dateApplicationFinal === '') {
                    flagDate = true;
                } else if (dateApplicationInitial > dateApplicationFinal) {
                    flagDate = false;
                }
            }

            if (!flagDate) {
                badRequest(
                    res,
                    req,
                    'A data final da aplicação tem que ser maior que a inicial!',
                    'A data final da aplicação tem que ser maior que a inicial!',
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
                    const dateInitial = moment(course.dateInitial).startOf('day').toDate();
                    const dateFinal = moment(course.dateFinal).endOf('day').toDate();
                    const applicationInitial = new Date(dateApplicationInitial);
                    const applicationFinal = new Date(dateApplicationFinal);
                    if (
                        applicationInitial &&
                        (applicationInitial < dateInitial ||
                            applicationInitial > dateFinal ||
                            applicationFinal < dateInitial ||
                            applicationFinal > dateFinal)
                    ) {
                        badRequest(
                            res,
                            req,
                            '',
                            'Atenção, a data deve corresponder ao período de início e fim do curso!',
                            'courses',
                            '/createClass'
                        );
                        return;
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
                            qrcode: req.body.qrCode,
                            materials: arrMaterials,
                            dateApplicationInitial,
                            dateApplicationFinal,
                            canCreateClass,
                            qrcode: qrCode,
                            qrCodeSelfRegistration: qrCodeSelfRegistration,
                            isSelfRegistrationEnabled: isSelfRegistrationEnabled,
                            limit,
                            location,
                            costs: costsArray,
                            name,
                            signup,
                        });

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

                        const message = {
                            category: 'notify',
                            communication: ['notification', 'email'],
                            mode: 'manual',
                            target: {
                                type: 'users',
                                value: {
                                    users: arrUserId,
                                },
                            },
                            text: `Você está na turma presencial ${name}!\n O local do treinamento será em: ${location}`,
                            textHtml: `<p>Você está na turma presencial ${name}!</p> <p>O local do treinamento será em: ${location}</p>`,
                            thumbnail: config.messenger.emailTemplate.thumbnail,
                            title: `Treinamentos Presenciais: ${name}`,
                        };
                        await createMessagesFromBackend(message);

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
                qrCode,
                minister,
                requester,
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
                    if (dateApplicationInitial > dateApplicationFinal) flagDate = false;
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
                    const dateInitial = moment(course.dateInitial).startOf('day').toDate();
                    const dateFinal = moment(course.dateFinal).endOf('day').toDate();
                    const applicationInitial = new Date(dateApplicationInitial);
                    const applicationFinal = new Date(dateApplicationFinal);
                    if (
                        applicationInitial &&
                        (applicationInitial < dateInitial ||
                            applicationInitial > dateFinal ||
                            applicationFinal < dateInitial ||
                            applicationFinal > dateFinal)
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

                    // Atualiza classe e usuários
                    await ClassModel.findByIdAndUpdate(classID, {
                        courseID,
                        instructor: instructorID,
                        requester,
                        minister,
                        materials: arrMaterials,
                        qrcode: qrCode,
                        qrCodeSelfRegistration: qrCodeSelfRegistration,
                        isSelfRegistrationEnabled: isSelfRegistrationEnabled,
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
                    });

                    // Adiciona usuários
                    if (addedUsers.length) {
                        await ClassModel.findByIdAndUpdate(classID, {
                            $push: { users: { $each: addedUsers } },
                        });

                        // Dispara notificações para usuários adicionados
                        const arrUserId = addedUsers.map((user) => user._id);

                        const message = {
                            category: 'notify',
                            communication: ['notification', 'email'],
                            mode: 'manual',
                            target: {
                                type: 'users',
                                value: {
                                    users: arrUserId,
                                },
                            },
                            text: `Você está na turma presencial ${name}!\n O local do treinamento será em: ${location} `,
                            textHtml: `<p>Você está na turma presencial ${name}!</p> <p>O local do treinamento será em: ${location}</p>`,
                            thumbnail: config.messenger.emailTemplate.thumbnail,
                            title: `Treinamentos Presenciais: ${name}`,
                        };

                        await createMessagesFromBackend(message);
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
            const classUsers = await getClassByID(classId);

            const { data } = await axios.post(
                `${process.env.API_PDF_PRINTER}/attendance-list`,
                {
                    courseName: course.title ?? ' ',
                    startDate: course.dateInitial
                        ? moment(course.dateInitial)
                            .locale('pt-BR')
                            .format('DD [de] MMMM [de] YYYY - HH:mm[h]')
                        : ' ',
                    endDate: course.dateFinal
                        ? moment(course.dateFinal)
                            .locale('pt-BR')
                            .format('DD [de] MMMM [de] YYYY - HH:mm[h]')
                        : ' ',
                    instructor: classUsers.instructor?.name ?? ' ',
                    attendances: classUsers.users
                        .filter((user) => (onlyPresenceFlag ? !!user.presence : true))
                        .map((user) => ({
                            userName: user.name ?? ' ',
                            networkLogin: user.registration ?? ' ',
                            attendance: user.presence ?? false,
                            attendanceDate: user.presenceAt
                                ? moment(user.presenceAt).format('DD/MM/YYYY')
                                : ' ',
                            attendanceType: user.origin
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
            const query = {
                $and: [
                    { _id: id },
                    { 'user.status': { $regex: 'ATIVO', $options: 'i' } },
                    { 'user._id': { $nin: usersInClass } },
                ],
            };
            if (searchBy) {
                query.$and.push({
                    $or: [
                        { 'user.name': { $regex: searchBy, $options: 'i' } },
                        {
                            'user.networkLogin': {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                        {
                            'user.registration': {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                    ],
                });
            }

            const users = (
                await CoursesWithTagsAndUsers.find(query)
                    .skip(parseInt(skip))
                    .limit(parseInt(limit))
                    .sort({ 'user.name': 1 })
            ).map((result) => result.user);

            const total = await CoursesWithTagsAndUsers.find(query).countDocuments();

            success(res, req, { data: users, total });
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
                    'Atenção! Você não pode responder essa avaliação.',
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
                        'Atenção! Você já respondeu essa avaliação.',
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
                    'Atenção! Você não pode responder essa avaliação.',
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
            const { _id } = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            const course = await ClassModel.findOne({
                qrCodeSelfRegistration: { $eq: body.qrcode },
            }).populate('courseID', ['title', 'tags', 'mandatory']);

            if (!course)
                return badRequest(
                    res,
                    req,
                    'Turma indisponível.',
                    'Turma indisponível.',
                    'courses',
                    '/getCourseByQrCodeSelfRegistration'
                );

            const applicationInitial = new Date(course.dateApplicationInitial);
            const applicationFinal = new Date(course.dateApplicationFinal);
            const applicationEndDay = moment(applicationFinal).endOf('day').toDate();
            const today = new Date();

            if (applicationInitial > today || applicationEndDay < today) {
                return badRequest(
                    res,
                    req,
                    'Turma indisponível.',
                    'Turma indisponível.',
                    'courses',
                    '/getCourseByQrCodeSelfRegistration'
                );
            }

            const eligibility = checkEligibilityTagsAnd(
                tags ?? [],
                course.courseID?.mandatory ?? [],
                course.courseID?.tags ?? []
            );

            if (!eligibility)
                return badRequest(
                    res,
                    req,
                    'O aluno não está elegível a este treinamento',
                    'Atenção! Você não está elegível a este treinamento.',
                    'courses',
                    '/getCourseByQrCodeSelfRegistration'
                );

            let user = course.users.find((user) => String(user._id) === String(_id));

            if (!user) {
                if (course.signup) {
                    const student = await getUserByToken(req);

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

                    await ClassModel.findOneAndUpdate(
                        { _id: course._id },
                        { $addToSet: { users: studentRegister } }
                    );
                    user = studentRegister;
                }
            }
            return success(res, req, {
                title: course.courseID.title,
                inClass: !!user,
                _id: course._id,
                registered: user?.presence,
            });
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

    async getCourseDetailByQrCode (req, res) {
        try {
            const { body } = req;
            const course = await CourseModel.findOne({
                qrCode: { $eq: body.qrcode },
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

            var userID = String(user._id);

            let course = null;
            course = await ClassModel.findOneAndUpdate(
                {
                    _id: body.classesID,
                    'users._id': { $ne: userID },
                    'users.userID': { $ne: userID },
                },
                {
                    $addToSet: {
                        users: {
                            _id: userID,
                            presence: false,
                            grades: 0,
                            name: user.name,
                            registration: user.registration,
                            createdAt: moment().utc().format(),
                            origin: 'user',
                        },
                    },
                },
                { new: true }
            );

            if (!course) {
                course = await ClassModel.findOne({ _id: body.classesID });
            }

            const classesFromCourse = await ClassModel.find({
                courseID: course.courseID,
            });

            const removalPromises = classesFromCourse.map((classFromCourse) => {
                const inClass = classFromCourse.users.some(
                    (u) => u._id == user._id || u.userID == user._id
                );

                if (classFromCourse._id.equals(body.classesID) || !inClass) {
                    return Promise.resolve();
                }
                //SÓ REMOVER SE PRESENCE FOR FALSE

                return ClassModel.findOneAndUpdate(
                    { _id: classFromCourse._id },
                    { $pull: { users: { _id: userID, presence: false } } }
                );
            });

            await Promise.all(removalPromises);

            const message = {
                category: 'notify',
                communication: ['notification', 'email'],
                mode: 'manual',
                target: {
                    type: 'users',
                    value: {
                        users: [userID],
                    },
                },
                text: `Você está na turma presencial ${course.name}!\n O local do treinamento será em: ${course.location}`,
                textHtml: `<p>Você está na turma presencial ${course.name}!</p> <p>O local do treinamento será em: ${course.location}</p>`,
                thumbnail: config.messenger.emailTemplate.thumbnail,
                title: `Treinamentos Presenciais: ${course.name}`,
            };
            await createMessagesFromBackend(message);

            success(res, req, course);
        } catch (error) {
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
                    `Para acessar a criação da turma você deve concluir as trilhas ${namesCourse}`,
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
            const alreadyJoined = await WaitListModel.findOne({
                userID: body.userID,
                courseID: body.courseID,
                sent: false,
            });

            if (alreadyJoined) {
                return badRequest(
                    res,
                    req,
                    'Você já está na lista de espera deste curso',
                    `Você já está na lista de espera deste curso`,
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
            console.log('waitlistUsers', waitlistUsers);
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
