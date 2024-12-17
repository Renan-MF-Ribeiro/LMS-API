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

const assessmentGroupSchema = new mongoose.Schema(
    {
        pillarId: { type: String, required: true },
        cycleId: { type: String, required: true },
        periodId: { type: String, required: true },
        tags: { type: [String], default: [] },
    },
    {
        _id: false,
        timestamps: true,
    }
);

const userSchema = new mongoose.Schema(
    {
        networkLogin: { type: String, trim: true, required: true },
        password: { type: Array, default: [] },
        passwordValid: { type: Boolean, default: false },
        createDate: { type: String, trim: true, required: false },
        name: { type: String, required: true, trim: true },
        email: { type: String, trim: true },
        emailAlternative: { type: String, trim: true },
        registration: { type: String, required: false, trim: true },
        status: {
            type: String,
            trim: true,
            default: 'ATIVO',
            transform: (status) => String(status).toUpperCase(),
        },
        cpf: { type: String, trim: true },
        birthDate: { type: String, trim: true },
        genderIdentity: { type: String, trim: true },
        gender: { type: String, trim: true },
        admission: { type: String, required: false, trim: true },
        company: { type: String, trim: true },
        sexualIdentity: { type: String, trim: true },
        race: { type: String, trim: true },
        disability: { type: String, trim: true },
        phone: { type: String, trim: true },
        pcd: { type: String, trim: true },
        manager: { type: String, trim: true, default: 'NAO' },
        board: { type: String, trim: true },
        department: { type: String, trim: true },
        nationality: { type: String, trim: true },
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
        address: { type: String, trim: true },
        number: { type: String, trim: true },
        complement: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        district: { type: String, trim: true },
        tags: { type: Array, default: [] },
        roles: { type: String, trim: true },
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
        store: { type: String, trim: true },
        storeCode: { type: String, trim: true },
        storeGroup: { type: String, trim: true },
        storeGroupDescription: { type: String, trim: true },
        plant: { type: String, trim: true },
        managerRegistration: { type: String, trim: true },
        managerName: { type: String, trim: true },
        area: { type: String, trim: true },
        locality: { type: String, trim: true },
        hierarchicalLevel: { type: String, trim: true },
        vp: { type: String, trim: true },
        business: { type: String, trim: true },
        optionalEligibility1: { type: String, trim: true },
        optionalEligibility2: { type: String, trim: true },
        optionalEligibility3: { type: String, trim: true },
        task: { type: String, trim: true },
        webPushAuthorization: { type: Array, required: false, default: [] },
        onboarding: { type: Boolean, default: false },
        assessmentGroups: { type: [{ type: assessmentGroupSchema }], required: false, default: [] },
        civilName: { type: String, trim: true },
        socialName: { type: String, trim: true },
        welcomeVideoWatched: { type: Boolean, default: false },
        ignoreLoadInactivation: { type: Boolean, default: false, required: false },
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

const mapUserOld = {
    LOGIN: 'networkLogin',
    SENHA: 'password',
    DATA_CRIACAO: 'createDate',
    NOME: 'name',
    EMAIL: 'email',
    MATRICULA: 'registration',
    STATUS: 'status',
    CPF: 'cpf',
    DATA_NASC: 'birthDate',
    IDENTIDADE_DE_GENERO: 'genderIdentity',
    PAIS: 'country',
    CIDADE: 'city',
    ESTADO: 'state',
    UF: 'state',
    EMPRESA: 'company',
    ADMISSAO: 'admission',
    LOCALIDADE: 'locality',
    CARGO: 'office',
    NIVEL_HIERARQUICO: 'hierarchicalLevel',
    TAREFA: 'task',
    CENTRO_DE_CUSTO: 'costCenter',
    DESCRICAO_CENTRO_DE_CUSTO: 'costCenterDescription',
    LOJA: 'store',
    IDENTIFICACAO_LOJA: 'storeCode',
    GRUPO_LOJA: 'storeGroup',
    DISTRITAL: 'plant',
    GESTOR: 'manager',
    MATRICULA_GESTOR: 'managerRegistration',
    NOME_GESTOR: 'managerName',
    AREA: 'area',
    DEPARTAMENTO: 'department',
    ORIENTACAO_SEXUAL: 'sexualIdentity',
    SEXO: 'gender',
    RACE: 'race',
    TELEFONE: 'phone',
    NACIONALIDADE: 'nationality',
    PCD: 'pcd',
    DEFICIENCIA: 'disability',
    CODIGO_CARGO: 'officeCode',
    ENDERECO: 'address',
    NUMERO: 'number',
    COMPLEMENTO: 'complement',
    BAIRRO: 'district',
    CEP: 'postalCode',
    CODIGO_POSICAO: 'positionCode',
    TIPO_POSICAO: 'typePosition',
    TEMPO_FUNCAO: 'timeFunction',
    PAPEL: 'roles',
    VP: 'vp',
    NEGOCIO: 'business',
    OPCIONAL_ELEGIBILIDADE1: 'optionalEligibility1',
    OPCIONAL_ELEGIBILIDADE2: 'optionalEligibility2',
    OPCIONAL_ELEGIBILIDADE3: 'optionalEligibility3',
};

const defaultUserMap = {
    networkLogin: 'LOGIN',
    password: 'SENHA',
    createDate: 'DATA_CRIACAO',
    name: 'NOME',
    email: 'EMAIL',
    registration: 'MATRICULA',
    status: 'STATUS',
    cpf: 'CPF',
    birthDate: 'DATA_NASC',
    genderIdentity: 'IDENTIDADE_DE_GENERO',
    country: 'PAIS',
    city: 'CIDADE',
    state: 'ESTADO',
    state: 'UF',
    company: 'EMPRESA',
    admission: 'ADMISSAO',
    locality: 'LOCALIDADE',
    office: 'CARGO',
    hierarchicalLevel: 'NIVEL_HIERARQUICO',
    task: 'TAREFA',
    costCenter: 'CENTRO_DE_CUSTO',
    costCenterDescription: 'DESCRICAO_CENTRO_DE_CUSTO',
    store: 'LOJA',
    storeCode: 'IDENTIFICACAO_LOJA',
    storeGroup: 'GRUPO_LOJA',
    storeGroupDescription: 'GRUPO_LOJA_DESCRICAO',
    plant: 'DISTRITAL',
    manager: 'GESTOR',
    managerRegistration: 'MATRICULA_GESTOR',
    managerName: 'NOME_GESTOR',
    area: 'AREA',
    department: 'DEPARTAMENTO',
    vp: 'VP',
    business: 'NEGOCIO',
    optionalEligibility1: 'OPCIONAL_ELEGIBILIDADE1',
    optionalEligibility2: 'OPCIONAL_ELEGIBILIDADE2',
    optionalEligibility3: 'OPCIONAL_ELEGIBILIDADE3',
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
    defaultUserMap,
    mapUserOld,
    Block,
    LastLogin,
    userSchema,
    userProjection,
};
