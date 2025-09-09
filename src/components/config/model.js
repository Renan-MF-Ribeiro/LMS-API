const mongoose = require('mongoose');
const { connect } = require('../../utils/db');

connect();

const schemaOptions = {
    strict: false,
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const valueSchemaOptions = { ...schemaOptions, _id: false, timestamps: false };

const ConfigTypes = {
    SocialFields: 'social-fields',
    AutomaticEligibility: {
        Onboard: 'automatic-eligibility-onboard',
    },
    Segmentation: 'segmentation',
    Messenger: 'messenger',
    Cron: 'cron',
    UsersData: 'users-data',
    Company: 'company',
    Matrix: 'matrix',
    ChatIA: 'chat-ia',
    Dashboard: 'dashboard',
    ManagerRule: 'manager-rule',
};

const ConfigSchema = new mongoose.Schema(
    {
        type: { type: ConfigTypes, required: true, trim: true },
        value: { type: Object, required: true },
    },
    {
        ...schemaOptions,
        discriminatorKey: 'type',
    }
);

ConfigSchema.index({ type: 1 }, { unique: true });

const ConfigModel = mongoose.model('configs', ConfigSchema);

// Segmentação
const SegmentationRuleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
});

const SegmentationExceptionSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
});

const SegmentationStandardSchema = new mongoose.Schema(
    {
        rule: { type: SegmentationRuleSchema },
        exceptions: { type: [SegmentationExceptionSchema], default: [] },
    },
    {
        _id: false,
    }
);

const SegmentationConfigSchema = new mongoose.Schema(
    {
        value: { type: SegmentationStandardSchema, default: {} },
    },
    { ...schemaOptions }
);

const SegmentationConfigModel = ConfigModel.discriminator(
    ConfigTypes.Segmentation,
    SegmentationConfigSchema
);

// Messenger
const MessengerConfigModel = ConfigModel.discriminator(
    ConfigTypes.Messenger,
    new mongoose.Schema(
        {
            value: {
                default: {
                    sendUsersToMicrosservice: false,
                    sendWelcomeCampaign: false,
                    emailTemplate: {
                        primary: '#38B9C2',
                        secondary: '#ffffff',
                        logo: 'https://happlearning.blob.core.windows.net/logo/logoHapp.png',
                        buttonTextColor: '#FFFFFF',
                        buttonBackgroundColor: '#38B9C2',
                        client: 'LMS Happlearning',
                        thumbnail:
                            'https://happlearning.blob.core.windows.net/logo/thumbnailHapp.png',
                        footer: 'https://happlearning.blob.core.windows.net/logo/footerHapp.png',
                    },
                },
                type: new mongoose.Schema(
                    {
                        sendUsersToMicrosservice: { type: Boolean, default: false },
                        sendWelcomeCampaign: { type: Boolean, default: false },
                        emailTemplate: {
                            primary: {
                                type: String,
                                required: true,
                                trim: true,
                                default: '#38B9C2',
                            },
                            secondary: {
                                type: String,
                                required: true,
                                trim: true,
                                default: '#ffffff',
                            },
                            logo: {
                                type: String,
                                required: true,
                                trim: true,
                                default:
                                    'https://happlearning.blob.core.windows.net/logo/logoHapp.png',
                            },
                            buttonTextColor: {
                                type: String,
                                required: true,
                                trim: true,
                                default: '#FFFFFF',
                            },
                            buttonBackgroundColor: {
                                type: String,
                                required: true,
                                trim: true,
                                default: '#38B9C2',
                            },
                            client: {
                                type: String,
                                required: true,
                                trim: true,
                                default: 'LMS Happlearning',
                            },
                            thumbnail: {
                                type: String,
                                required: true,
                                trim: true,
                                default:
                                    'https://happlearning.blob.core.windows.net/logo/thumbnailHapp.png',
                            },
                            footer: {
                                type: String,
                                required: true,
                                trim: true,
                                default:
                                    'https://happlearning.blob.core.windows.net/logo/footerHapp.png',
                            },
                        },
                    },
                    valueSchemaOptions
                ),
            },
        },
        schemaOptions
    )
);

