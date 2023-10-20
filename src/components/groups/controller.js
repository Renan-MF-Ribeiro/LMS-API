const _messages = require('../../utils/messages');
const _functions = require('../../utils/functions');
const _files = require('../../utils/files');
const { Trail } = require('../../components/trails/model');
const { Section } = require('../../components/sections/model');
const { Group, InstructorGroup, ClassGroup } = require('./model');
const { CourseModel } = require('../courses/model');

module.exports = {
    async create(req, res) {
        try {
            const findGroup = await Group.find({
                name: req.body.name,
                deleted: 0,
            });

            if (findGroup.length) {
                return _messages.forbidden(
                    res,
                    req,
                    'Registro duplicado',
                    'Este grupo já está cadastrado.',
                    'groups',
                    'create'
                );
            }

            const group = await Group.create(req.body);
            _messages.success(
                res,
                req,
                group,
                'Criação de dados',
                'groups',
                'create',
                group,
                [],
                true,
                'CREATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'create'
            );
        }
    },
    async get(req, res) {
        try {
            const { sort, order } = _functions.ordernation(req);
            const { skip, limit } = _functions.pagination(req);
            const searchBy = req.query.searchBy;

            const total = await Group.find(
                searchBy
                    ? {
                          $or: [{ name: { $regex: searchBy, $options: 'i' } }],
                          deleted: { $eq: 0 },
                      }
                    : { deleted: { $eq: 0 } }
            ).countDocuments();

            const groups = await Group.find(
                searchBy
                    ? {
                          $or: [{ name: { $regex: searchBy, $options: 'i' } }],
                          deleted: { $eq: 0 },
                      }
                    : { deleted: { $eq: 0 } }
            )
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            _messages.success(res, req, {
                data: groups,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'get'
            );
        }
    },

    async update(req, res) {
        try {
            const { _id } = req.body;

            const findGroup = await Group.find({
                name: req.body.name,
                deleted: 0,
                _id: { $ne: _id },
            });

            if (findGroup.length) {
                return _messages.forbidden(
                    res,
                    req,
                    'Registro duplicado',
                    'Este grupo já está cadastrado.',
                    'groups',
                    'create'
                );
            }

            const oldData = await Group.findByIdAndUpdate(_id, req.body);
            const newData = await Group.find({ _id: { $eq: _id } });

            _messages.success(
                res,
                req,
                'Atualizado com sucesso',
                'Atualização de dados',
                'groups',
                'update',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'update'
            );
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            await Group.findByIdAndUpdate(id, { deleted: 1 });

            _messages.success(
                res,
                req,
                'Excluído com sucesso',
                'Exclusão de dados',
                'groups',
                'delete',
                [],
                [],
                true,
                'DELETE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'delete'
            );
        }
    },

    async getInstructorGroups(req, res) {
        try {
            const { sort, order } = _functions.ordernation(req);
            const { skip, limit } = _functions.pagination(req);
            const searchBy = req.query.searchBy;

            const total = await InstructorGroup.find().countDocuments();

            const groups = await InstructorGroup.find(
                searchBy
                    ? {
                          $or: [{ name: { $regex: searchBy, $options: 'i' } }],
                      }
                    : {}
            )
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            _messages.success(res, req, {
                data: groups,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'delete'
            );
        }
    },

    async getInstructorGroupsActives(req, res) {
        try {
            const groups = await InstructorGroup.find();
            _messages.success(res, req, groups);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'delete'
            );
        }
    },

    async createInstructor(req, res) {
        try {
            const { body } = req;
            const group = await InstructorGroup.find({
                name: { $eq: body.name },
            });

            if (group.length > 0) {
                _messages.badRequest(
                    res,
                    req,
                    'O grupo informado já está cadastrado',
                    'Este grupo de instrutores já está cadastrado.',
                    'groups',
                    '/createInstructor'
                );
            } else {
                body.office = body.office.id;
                await InstructorGroup.create(body);
                _messages.success(res, req, 'Grupo criado com sucesso!');
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                '/createInstructor'
            );
        }
    },

    async deleteInstructor(req, res) {
        try {
            const { params } = req;
            const course = await CourseModel.find({
                groups: { $in: params.id },
                deleted: 0,
            });

            if (course.length > 0) {
                _messages.badRequest(
                    res,
                    req,
                    'O grupo de instrutor não pode ser excluído pois está vinculado a um curso',
                    'Atenção! Esse grupo está associado a um curso!',
                    'groups',
                    '/deleteInstructor'
                );
            } else {
                await InstructorGroup.findByIdAndRemove(params.id);
                _messages.success(res, req, 'Excluído com sucesso!');
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                '/deleteInstructor'
            );
        }
    },

    async updateInstructor(req, res) {
        try {
            const { body } = req;
            const group = await InstructorGroup.findById(body.id);
            body.office = body.office.id;

            if (group.name !== body.name) {
                const result = await InstructorGroup.find({
                    name: { $eq: body.name },
                });

                if (result.length > 0) {
                    _messages.badRequest(
                        res,
                        req,
                        'O grupo informado já está cadastrado',
                        'Este grupo de instrutores já está cadastrado.',
                        'groups',
                        '/updateInstructor'
                    );
                } else {
                    await InstructorGroup.findByIdAndUpdate(body.id, body);
                    _messages.success(res, req, 'Atualizado com sucesso!');
                }
            } else {
                await InstructorGroup.findByIdAndUpdate(body.id, body);
                _messages.success(res, req, 'Atualizado com sucesso!');
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                '/updateInstructor'
            );
        }
    },

    async getTags(req, res) {
        try {
            const groups = await Group.find({});
            const trails = await Trail.find({});

            const groupTags = groups
                .filter((value) => value.tags?.length > 0)
                .map((group) => group.tags.map((tag) => tag.value));
            const trailTags = trails
                .filter((value) => value.tags?.length > 0)
                .map((trail) => trail.tags.map((tag) => tag.value))
                .filter((tag) => !/(\bSECAO_)/.test(tag));
            let tags = [...groupTags, ...trailTags];

            tags = tags.reduce((prev, curr) => prev.concat(curr), []);

            _messages.success(res, req, tags);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                '/tags'
            );
        }
    },
    async getSectionTags(req, res) {
        try {
            const sections = await Section.find({});
            const sectionTags = sections
                .filter((value) => value.tags.length > 0)
                .map((section) => section.tags.map((tag) => tag.value))
                .filter((tag) => !/(\bELEGE_)/.test(tag));

            let tags = [...sectionTags];

            tags = tags.reduce((prev, curr) => prev.concat(curr), []);

            _messages.success(res, req, tags);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                '/tags'
            );
        }
    },

    async createClassGroup(req, res) {
        try {
            const findGroup = await ClassGroup.find({
                name: req.body.name,
                deleted: 0,
            });

            if (findGroup.length) {
                return _messages.forbidden(
                    res,
                    req,
                    'Registro duplicado',
                    'Este grupo já está cadastrado.',
                    'groups',
                    'create'
                );
            }

            const group = await ClassGroup.create(req.body);
            _messages.success(
                res,
                req,
                group,
                'Criação de dados',
                'groups',
                'create',
                group,
                [],
                true,
                'CREATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'create'
            );
        }
    },

    async importClassGroups(req, res) {
        try {
            let file = null;
            if (req.files.file) {
                file = req.files.file;
            } else {
                file = req.files.content;
            }

            const { classes: classGroupRows, workbook } =
                await _files.readXLSXClassGroups(file.path);

            const results = [];
            for (const classGroupRow of classGroupRows) {
                const networkLogin =
                    typeof classGroupRow.LOGIN === 'string'
                        ? classGroupRow.LOGIN
                        : classGroupRow.LOGIN.text;

                const foundUser = await User.findOne({
                    networkLogin,
                });

                if (!foundUser) {
                    results.push(`USER NOT FOUND: ${networkLogin}`);
                    continue;
                }

                switch (classGroupRow.ACAO) {
                    case 'ADICIONAR':
                        try {
                            let classGroup;

                            const foundClass = await ClassGroup.findOne({
                                groupCode: classGroupRow.NOME_TURMA,
                            });

                            if (foundClass) {
                                classGroup = foundClass;
                            } else {
                                classGroup = await ClassGroup.create({
                                    groupCode: classGroupRow.NOME_TURMA,
                                    startDate: null,
                                    limitDate: null,
                                    classId: Math.floor(
                                        Math.random() *
                                            (100000000 - 1000000 + 1) +
                                            1000000
                                    ),
                                    status: 2,
                                });
                            }

                            const { startDate, limitDate } = getDates(
                                classGroupRow.DATA_INICIO,
                                classGroupRow.DATA_FIM
                            );

                            classGroup.startDate = startDate;
                            classGroup.limitDate = limitDate;

                            await foundUser.update({
                                $addToSet: {
                                    classGroups: classGroup,
                                },
                            });
                            results.push('SUCESSO');
                        } catch (error) {
                            results.push(`ERRO: ${error.message}`);
                        } finally {
                            break;
                        }

                    case 'EDITAR':
                        try {
                            const previousClassGroups = foundUser.classGroups;
                            const newClassGroups = previousClassGroups.map(
                                (previous) => {
                                    if (
                                        previous.groupCode !==
                                        classGroupRow.NOME_TURMA
                                    )
                                        return previous;

                                    const { startDate, limitDate } = getDates(
                                        classGroupRow.DATA_INICIO,
                                        classGroupRow.DATA_FIM
                                    );

                                    return {
                                        ...previous,
                                        startDate,
                                        limitDate,
                                    };
                                }
                            );
                            await foundUser.update({
                                $set: {
                                    classGroups: newClassGroups,
                                },
                            });
                            results.push('SUCESSO');
                        } catch (error) {
                            results.push(`ERRO: ${error.message}`);
                        } finally {
                            break;
                        }

                    case 'REMOVER':
                        try {
                            const previousClassGroups = foundUser.classGroups;
                            const newClassGroups = previousClassGroups.filter(
                                (previous) =>
                                    previous.groupCode !==
                                    classGroupRow.NOME_TURMA
                            );
                            await foundUser.update({
                                $set: {
                                    classGroups: newClassGroups,
                                },
                            });
                            results.push('SUCESSO');
                        } catch (error) {
                            results.push(`ERRO: ${error.message}`);
                        } finally {
                            break;
                        }

                    default:
                        results.push(`AÇAO INVALIDA: ${classGroupRow.ACAO}`);
                        break;
                }
            }

            const resultWorkbook = _files.writeXlsxClassGroupsResults(
                workbook,
                results
            );

            res.status(200);
            res.set({
                'Content-Disposition': `attachment; filename="filename.xlsx"`,
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            resultWorkbook.xlsx.write(res).then(function () {
                res.end();
            });

            // _messages.success(res, req);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'class-groups',
                'import'
            );
        }
    },

    async deleteClassGroup(req, res) {
        try {
            const { id } = req.params;
            await ClassGroup.deleteOne({ _id: id });

            _messages.success(
                res,
                req,
                'Excluído com sucesso',
                'Exclusão de dados',
                'groups',
                'delete',
                [],
                [],
                true,
                'DELETE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'delete'
            );
        }
    },

    async getClassGroups(req, res) {
        try {
            const { sort, order } = _functions.ordernation(req);
            const { skip, limit } = _functions.pagination(req);
            const searchBy = req.query.searchBy;

            const total = await ClassGroup.find({}).countDocuments();

            const groups = await ClassGroup.find(
                searchBy
                    ? {
                          $or: [{ name: { $regex: searchBy, $options: 'i' } }],
                      }
                    : {}
            )
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            _messages.success(res, req, {
                data: groups,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'classGroups',
                'getClassGroups'
            );
        }
    },

    async updateClassGroup(req, res) {
        try {
            const { _id } = req.body;

            const findGroup = await ClassGroup.find({
                name: req.body.name,
                deleted: 0,
                _id: { $ne: _id },
            });

            if (findGroup.length) {
                return _messages.forbidden(
                    res,
                    req,
                    'Registro duplicado',
                    'Este grupo já está cadastrado.',
                    'groups',
                    'create'
                );
            }

            const oldData = await ClassGroup.findByIdAndUpdate(_id, req.body);
            const newData = await ClassGroup.find({ _id: { $eq: _id } });

            _messages.success(
                res,
                req,
                'Atualizado com sucesso',
                'Atualização de dados',
                'groups',
                'update',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'update'
            );
        }
    },
};
