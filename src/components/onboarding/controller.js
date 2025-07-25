const { User } = require('../users/model')

const { success, internalServer, badRequest } = require('../../utils/messages')

const {
    pagination,
    ordernation,
    getUserByToken,
    removeAccents,
} = require('../../utils/functions')

const { OnboardingModel, OnboardingHistoryModel } = require('./model')

module.exports = {
    async createOnboarding (req, res) {
        try {
            const onboarding = await OnboardingModel.findOne({
                title: { $eq: req.body.title },
            })

            if (onboarding) {
                badRequest(
                    res,
                    req,
                    'Onboarding já cadastrado',
                    'Já existe um onboarding cadastrado com o título informado!',
                    'onboarding',
                    '/create',
                )
            } else {
                const { body } = req
                // const types = ['CHECKBOX', 'YESORNOT']
                // body.type = types[body.type]
                await OnboardingModel.create(body)
                success(res, req, 'Criado com sucesso!')
            }
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/create',
            )
        }
    },

    async returnOnboardings (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)
            const searchBy = req.query.searchBy

            let total = await OnboardingModel.find({
                deleted: 0,
            }).countDocuments()

            let data = await OnboardingModel.find({
                deleted: 0,
            })
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            if (searchBy) {
                data = data.filter(d => {
                    return removeAccents(d.title.toLowerCase()).includes(removeAccents(searchBy.toLowerCase())) ||
                        removeAccents(d.description.toLowerCase()).includes(removeAccents(searchBy.toLowerCase()))
                })

                total = data.length
            }

            success(res, req, {
                data,
                total,
            })
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/returnOnboardings',
            )
        }
    },

    async returnOnboardingsActives (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)
            const searchBy = req.query.searchBy

            let total = await OnboardingModel.find({
                deleted: 0,
                status: 1,
            }).countDocuments()

            let data = await OnboardingModel.find({
                deleted: 0,
                status: 1,
            })
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            if (searchBy) {
                data = data.filter(d => {
                    // console.log(removeAccents(d.title))
                    return removeAccents(d.title).includes(removeAccents(searchBy)) ||
                        removeAccents(d.description).includes(removeAccents(searchBy))
                })

                total = data.length
            }

            success(res, req, {
                data,
                total,
            })
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/returnOnboardingsActives',
            )
        }
    },

    async updateOnboarding (req, res) {
        try {
            const { _id } = req.body
            await OnboardingModel.findByIdAndUpdate(_id, req.body)
            success(res, req, 'Atualizado com sucesso!')
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/updateOnboarding',
            )
        }
    },

    async deleteOnboarding (req, res) {
        try {
            const { id } = req.params
            await OnboardingModel.findByIdAndUpdate(id, { deleted: 1 })
            success(res, req, 'Deletado com sucesso!')
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/deleteOnboarding',
            )
        }
    },

    async returnChecklist (req, res) {
        try {
            const { id } = req.params
            const checklist = await OnboardingModel.findById(id)
            success(res, req, {
                checklist,
            })
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/returnUsersCEA',
            )
        }
    },

    async saveChecklist (req, res) {
        try {
            const { body } = req
            const { _id } = await getUserByToken(req)
            body.integrator = _id
            await OnboardingHistoryModel.create(body)
            success(res, req, 'Checklist salvo com sucesso!')
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/saveChecklist',
            )
        }
    },

    async checklistApplied (req, res) {
        try {
            const { _id } = await getUserByToken(req)
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)
            const searchBy = req.query.searchBy

            let total = await OnboardingHistoryModel.find({
                integrator: { $eq: _id },
            }).countDocuments()

            let data = await OnboardingHistoryModel.find({
                integrator: { $eq: _id },
            })
                .populate('checklist', ['title', 'type', 'description'])
                .populate('student', ['name'])
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            if (searchBy) {
                data = data.filter(d => {
                    return d.checklist.description.toLowerCase().includes(searchBy.toLowerCase()) ||
                        d.checklist.title.toLowerCase().includes(searchBy.toLowerCase()) ||
                        d.student.name.toLowerCase().includes(searchBy.toLowerCase())
                })

                total = data.length
            }

            success(res, req, {
                data,
                total,
            })
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/checklistApplied',
            )
        }
    },

    async updateChecklistApplied (req, res) {
        try {
            const { _id } = req.body
            const { body } = req

            await OnboardingHistoryModel.findByIdAndUpdate(_id, body)
            success(res, req, 'Checklist atualizado com sucesso!')
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/updateChecklistApplied',
            )
        }
    },

    async deleteChecklistApplied (req, res) {
        try {
            const { id } = req.params
            await OnboardingHistoryModel.findByIdAndRemove(id)
            success(res, req, 'Checklist excluído com sucesso!')
        } catch (error) {
            internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'onboarding',
                '/deleteChecklistApplied',
            )
        }
    },
}