// CRON
const CronConfigModel = ConfigModel.discriminator(
    ConfigTypes.Cron,
    new mongoose.Schema(
        {
            value: {
                default: {
                    average: {
                        active: false,
                        groupA: 'company',
                        groupB: 'costCenter',
                    },
                    userFTP: {
                        active: false,
                        cronExpression: '00 19 * * *',
                    },
                    courseRelease: {
                        active: false,
                    },
                    courseCharge: {
                        active: false,
                    },
                    deleteReprovedExamTracking: {
                        active: false,
                    },
                    degreed: {
                        active: false,
                    },
                    integrator: {
                        active: false,
                    },
                    notifyResponsibleUsers: {
                        active: true,
                        notificationDays: [-30, 0, 30, 60, 90],
                    },
                    revokeTrail: {
                        active: true,
                    },
                    recommendedTrails: {
                        active: true,
                    },
                    inactiveOldOnboardingUsers: {
                        active: true,
                        daysToInactive: 15,
                        cronExpression: '59 23 * * *',
                    },
                    removeAutomaticEligibilityTags: {
                        active: true,
                        cronExpression: '59 23 * * *',
                    },
                },
                type: new mongoose.Schema(
                    {
                        average: {
                            active: { type: Boolean, default: false },
                            groupA: {
                                type: String,
                                required: true,
                                trim: true,
                                default: 'company',
                            },
                            groupB: {
                                type: String,
                                required: true,
                                trim: true,
                                default: 'costCenter',
                            },
                        },
                        userFTP: {
                            active: { type: Boolean, default: false },
                        },
                        courseRelease: {
                            active: { type: Boolean, default: false },
                        },
                        courseCharge: {
                            active: { type: Boolean, default: false },
                        },
                        deleteReprovedExamTracking: {
                            active: { type: Boolean, default: false },
                        },
                        degreed: {
                            active: { type: Boolean, default: false },
                        },
                        integrator: {
                            active: { type: Boolean, default: false },
                        },
                        notifyResponsibleUsers: {
                            active: { type: Boolean, default: false },
                            notificationDays: { type: [Number], default: [-30, 0, 30, 60, 90] },
                        },
                        revokeTrail: {
                            active: { type: Boolean, default: false },
                        },
                        recommendedTrails: {
                            active: { type: Boolean, default: false },
                        },
                        inactiveOldOnboardingUsers: {
                            active: { type: Boolean, default: false },
                            daysToInactive: { type: Number, default: 15 },
                            cronExpression: { type: String, default: '59 23 * * *' },
                        },
                        removeAutomaticEligibilityTags: {
                            active: { type: Boolean, default: false },
                            cronExpression: { type: String, default: '59 23 * * *' },
                        },
                    },
                    valueSchemaOptions
                ),
            },
        },
        schemaOptions
    )
);

const PostProcessingActions = {
    Delete: 'delete',
    Move: 'move',
};

const UsersDataConfigModel = ConfigModel.discriminator(
    ConfigTypes.UsersData,
    new mongoose.Schema(
        {
            value: {
                default: {
                    postProcessingAction: 'delete',
                    inactivateIfNotInSpreadsheet: false,
                    sendSignUpActivationEmail: false,
                    daysSinceLastFeedback: 180,
                    importPath: null,
                    preventOnboardingGroupAdd: false,
                    csvDelimiter: ';',
                },
                type: new mongoose.Schema(
                    {
                        postProcessingAction: {
                            type: PostProcessingActions,
                            required: true,
                            trim: true,
                            default: PostProcessingActions.Delete,
                        },
                        inactivateIfNotInSpreadsheet: { type: Boolean, default: false },
                        sendSignUpActivationEmail: { type: Boolean, default: false },
                        daysSinceLastFeedback: { type: Number, default: 180 },
                        importPath: {
                            type: String,
                            required: false,
                            trim: true,
                            default: null,
                        },
                        preventOnboardingGroupAdd: {
                            type: Boolean,
                            required: false,
                            default: false,
                        },
                        csvDelimiter: {
                            type: String,
                            required: false,
                            default: ';',
                        },
                    },
                    valueSchemaOptions
                ),
            },
        },
        schemaOptions
    )
);

const CompanyConfigModel = ConfigModel.discriminator(
    ConfigTypes.Company,
    new mongoose.Schema(
        {
            value: {
                default: {
                    companyName: 'Happmobi',
                    mfaSupportEmail: 'suporte@happlearning.com.br',
                    supportFormCustomEmail: null, // ['networkLogin', 'email', 'cpf', ..., [DOMAIN]]
                },
                type: new mongoose.Schema(
                    {
                        companyName: {
                            type: String,
                            required: true,
                            trim: true,
                            default: 'Happmobi',
                        },
                        mfaSupportEmail: {
                            type: String,
                            required: true,
                            trim: true,
                            default: 'suporte@happlearning.com.br',
                        },
                        supportFormCustomEmail: {
                            type: [String],
                            required: false,
                            default: null,
                        },
                    },
                    valueSchemaOptions
                ),
            },
        },
        schemaOptions
    )
);

const MATRIX_VISIBILITY_MODE = Object.freeze({
    MANAGER: 'manager',
    ELIGIBILITY: 'eligibility',
});

