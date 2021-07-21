const { Supplier } = require('./model')
const _messages = require('../../utils/messages')
const _files = require('../../utils/files')
module.exports = {
    async import (req, res) {
        const file = req.files
        const data = await _files.readXLSX(file.content.path)
        const dataObjs = data.map(item => {
            if (item[0] !== 'EXTERIOR') {
                return {
                    cnpj: _files.formatCnpj(item[0]),
                    name: item[1],
                }
            }
        })
        dataObjs.forEach(async supplier => {
            await Supplier.create(supplier)
        })
        _messages.success(res, req, dataObjs)
    },

    async list (req, res) {
        try {
            const queryParams = req.query
            const suppliers = await Supplier.find(queryParams)
            _messages.success(res, req, suppliers)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'supplier', 'list')
        }
    },

    async deleteAll (req, res) {
        try {
            await Supplier.deleteMany({})
            _messages.success(res, req, {})
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'supplier', 'deleteAll')
        }
    },

}
