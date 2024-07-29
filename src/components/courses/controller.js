const { User, groups } = require('../users/model');
const mongoose = require('mongoose');

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
    WaitListModel
} = require('./model');

const { DOMAIN, AZURE_BLOB_URL } = process.env;

const { azureBlob } = require('../../utils/files');

const { Group, InstructorGroup } = require('../groups/model');

const { Trail } = require('../trails/model');

const { internalServer, success, badRequest } = require('../../utils/messages');

const {
    pagination,
    ordernation,
    getUserByToken,
    formatDateWithoutHours,
    addHours,
    checksIfTheEndDateIsLessThanTheStartDate,
} = require('../../utils/functions');

const {
    uploadMaterial,
    verifyValidity,
    queryInstructorCourses,
    getStoreUSers,
    getAppliedCourses,
    getClassByID,
    returnProgramaID,
    checkEligibility,
} = require('./business');

const {
    checkItemCompleted,
    getTrailCompletion,
    getTagsElegiblesByToken,
    getTagsElegibles,
} = require('../sections/business');

module.exports = {
    async createCourse(req, res) {
        try {
            const materials = JSON.parse(req.fields.materials);
            const files = req.files;
            const body = req.fields;
            const arrMaterials = [];
            let flagDate = true;
            body.tags = JSON.parse(body.tags);
            body.mandatory = JSON.parse(body.mandatory);
            body.certificateDue = JSON.parse(body.certificateDue);
            const dateInitialCourse = formatDateWithoutHours(
                addHours(body.dateInitial)
            );
            const dataFinalCourse = formatDateWithoutHours(
                addHours(body.dateFinal)
            );

            let thumbPath;
            const { thumb } = req.files;
            if (thumb) {
                thumbPath = await azureBlob(thumb, 'items/thumbs');
                body.thumbPath = thumbPath.replace(AZURE_BLOB_URL, DOMAIN);
            }

            if (!body.passingScore || body.passingScore === 'null')
                delete body.passingScore;
            if (!body.certificateLayout || body.certificateLayout === 'null')
                delete body.certificateLayout;
            if (dateInitialCourse > dataFinalCourse) flagDate = false;

            if (flagDate) {
                if (body.isEvaluationAvailable) {
                    body.isEvaluationAvailable =
                        body.isEvaluationAvailable == 'true';
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

                    body.dateInitial = formatDateWithoutHours(body.dateInitial);
                    if (body.dateFinal) {
                        body.dateFinal = formatDateWithoutHours(body.dateFinal);
                    }
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

    async allCourses(req, res) {
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

            // courses.map((course) => {
            //     course.dateInitial = addHours(course.dateInitial);
            //     course.dateFinal = addHours(course.dateFinal);
            // });

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

    async updateCourse(req, res) {
        try {
            const materials = req.fields.materials ? JSON.parse(req.fields.materials) : null;
            const body = req.fields;
            const arrMaterials = [];
            const files = req.files;
            let flagDate = true;
            body.tags = JSON.parse(body.tags);
            body.mandatory = JSON.parse(body.mandatory);
            body.certificateDue = JSON.parse(body.certificateDue);


            let thumbPath;
            const { thumb } = req.files;
            if (thumb) {
                thumbPath = await azureBlob(thumb, 'items/thumbs');
                body.thumbPath = thumbPath.replace(AZURE_BLOB_URL, DOMAIN);
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
                    body.isEvaluationAvailable =
                        body.isEvaluationAvailable == 'true';
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
                    body.materials =
                        currentCourse.materials.concat(arrMaterials);

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
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                '/updateCourse'
            );
        }
    },

    async deleteCourse(req, res) {
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

    async instructorAllCourses(req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;
            let arrCoursesFinal;

            const user = await getUserByToken(req);

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

    async getCourseById(req, res) {
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

    async getUsers(req, res) {
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

    async createClass(req, res) {
        try {
            let {
                courseID,
                users,
                dateApplicationInitial,
                dateApplicationFinal,
                instructor,
                instructorTemp,
                qrCode,
                qrCodeSelfRegistration,
                isSelfRegistrationEnabled,
                limit,
                location,
                costs,
                name
            } = req.fields;
            let flagDate = true;
            const costsArray = costs ? JSON.parse(costs) : null;
            if (dateApplicationInitial || dateApplicationFinal) {
                if (dateApplicationInitial && dateApplicationFinal === '') {
                    flagDate = true;
                } else {
                    const dateInitialAPP = formatDateWithoutHours(
                        addHours(dateApplicationInitial)
                    );
                    const dateFinalAPP = formatDateWithoutHours(
                        addHours(dateApplicationFinal)
                    );

                    if (dateInitialAPP > dateFinalAPP) flagDate = false;
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
                const trails = [];
                let namesCourse = '';
                let canCreateClass = true;
                let user = await getUserByToken(req);
                let instructorID = user.id;
                const course = await CourseModel.findById(courseID).populate({
                    path: 'groups',
                    select: 'trails',
                });

                if (canCreateClass) {
                    const dateInitial = formatDateWithoutHours(
                        addHours(course.dateInitial)
                    );
                    const dateFinal = formatDateWithoutHours(
                        addHours(course.dateFinal)
                    );
                    const applicationInitial = formatDateWithoutHours(
                        dateApplicationInitial
                    );
                    const applicationFinal =
                        formatDateWithoutHours(dateApplicationFinal);

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
                        const createdClass = await ClassModel.create({
                            courseID,
                            users: JSON.parse(users),
                            instructor: instructorID,
                            qrcode: req.body.qrCode,
                            materials: arrMaterials,
                            dateApplicationInitial,
                            dateApplicationFinal,
                            canCreateClass,
                            instructorTemp,
                            qrcode: qrCode,
                            qrCodeSelfRegistration: qrCodeSelfRegistration,
                            isSelfRegistrationEnabled:
                                isSelfRegistrationEnabled,
                            limit,
                            location,
                            costs: costsArray,
                            name
                        });

                        const classesFromCourse = await ClassModel.find({
                            courseID
                        })
            
                        for(let user of users){
                            console.log(user)
                            const removalPromises = classesFromCourse.map(classFromCourse => {
                                const inClass = classFromCourse.users.some((u) => u._id == user._id || u.userID == user._id)
                
                                if (classFromCourse._id.equals(createdClass._id) || !inClass) {
                                    return Promise.resolve();
                                }
                
                                return ClassModel.findOneAndUpdate(
                                    { _id: classFromCourse._id },
                                    { $pull: { users: { _id: user._id } } }
                                );
                            });
                
                            await Promise.all(removalPromises);
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
            console.log(error)
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

    async updateClass(req, res) {
        try {
            let {
                courseID,
                users,
                classID,
                qrCode,
                instructor,
                instructorTemp,
                dateApplicationInitial,
                dateApplicationFinal,
                qrCodeSelfRegistration,
                isSelfRegistrationEnabled,
                limit,
                location,
                costs,
                name
            } = req.fields;
            const materials = JSON.parse(req.fields.materials);
            const costsArray = JSON.parse(costs);
            const files = req.files;
            const user = await getUserByToken(req);
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
                if (!instructor) {
                    instructor = user._id;
                }

                const course = await CourseModel.findById(courseID).populate({
                    path: 'groups',
                    select: 'trails',
                });

                if (course.deleted === 0 && course.status === 1) {
                    const dateInitial = formatDateWithoutHours(
                        addHours(course.dateInitial)
                    );
                    const dateFinal = formatDateWithoutHours(
                        addHours(course.dateFinal)
                    );
                    const applicationInitial = formatDateWithoutHours(
                        dateApplicationInitial
                    );
                    const applicationFinal =
                        formatDateWithoutHours(dateApplicationFinal);

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

                    await ClassModel.findByIdAndUpdate(classID, {
                        courseID,
                        users: JSON.parse(users),
                        instructor,
                        instructorTemp,
                        // instructor: user._id,
                        materials: arrMaterials,
                        qrcode: qrCode,
                        qrCodeSelfRegistration: qrCodeSelfRegistration,
                        isSelfRegistrationEnabled: isSelfRegistrationEnabled,
                        dateApplicationInitial,
                        dateApplicationFinal,
                        limit,
                        location,
                        costs: costsArray,
                        name
                    });
                    
                    const classesFromCourse = await ClassModel.find({
                        courseID
                    })
        
                    for(let user of users){
                        console.log(user)
                        const removalPromises = classesFromCourse.map(classFromCourse => {
                            const inClass = classFromCourse.users.some((u) => u._id == user._id || u.userID == user._id)
            
                            if (classFromCourse._id.equals(classID) || !inClass) {
                                return Promise.resolve();
                            }
            
                            return ClassModel.findOneAndUpdate(
                                { _id: classFromCourse._id },
                                { $pull: { users: { _id: user._id } } }
                            );
                        });
            
                        await Promise.all(removalPromises);
                    }

                    success(res, req, 'Atualizado com sucesso!');
                } else {
                    badRequest(
                        res,
                        req,
                        'O curso não pode ser atualizado, porque está inativado!',
                        'O curso não pode ser atualizado, porque está inativado!',
                        'courses',
                        '/createClass'
                    );
                }
            }
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

    async appliedCourses(req, res) {
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

    async appliedCourse(req, res) {
        try {
            const { courseID, classID } = req.params;
            const course = await CourseModel.findById(courseID)
                .populate('materials')
                .populate('program', 'title');

            const classUsers = await getClassByID(classID);


            course.dateInitial = addHours(course.dateInitial);
            course.dateFinal = addHours(course.dateFinal);

            success(res, req, {
                course,
                classUsers,
            });
        } catch (error) {
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

    async deleteMaterial(req, res) {
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

    async deleteMaterialCourse(req, res) {
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

    async searchUser(req, res) {
        try {
            const { searchBy } = req.query;
            let { usersInClass } = req.body;
            const { skip, limit } = pagination(req);
            const { id } = req.params;
            usersInClass = usersInClass.map(userID => mongoose.Types.ObjectId(userID))
            const query = { $and: [{ _id: id }, { 'user.status': 'ATIVO' }, { 'user._id': { $nin: usersInClass } }] };
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

            const total = await CoursesWithTagsAndUsers.find(
                query
            ).countDocuments();

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

    async deleteClass(req, res) {
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

    async courseEvaluation(req, res) {
        try {
            const { classID, answers } = req.body;
            const student = await getUserByToken(req);
            const { users } = await ClassModel.findById(classID);
            const filterUser = users.filter(
                (user) => (user.userID || user._id) === student.id
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

    async verifyCourseEvaluation(req, res) {
        try {
            const { classID } = req.params;
            const student = await getUserByToken(req);
            const { users } = await ClassModel.findById(classID);
            const filterUser = users.filter(
                (user) => (user.userID === student.id || user._id === student.id) && user.presence
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

    async getCourseEvaluations(req, res) {
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

    async getCourseByQrCode(req, res) {
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

    async getCourseByQrCodeSelfRegistration(req, res) {
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

            const eligibility = checkEligibility(
                tags,
                course.courseID.mandatory,
                course.courseID.tags
            );

            if (!eligibility)
                return badRequest(
                    res,
                    req,
                    'O aluno não está elegivel a este treinemento',
                    'Atenção! Você não está elegivel a este treinemento.',
                    'courses',
                    '/getCourseByQrCodeSelfRegistration'
                );

            const user = course.users.find((user) => user._id == _id)
            success(res, req, {
                title: course.courseID.title, inClass: user ? true : false, _id: course._id, registered: user?.presence
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

    async getCourseDetailByQrCode(req, res) {
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

    async selfRegistration(req, res) {
        try {
            const { body } = req;
            const user = await getUserByToken(req);

            var userID = String(user._id);

            const course = await ClassModel.findOneAndUpdate(
                {
                    _id: { $eq: body.qrcode },
                    'users._id': userID
                },
                {
                    $set: {
                        'users.$.presence': true,
                        'users.$.device': body.browser,
                        'users.$.browser': body.device,
                        'users.$.origin': 'QRCODE'
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

    async listJoin(req, res) {
        try {
            const { body } = req;
            const user = await getUserByToken(req);

            var userID = String(user._id);

            const course = await ClassModel.findOneAndUpdate(
                {
                    _id: body.classesID,
                    $or: [{ 'users._id': { $ne: userID } }, { 'users.userID': { $ne: userID } }]
                },
                {
                    $addToSet: {
                        users: {
                            _id: userID,
                            presence: false,
                            grades: 0,
                            name: user.name,
                            registration: user.registration
                        }
                    }
                },
                { new: true }
            );


            const classesFromCourse = await ClassModel.find({
                courseID: course.courseID
            })

            const removalPromises = classesFromCourse.map(classFromCourse => {
                const inClass = classFromCourse.users.some((u) => u._id == user._id || u.userID == user._id)

                if (classFromCourse._id.equals(body.classesID) || !inClass) {
                    return Promise.resolve();
                }

                return ClassModel.findOneAndUpdate(
                    { _id: classFromCourse._id },
                    { $pull: { users: { _id: userID } } }
                );
            });

            await Promise.all(removalPromises);

            //notificar usuario
            // const message = {
            //     category: 'notify',
            //     communication: ['notification', 'email'],
            //     mode: 'manual',
            //     target: {
            //         type: 'users',
            //         value: {
            //             users: [item.responsible],
            //         },
            //     },
            //     text: `O item ${item.title} perderá a validade em ${diffDays} dias!\n`,
            //     textHtml: `<p>O item ${item.title} perderá a validade em ${diffDays} dias!<p>`,
            //     thumbnail: config.messenger.emailTemplate.thumbnail,
            //     title: `${item.title}`,
            // }
            // createMessagesFromBackend(message)

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
    async getInstructorByInstructorGroup(req, res) {
        try {
            const { params } = req;
            const tags = [];
            const usersFilter = [];
            const groups = [];

            const course = await CourseModel.findById(
                params.courseID,
                'groups'
            ).populate('groups', 'tags');

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

    async verifyInstructor(req, res) {
        try {
            const { params } = req;
            const trails = [];
            let namesCourse = '';
            let canCreateClass = true;
            let isEC = false;
            let isInstructorStore = false;

            const user = await getUserByToken(req);
            const course = await CourseModel.findById(params.courseID).populate(
                {
                    path: 'groups',
                    select: ['trails', 'office', 'tags'],
                }
            );
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

                if (
                    arrCompletions.includes(null) ||
                    arrCompletions.includes(0)
                ) {
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

    async joinWaitList(req, res) {
        try {
            let { body } = req;
            const alreadyJoined = await WaitListModel.findOne({
                userID: body.userID,
                courseID: body.courseID,
                sent: false
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

    async getWaitListByUser(req, res) {
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

    async getWaitListByCourse(req, res) {
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

    async getWaitlistAndElegibleUsersByCourse(req, res) {
        try {
            const courseId = req.query.courseId;
            const elegibleUsers = [];
            const waitlistUsers = await WaitListsByCourses.findOne({ _id: courseId, sent: false }).select('users');
            console.log("waitlistUsers", waitlistUsers)
            const foundClass = await ClassModel.findOne({
                courseID: courseId,
            }).populate('courseID', [
                'title',
                'tags',
                'passingScore',
            ]);

            const foundCourse = await CourseModel.findOne({ _id: courseId })

            const tags = foundCourse.tags.map((e) => e.value);
            const mandatoryTags = foundCourse.mandatory.map(
                (e) => e.value
            );

            // const usersWithMandatoryTags = await UsersWithProcessedTags.find({
            //     userTags: { $all: mandatoryTags },
            // });
            const usersWithTags = await UsersWithProcessedTags.find({
                userTags: { $in: tags },
            });

            // const users = usersWithMandatoryTags.concat(usersWithTags);
            for (let user of usersWithTags) {
                let userInClass
                if (foundClass) {
                    userInClass = foundClass.users.find(
                        (u) => u.userID == user._id
                    );
                }
                if (userInClass) {
                    if (
                        userInClass.grades <
                        foundClass.courseID.passingScore
                    ) {
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
            const waitlistUsersTotal = waitlistUsers
                ? waitlistUsers.users.length
                : 0;

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
};
