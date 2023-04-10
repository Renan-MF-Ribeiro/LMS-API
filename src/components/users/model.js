require('dotenv').config();
const mongoose = require('mongoose');
const { connect } = require('../../utils/db');
const { CLIENT_ID } = process.env;

connect();

const groups = Object.freeze({
    EMPLOYEES: 'employees',
    MANAGERS: 'managers',
});

const roles = Object.freeze({
    STUDENT: 'student',
    PUBLISHER: 'publisher',
    COACH: 'coach',
    MANAGER: 'manager',
    ADMIN: 'admin',
});

const statuses = Object.freeze({
    ACTIVE: 'active',
    ON_VACATION: 'on_vacation',
    ON_LEAVE: 'on_leave',
    WITHDRAWN: 'withdrawn',
    DISCHARGED: 'discharged',
});

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const userSchema = new mongoose.Schema(
    {
        cpf: { type: String, trim: true, required: true },
        studentId: { type: String, trim: true },
        signupDateOnLegacy: { type: String, trim: true },
        birthDate: { type: String, trim: true },
        company: { type: String, trim: true },
        name: { type: String, trim: true },
        email: { type: String, trim: true },
        alternativeEmail: { type: String, trim: true },
        professionalEmail: { type: String, trim: true },
        pcd: { type: String, trim: true },
        sexualIdentity: { type: String, trim: true },
        genderIdentity: { type: String, trim: true },
        race: { type: String, trim: true },
        disability: { type: String, trim: true },
        gender: { type: String, trim: true },
        phone: { type: String, trim: true },
        board: { type: String, trim: true },
        department: { type: String, trim: true },
        nationality: { type: String, trim: true },
        district: { type: String, trim: true },
        address: { type: String, trim: true },
        number: { type: String, trim: true },
        complement: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, trim: true },
        state: { type: String, trim: true },
        city: { type: String, trim: true },
        status: { type: String, trim: true },
        tags: { type: Array, default: [] },
        networkLogin: { type: String, trim: true },
        password: { type: Array, default: [] },
        passwordValid: { type: Boolean, default: false },
        profilePhoto: { type: String, trim: true, required: false },
        acceptTerms: { type: Boolean, default: true },
        acceptTermsCollaboration: { type: Boolean, default: false },
        sendInBlueAccept: { type: Boolean, default: false },
        groupsAD: { type: Array, default: [] },
        classGroups: { type: Array, default: [] },
        clientId: { type: Number, default: CLIENT_ID },
        clientUserKey: { type: String, trim: true },
        averageRating: { type: Number, default: 0 },
        numberTrailsCompleted: { type: Number, default: 0 },
        numberTrailsElegibles: { type: Number, default: 0 },
        deviceId: { type: String, trim: true },
        enabled: { type: Boolean, default: false },
    },
    {
        ...optionsSchema,
    }
);

const blockLoginSchema = new mongoose.Schema(
    {
        user: { type: 'ObjectId', ref: 'users', required: true },
        dateTimeBlock: { type: Date },
        unblocked: { type: Boolean, default: false },
        ip: { type: String, require: true },
    },
    {
        ...optionsSchema,
    }
);

const lastLoginSchema = new mongoose.Schema(
    {
        user: { type: 'ObjectId', ref: 'users', required: true },
        lastLogin: { type: Date, required: true },
    },
    {
        ...optionsSchema,
    }
);

const userTestSchema = new mongoose.Schema(
    {
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
    },
    {
        ...optionsSchema,
    }
);

userSchema.index({
    name: 'text',
    networkLogin: 'text',
    registration: 'text',
    status: 'text',
});

const mapUser = {
    CODALUNO: 'studentId',
    DATA_CADASTRO: 'signupDateOnLegacy',
    CPF: 'cpf',
    DATA_DE_NASCIMENTO: 'birthDate',
    NOME: 'name',
    'E-MAIL': 'email',
    'E-MAIL_PROFISSIONAL': 'professionalEmail',
    EMPRESA: 'company',
    SEXO: 'gender',
    TELEFONE: 'phone',
    NACIONALIDADE: 'nationality',
    ENDERECO: 'address',
    NUMERO: 'number',
    COMPLEMENTO: 'complement',
    BAIRRO: 'district',
    ESTADO: 'state',
    CIDADE: 'city',
    CEP: 'postalCode',
    PAIS: 'country',
    STATUS_ALUNO: 'status',
    IDENTIDADE_DE_GENERO: 'genderIdentity',
    PCD: 'pcd',
    RACE: 'race',
    ORIENTACAO_SEXUAL: 'sexualIdentity',
    DEFICIENCIA: 'disability',
};

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
};

const User = mongoose.model('users', userSchema);
const UserTest = mongoose.model('users_test', userTestSchema);
// const UserVolume = mongoose.model('users_volume', userSchemaVolume)
const Block = mongoose.model('block_login', blockLoginSchema);
const LastLogin = mongoose.model('last_login', lastLoginSchema);

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
};
