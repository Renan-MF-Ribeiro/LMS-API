const { User } = require('../users/model');

const {
    CourseModel,
    ClassModel,
    MaterialModel,
    CourseEvaluationModel,
} = require('./model');

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
} = require('./business');

const {
    checkItemCompleted,
    getTrailCompletion,
} = require('../sections/business');

module.exports = {
    async createCourse(req, res) {
        try {
            const materials = req.files.materials;
            const body = req.fields;
            const arrMaterials = [];
            let flagDate = true;
            body.tags = JSON.parse(body.tags);

            const dateInitialCourse = formatDateWithoutHours(
                addHours(body.dateInitial)
            );
            const dataFinalCourse = formatDateWithoutHours(
                addHours(body.dateFinal)
            );

            if (!body.passingScore || body.passingScore === 'null')
                delete body.passingScore;
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
                    body.dateInitial = formatDateWithoutHours(body.dateInitial);
                    if (body.dateFinal) {
                        body.dateFinal = formatDateWithoutHours(body.dateFinal);
                    }

                    const courseCreated = await CourseModel.create(body);

                    if (materials) {
                        if (!materials.length) {
                            const materialID = await uploadMaterial(
                                materials,
                                'CONTEUDISTA',
                                `courses/${courseCreated._id}/materials`
                            );
                            arrMaterials.push(materialID);
                        } else {
                            for (const material of materials) {
                                const materialID = await uploadMaterial(
                                    material,
                                    'CONTEUDISTA',
                                    `courses/${courseCreated._id}/materials`
                                );
                                arrMaterials.push(materialID);
                            }
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
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            courses.map((course) => {
                course.dateInitial = addHours(course.dateInitial);
                course.dateFinal = addHours(course.dateFinal);
            });

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
                '/courses'
            );
        }
    },

    async updateCourse(req, res) {
        try {
            const materials = req.files.materials;
            const body = req.fields;
            const arrMaterials = [];
            let flagDate = true;
            body.tags = JSON.parse(body.tags);

            const dateInitialCourse = formatDateWithoutHours(
                addHours(body.dateInitial)
            );
            const dataFinalCourse = formatDateWithoutHours(
                addHours(body.dateFinal)
            );

            if (!body.passingScore || body.passingScore === 'null')
                body.passingScore = null;

            if (dateInitialCourse > dataFinalCourse) flagDate = false;

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
                // if(body.passingScore === "null") {
                //     body.passingScore = null;
                // } else {
                //     body.passingScore = +body.passingScore; // Converte para inteiro
                // }

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
                    body.dateInitial = formatDateWithoutHours(body.dateInitial);
                    if (body.dateFinal) {
                        body.dateFinal = formatDateWithoutHours(body.dateFinal);
                    }

                    if (materials) {
                        const materialsArray = Array.isArray(materials)
                            ? [...materials]
                            : [materials];
                        for (const material of materialsArray) {
                            const materialID = await uploadMaterial(
                                material,
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
                .sort({ [order]: sort })
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
            } = req.fields;

            let flagDate = true;

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
                const materials = req.files.materials;
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
                console.log(course);

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
                                    material,
                                    'INSTRUTOR',
                                    `courses/${courseID}body/materials`
                                );
                                arrMaterials.push(materialID);
                            }
                        }

                        await ClassModel.create({
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
                        });

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
            } = req.fields;
            const materials = req.files.materials;
            const user = await getUserByToken(req);
            const currentMaterials = await ClassModel.findById(classID);
            const arrMaterials = currentMaterials.materials;

            let flagDate = true;

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
                                material,
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
                    });

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
            const { searchBy } = req.query;

            const { courses, total } = await getAppliedCourses(
                user._id,
                order,
                sort,
                skip,
                limit,
                searchBy
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
            const course = await CourseModel.findById(courseID).populate(
                'materials'
            );

            const classUsers = await getClassByID(classID);
            course.materials = course.materials.concat(classUsers.materials);

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
            const { skip, limit } = pagination(req);

            const users = searchBy
                ? await User.find({
                      status: 'ATIVO',
                      $or: [
                          { name: { $regex: searchBy, $options: 'i' } },
                          { networkLogin: { $regex: searchBy, $options: 'i' } },
                          { registration: { $regex: searchBy, $options: 'i' } },
                      ],
                  })
                      .skip(parseInt(skip))
                      .limit(parseInt(limit))
                      .sort({ name: 1 })
                : await User.find({
                      status: 'ATIVO',
                  })
                      .skip(parseInt(skip))
                      .limit(parseInt(limit))
                      .sort({ name: 1 });

            const total = searchBy
                ? await User.countDocuments()
                      .find({
                          status: 'ATIVO',
                          $or: [
                              { name: { $regex: searchBy, $options: 'i' } },
                              {
                                  networkLogin: {
                                      $regex: searchBy,
                                      $options: 'i',
                                  },
                              },
                              {
                                  registration: {
                                      $regex: searchBy,
                                      $options: 'i',
                                  },
                              },
                          ],
                      })
                      .count()
                : await User.find({
                      status: 'ATIVO',
                  }).count();

            success(res, req, { data: users, total });
        } catch (error) {
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
                (user) => user.userID === student.id
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
                (user) => user.userID === student.id && user.presence
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
            const course = await ClassModel.findOne({
                qrCodeSelfRegistration: { $eq: body.qrcode },
            }).populate('courseID', 'title');
            const register = course.users.find((user) => user.userID == _id)
            ? true
            : false;
            success(res, req, register ? 'registered' : course);
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

            const course = await ClassModel.updateOne(
                {
                    _id: { $eq: body.qrcode },
                },
                {
                    $push: {
                        users: { userID: userID, presence: true, grades: '' },
                    },
                }
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
};
