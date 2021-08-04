const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const SupplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cnpj: { type: String, required: true },
})

const Supplier = mongoose.model('Supplier', SupplierSchema)

module.exports = { Supplier }
