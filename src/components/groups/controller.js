const _messages = require('../../utils/messages')
const _functions = require('../../utils/functions')
const { Group, InstructorGroup } = require('./model')
const { CourseModel } = require('../courses/model')

module.exports = {
    async create (req, res) {
        try {
            const findGroup = await Group.find({ name: req.body.name, deleted: 0 })

            if (findGroup.length) {
                return _messages.forbidden(res, req, 'Registro duplicado', 'Este grupo já está cadastrado.', 'groups', 'create')
            }

            const group = await Group.create(req.body)
            _messages.success(res, req, group, 'Criação de dados', 'groups', 'create', group, [], true, 'CREATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'create')
        }
    },
    async get (req, res) {
        try {
            const { sort, order } = _functions.ordernation(req)
            const { skip, limit } = _functions.pagination(req)
            const searchBy = req.query.searchBy

            const total = await Group.find({
                deleted: { $eq: 0 },
            }).countDocuments()

            const groups = await Group.find(searchBy ? {
                $or: [
                    { name: { $regex: searchBy, $options: 'i' } },
                ],
                deleted: { $eq: 0 },
            } : { deleted: { $eq: 0 } })
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: groups,
                total,
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'get')
        }
    },

    async update (req, res) {
        try {
            const { _id } = req.body

            const findGroup = await Group.find({ name: req.body.name, deleted: 0, _id: { $ne: _id } })

            if (findGroup.length) {
                return _messages.forbidden(res, req, 'Registro duplicado', 'Este grupo já está cadastrado.', 'groups', 'create')
            }

            const oldData = await Group.findByIdAndUpdate(_id, req.body)
            const newData = await Group.find({ _id: { $eq: _id } })

            _messages.success(res, req, 'Atualizado com sucesso', 'Atualização de dados', 'groups', 'update', newData, oldData, true, 'UPDATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'update')
        }
    },
    async delete (req, res) {
        try {
            const { id } = req.params
            await Group.findByIdAndUpdate(id, { deleted: 1 })

            _messages.success(res, req, 'Excluído com sucesso', 'Exclusão de dados', 'groups', 'delete', [], [], true, 'DELETE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'delete')
        }
    },

    async getInstructorGroups (req, res) {
        try {
            const { sort, order } = _functions.ordernation(req)
            const { skip, limit } = _functions.pagination(req)
            const searchBy = req.query.searchBy

            const total = await InstructorGroup.find().countDocuments()

            const groups = await InstructorGroup.find(searchBy ? {
                $or: [
                    { name: { $regex: searchBy, $options: 'i' } },
                ],
            } : {})
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: groups,
                total,
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'delete')
        }
    },

    async getInstructorGroupsActives (req, res) {
        try {
            const groups = await InstructorGroup.find()
            _messages.success(res, req, groups)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'delete')
        }
    },

    async createInstructor (req, res) {
        try {
            const { body } = req
            const group = await InstructorGroup.find({
                name: { $eq: body.name },
            })

            if (group.length > 0) {
                _messages.badRequest(res, req, 'O grupo informado já está cadastrado', 'Este grupo de instrutores já está cadastrado.', 'groups', '/createInstructor')
            } else {
                body.office = body.office.id
                await InstructorGroup.create(body)
                _messages.success(res, req, 'Grupo criado com sucesso!')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', '/createInstructor')
        }
    },

    async deleteInstructor (req, res) {
        try {
            const { params } = req
            const course = await CourseModel.find({
                groups: { $in: params.id },
                deleted: 0,
            })

            if (course.length > 0) {
                _messages.badRequest(res, req, 'O grupo de instrutor não pode ser excluído pois está vinculado a um curso', 'Atenção! Esse grupo está associado a um curso!', 'groups', '/deleteInstructor')
            } else {
                await InstructorGroup.findByIdAndRemove(params.id)
                _messages.success(res, req, 'Excluído com sucesso!')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', '/deleteInstructor')
        }
    },

    async updateInstructor (req, res) {
        try {
            const { body } = req
            const group = await InstructorGroup.findById(body.id)
            body.office = body.office.id

            if (group.name !== body.name) {
                const result = await InstructorGroup.find({
                    name: { $eq: body.name },
                })

                if (result.length > 0) {
                    _messages.badRequest(res, req, 'O grupo informado já está cadastrado', 'Este grupo de instrutores já está cadastrado.', 'groups', '/updateInstructor')
                } else {
                    await InstructorGroup.findByIdAndUpdate(body.id, body)
                    _messages.success(res, req, 'Atualizado com sucesso!')
                }
            } else {
                await InstructorGroup.findByIdAndUpdate(body.id, body)
                _messages.success(res, req, 'Atualizado com sucesso!')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', '/updateInstructor')
        }
    },
}