const MatrixConfigModel = ConfigModel.discriminator(
    ConfigTypes.Matrix,
    new mongoose.Schema(
        {
            value: {
                default: {
                    visibilityMode: MATRIX_VISIBILITY_MODE.MANAGER,
                },
                type: new mongoose.Schema(
                    {
                        visibilityMode: {
                            type: String,
                            required: true,
                            enum: Object.values(MATRIX_VISIBILITY_MODE),
                            default: MATRIX_VISIBILITY_MODE.MANAGER,
                        },
                    },
                    valueSchemaOptions
                ),
            },
        },
        schemaOptions
    )
);

const ChatIAConfigModel = ConfigModel.discriminator(
    ConfigTypes.ChatIA,
    new mongoose.Schema(
        {
            value: {
                default: {
                    enabled: false,
                    avatarId: null,
                    channelsId: [],
                    label: 'Minha IA',
                },
                type: new mongoose.Schema(
                    {
                        enabled: {
                            type: Boolean,
                            required: true,
                            default: false,
                        },
                        avatarId: {
                            type: mongoose.Schema.Types.Mixed,
                            required: false,
                            default: null,
                        },
                        channelsId: {
                            type: [mongoose.Schema.Types.ObjectId],
                            required: false,
                            default: [],
                        },
                        label: {
                            type: String,
                            required: false,
                            default: 'Minha IA',
                        },
                    },
                    valueSchemaOptions
                ),
            },
        },
        schemaOptions
    )
);

const ManagerConfigModel = ConfigModel.discriminator(
    ConfigTypes.ManagerRule,
    new mongoose.Schema(
        {
            value: {
                default: [],
                required: false,
                type: new mongoose.Schema(
                    {
                        rules: [{
                            managerField: { type: String, required: true, trim: true },
                            managerValues: { type: [String], required: true },
                            usersField: { type: String, required: true, trim: true },

                        }],
                        useIsManagerFlag: { type: Boolean, default: true },
                    },
                    valueSchemaOptions
                ),
            },
        },
        schemaOptions
    )
);
const DashboardConfigModel = ConfigModel.discriminator(
    ConfigTypes.Dashboard,
    new mongoose.Schema(
        {
            value: {
                default: {
                    tabs: [
                        'ELEG / OBRIG',
                        'GESTÃO PLATAFORMA',
                        'GRUPOS | TAGS | SEÇÕES X TRILHAS',
                        'CADASTRO ALUNOS',
                        'GESTÃO ELEGIBILIDADES',
                        'ELEG / OBRIG_ADM',
                        'ELEG / OBRIG INDICADORES_ADM',
                        'CONCLUSÕES',
                        'GESTÃO HORAS TREINAMENTO',
                        'CAMPANHAS',
                        'AVALIAÇÕES',
                        'PESQUISA SATISFAÇÃO',
                        'GESTÃO DE USUÁRIOS',
                        'GESTÃO DE CONTEÚDO',
                        'CERTIFICADOS',
                        'CURSOS PRESENCIAIS',
                        'MENSAGERIA',
                        'DIÁRIO DE BORDO',
                        'ITENS DE FORMULÁRIO',
                        'CHAMADOS',
                        'HAPPINSIGHTS',
                        'ASSESSMENT',
                        'FORMAÇÃO',
                    ],
                },
                type: new mongoose.Schema(
                    {
                        tabs: {
                            type: [String],
                            required: true,
                            default: [
                                'ELEG / OBRIG',
                                'GESTÃO PLATAFORMA',
                                'GRUPOS | TAGS | SEÇÕES X TRILHAS',
                                'CADASTRO ALUNOS',
                                'GESTÃO ELEGIBILIDADES',
                                'ELEG / OBRIG_ADM',
                                'ELEG / OBRIG INDICADORES_ADM',
                                'CONCLUSÕES',
                                'GESTÃO HORAS TREINAMENTO',
                                'CAMPANHAS',
                                'AVALIAÇÕES',
                                'PESQUISA SATISFAÇÃO',
                                'GESTÃO DE USUÁRIOS',
                                'GESTÃO DE CONTEÚDO',
                                'CERTIFICADOS',
                                'CURSOS PRESENCIAIS',
                                'MENSAGERIA',
                                'DIÁRIO DE BORDO',
                                'ITENS DE FORMULÁRIO',
                                'CHAMADOS',
                                'HAPPINSIGHTS',
                                'ASSESSMENT',
                                'FORMAÇÃO',
                            ],
                        },
                    },
                    valueSchemaOptions
                ),
            },
        },
        schemaOptions
    )
);

module.exports = {
    ConfigTypes,
    PostProcessingActions,
    ConfigModel,
    SegmentationConfigModel,
    MessengerConfigModel,
    CronConfigModel,
    UsersDataConfigModel,
    CompanyConfigModel,
    MatrixConfigModel,
    MATRIX_VISIBILITY_MODE,
    ChatIAConfigModel,
    DashboardConfigModel,
    ManagerConfigModel
};
