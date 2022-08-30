require('dotenv').config()
const mongoose = require('mongoose')
const { connect } = require('../../utils/db')
const { CLIENT_ID } = process.env

connect()

const groups = Object.freeze({
    EMPLOYEES: 'employees',
    MANAGERS: 'managers',
})

const roles = Object.freeze({
    STUDENT: 'student',
    PUBLISHER: 'publisher',
    COACH: 'coach',
    MANAGER: 'manager',
    ADMIN: 'admin',
})

const statuses = Object.freeze({
    ACTIVE: 'active',
    ON_VACATION: 'on_vacation',
    ON_LEAVE: 'on_leave',
    WITHDRAWN: 'withdrawn',
    DISCHARGED: 'discharged',
})

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const userSchema = new mongoose.Schema({
    createDate: { type: String, trim: true },
    cpf: { type: String, required: true, trim: true },
    birthDate: { type: String, trim: true },
    admission: { type: String, trim: true },
    registration: { type: String, trim: true },
    company: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    gender: { type: String, trim: true },
    pcd: { type: String, trim: true },
    manager: { type: String, trim: true },
    board: { type: String, trim: true },
    department: { type: String, trim: true },
    officeCode: { type: String, trim: true },
    office: { type: String, trim: true },
    positionCode: { type: String, trim: true },
    typePosition: { type: String, trim: true },
    costCenter: { type: String, trim: true },
    costCenterDescription: { type: String, trim: true },
    country: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    timeFunction: { type: String, trim: true },
    status: { type: String, trim: true, default: 'ATIVO' },
    tags: { type: Array, default: [] },
    roles: { type: String, trim: true },
    networkLogin: { type: String, trim: true },
    password: { type: Array, default: [] },
    passwordValid: { type: Boolean, default: false },
    profilePhoto: { type: String, trim: true, required: false },
    acceptTerms: { type: Boolean, default: false },
    acceptTermsCollaboration: { type: Boolean, default: false },
    groupsAD: { type: Array, default: [] },
    classGroups: { type: Array, default: [] },
    clientId: { type: Number, default: CLIENT_ID },
    clientUserKey: { type: String, trim: true },
    averageRating: { type: Number, default: 0 },
    numberTrailsCompleted: { type: Number, default: 0 },
    numberTrailsElegibles: { type: Number, default: 0 },
    enabled: { type: Boolean, default: false },
}, {
    ...optionsSchema,
})

const blockLoginSchema = new mongoose.Schema({
    user: { type: 'ObjectId', ref: 'users', required: true },
    dateTimeBlock: { type: Date },
    unblocked: { type: Boolean, default: false },
    ip: { type: String, require: true },
}, {
    ...optionsSchema,
})

const lastLoginSchema = new mongoose.Schema({
    user: { type: 'ObjectId', ref: 'users', required: true },
    lastLogin: { type: Date, required: true },
}, {
    ...optionsSchema,
})

const userTestSchema = new mongoose.Schema({
    birthDate: { type: String, trim: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    gender: { type: String, trim: true },
    board: { type: String, trim: true },
    department: { type: String, trim: true },
    status: { type: String, trim: true },
    tags: { type: Array, default: [] },
    networkLogin: { type: String, trim: true },
    password: { type: Array, default: [] },
    passwordValid: { type: Boolean, default: false },
    profilePhoto: { type: String, trim: true, required: false },
    acceptTerms: { type: Boolean, default: false },
    groupsAD: { type: Array, default: [] },
    clientId: { type: Number, default: CLIENT_ID },
    clientUserKey: { type: String, trim: true },
    averageRating: { type: Number, default: 0 },
    numberTrailsCompleted: { type: Number, default: 0 },
    numberTrailsElegibles: { type: Number, default: 0 },
    enabled: { Type: Boolean, default: false },
    area: { type: String, trim: true },
    office: { type: String, trim: true },

}, {
    ...optionsSchema,
})

userSchema.index({
    name: 'text',
    networkLogin: 'text',
    registration: 'text',
    status: 'text',
})

const mapUser = {
    DATA_CRIACAO: 'createDate',
    CPF: 'cpf',
    DATA_NASC: 'birthDate',
    DATA_ADMISSAO: 'admission',
    MATRICULA: 'registration',
    NOME: 'name',
    EMAIL: 'email',
    EMPRESA: 'company',
    IDENTIDADE_DE_GENERO: 'gender',
    PCD: 'pcd',
    CODIGO_CARGO: 'officeCode',
    CARGO: 'office',
    CODIGO_POSICAO: 'positionCode',
    TIPO_POSICAO: 'typePosition',
    CENTRO_DE_CUSTO: 'costCenter',
    DESCRICAO_CENTRO_DE_CUSTO: 'costCenterDescription',
    PAIS: 'country',
    ESTADO: 'state',
    CIDADE: 'city',
    TEMPO_FUNCAO: 'timeFunction',
    GESTOR: 'manager',
    STATUS: 'status',
    PAPEL: 'roles',
}

const userProjection = {
    name: 1,
    cpf: 1,
    email: 1,
    networkLogin: 1,
    groupsAD: 1,
    classGroups: 1,
    enabled: 1,
    acceptTerms: 1,
    averageRating: 1,
    numberTrailsCompleted: 1,
    numberTrailsElegibles: 1,
    status: 1,
    birthDate: 1,
    admission: 1,
    tags: 1,
}

const User = mongoose.model('users', userSchema)
const UserTest = mongoose.model('users_test', userTestSchema)
// const UserVolume = mongoose.model('users_volume', userSchemaVolume)
const Block = mongoose.model('block_login', blockLoginSchema)
const LastLogin = mongoose.model('last_login', lastLoginSchema)

module.exports = {
    groups,
    roles,
    statuses,
    User,
    UserTest,
    mapUser,
    Block,
    LastLogin,
    userSchema,
    userProjection,
}
