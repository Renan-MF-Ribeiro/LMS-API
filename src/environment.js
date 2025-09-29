const { z } = require('zod');

function transformBoolean(value) {
    return value === 'true' || value === '1';
}

const environmentSchema = z.object({
    COMPOSE_PROJECT_NAME: z.string().optional().default('happlearningv2'),
    NODE_ENV: z.string().optional().default('staging'),

    // Projeto
    DOMAIN: z.string(),
    PORT: z.coerce.number().optional().default(3000),
    CLIENT_ID: z.coerce.number(),

    // General
    PROJECT_SECRET_KEY: z.string(),
    ANALYTICS_SECRET_KEY: z.string(),
    HAPPPLACE_SSO_KEY: z.string(),
    PUBLIC_PATH: z.string().optional().default('src/public'),
    UPLOADS_PATH: z.string().optional().default('src/public/uploads'),
    MAX_UPLOAD_FILE_SIZE: z.string().optional().default('100mb'),
    WEBHOOK_URL: z.string().optional(),
    WEBHOOK_SECRET_KEY: z.string().optional(),

    // BD
    DB_HOST: z.string(),
    DB_NAME: z.string(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),

    // BLOB
    AZURE_ACCESSKEY: z.string(),
    AZURE_STRINGCONN: z.string(),
    AZURE_BLOBNAME: z.string(),
    AZURE_BLOB_URL: z.string(),
    AZURE_FILES_ENCODING: z.string().optional().default('iso88591'),

    // Micro-serviços
    API_GAMIFICATION: z.string(),
    API_KEY_GAMIFICATION: z.string(),

    API_CONNECT: z.string(),
    CONNECT_CLIENT_KEY: z.string(),

    API_ZENDESK: z.string(),
    API_KEY_ZENDESK: z.string(),

    API_ALURA: z.string(),
    API_KEY_ALURA: z.string(),

    API_ASSESSMENT: z.string(),
    API_KEY_ASSESSMENT: z.string(),

    API_WEBHOOK: z.string().optional(),
    API_KEY_WEBHOOK: z.string().optional(),

    API_MESSENGER: z.string(),
    API_SURVEY: z.string(),
    API_JOB_SCHEDULER: z.string(),
    API_SOCIAL: z.string(),
    API_CERTIFIER: z.string(),
    API_PDF_PRINTER: z.string(),
    API_HAPPPLACE: z.string(),
    API_MENTORING: z.string(),
    API_MATRICES: z.string(),
    API_I18N: z.string(),

    // Chatbot
    CHATBOT_API: z.string().optional().nullish().default(null),
    CHATBOT_API_KEY: z.string().optional().nullish().default(null),
    CHATBOT_KAFKA_TOPIC: z.string().optional().nullish().default(null),
    CHATBOT_LOG: z.string().optional().default('0').transform(transformBoolean),

    // Kafka
    KAFKA_ADDR: z.string(),
    KAFKA_PORT: z.string(),
    KAFKA_USER: z.string(),
    KAFKA_PWD: z.string(),
    TOPIC_ACC: z.string(),
    TOPIC_MFA: z.string(),
    TOPIC_MSG: z.string(),
    TOPIC_DEVICER: z.string(),
    TOPIC_MSG_LIST: z.string(),
    KAFKA_GAMIFICATION_EVENTS_PENDING: z.string(),
    KAFKA_GAMIFICATION_EVENTS_VALIDATED: z.string(),

    // Vimeo
    VIMEO_CLIENTID: z.string(),
    VIMEO_CLIENTSECRET: z.string(),
    VIMEO_ACCESSTOKEN: z.string(),
    VIMEO_FOLDER: z.string(),

    // UNSPLASH
    UNSPLASH_API_KEY: z.string(),

    // SESSIONS
    SESSION_MAX_AGE: z.coerce.number().optional().default(6 * 60 * 60 * 1000), // 6 horas

    // Cache
    CACHE_ENABLED: z.string().optional().default('0').transform(transformBoolean),
    CACHE_UNIT: z.coerce.number().optional().default(1000),

    // Logs
    OAUTH2_LOG: z.string().optional().default('0').transform(transformBoolean),

    FILE_PROCESSOR_KAFKA_TOPIC: z.string().optional().nullish().default(null),

    // API_VERSION é Setado no processo de build
    API_VERSION: z.string().optional().default('no-info'),

    // System environment variables
    HOSTNAME: z.string().optional().default(process.env.HOSTNAME || 'localhost'),

    /**
     *! Environments possivelmente não utilizados mais
     * Marcados como opcional e valor default vazio para evitar erros
     * TODO: Verificar se ainda são necessários
     */

    // SFTP
    SFTP_HOST: z.string().optional().default(''),
    SFTP_PORT: z.coerce.number().optional().default(0),
    SFTP_USERNAME: z.string().optional().default(''),
    SFTP_PASSWORD: z.string().optional().default(''),

    // EMAIL
    EMAIL_HOST: z.string().optional().default(''),
    EMAIL_PORT: z.coerce.number().optional().default(0),
    EMAIL_USER: z.string().optional().default(''),
    EMAIL_PASS: z.string().optional().default(''),

    // TINCAN
    TINCAN_ENDPOINT: z.string().optional().default(''),
    TINCAN_USERNAME: z.string().optional().default(''),
    TINCAN_PASSWORD: z.string().optional().default(''),
    TINCAN_BASE: z.string().optional().default(''),
    TINCAN_EMAIL_PATTER: z.string().optional().default(''),
    TINCAN_OWNER: z.string().optional().default(''),

    // Sendgrid
    SENDGRID_API_KEY: z.string().optional().default(''),

    // SENDINBLUE
    SENDINBLUE_API_KEY: z.string().optional().default(''),
    SENDINBLUE_FOLDER_ID: z.coerce.number().optional().default(0),

    // AWS
    ACCESSKEY: z.string().optional().default(''),
    SECRETKEY: z.string().optional().default(''),
    BUCKET: z.string().optional().default(''),
    REGION: z.string().optional().default(''),

    // SSO
    // SSO_ENTRYPOINT: z.string().optional(), // ! NAO ESTA USANDO
    // SSO_ISSUER: z.string().optional(), // ! NAO ESTA USANDO
    // SSO_CALLBACK_URL: z.string().optional(), // ! NAO ESTA USANDO
    // SSO_CERTIFIER: z.string().optional(), // ! NAO ESTA USANDO

    // // Outros
    // LDPA_HOST: z.string().optional(), // ! NAO ESTA USANDO
    // JWT_SECRET: z.string().optional(), // ! NAO ESTA USANDO
});

const { success, data, error } = environmentSchema.safeParse(process.env);

let environment = data;

if (!success) {
    console.error('Invalid environment variables:', JSON.stringify(error.issues, null, 2));
    environment = {
        ...process.env,
        SESSION_MAX_AGE: process.env.SESSION_MAX_AGE
            ? Number(process.env.SESSION_MAX_AGE)
            : 6 * 60 * 60 * 1000, // 6 horas
        CACHE_ENABLED: process.env.CACHE_ENABLED
            ? ['true', '1'].includes(String(process.env.CACHE_ENABLED))
            : false,
        CACHE_UNIT: process.env.CACHE_UNIT
            ? Number(process.env.CACHE_UNIT)
            : 1000,
        OAUTH2_LOG: process.env.OAUTH2_LOG
            ? ['true', '1'].includes(String(process.env.OAUTH2_LOG))
            : false,
    };
}

module.exports = environment;

