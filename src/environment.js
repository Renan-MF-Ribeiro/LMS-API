const { z } = require('zod');

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
    WEBHOOK_URL: z.string().optional(),
    MAX_UPLOAD_FILE_SIZE: z.string().optional().default('100mb'),

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

    API_MESSENGER: z.string(),
    API_SURVEY: z.string(),
    API_JOB_SCHEDULER: z.string(),
    API_SOCIAL: z.string(),
    API_CERTIFIER: z.string(),
    API_PDF_PRINTER: z.string(),
    API_HAPPPLACE: z.string(),

    // SFTP
    SFTP_HOST: z.string().optional().default('172.30.1.45'),
    SFTP_PORT: z.coerce.number().optional().default(22),
    SFTP_USERNAME: z.string().optional().default('happmobi'),
    SFTP_PASSWORD: z.string().optional().default('LvpRAzb7'),

    // EMAIL
    EMAIL_HOST: z.string().optional().default('smtp.office365.com'),
    EMAIL_PORT: z.coerce.number().optional().default(587),
    EMAIL_USER: z.string().optional().default('noreply@happmobi.com.br'),
    EMAIL_PASS: z.string().optional().default('PBzh92Bw'),

    // TINCAN
    TINCAN_ENDPOINT: z.string().optional(),
    TINCAN_USERNAME: z.string().optional(),
    TINCAN_PASSWORD: z.string().optional(),
    TINCAN_BASE: z.string().optional(),
    TINCAN_EMAIL_PATTER: z.string().optional(),
    TINCAN_OWNER: z.string().optional(),

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

    // Vimeo
    VIMEO_CLIENTID: z.string(),
    VIMEO_CLIENTSECRET: z.string(),
    VIMEO_ACCESSTOKEN: z.string(),
    VIMEO_FOLDER: z.string(),

    // Sendgrid
    SENDGRID_API_KEY: z.string(),

    // SENDINBLUE
    SENDINBLUE_API_KEY: z.string().optional(),
    SENDINBLUE_FOLDER_ID: z.coerce.number().optional(),

    // UNSPLASH
    UNSPLASH_API_KEY: z.string().optional().default('taM3ogQob0HPhithCiFKt_Ou0uzFMXRDRNfoelnYK2s'),

    // AWS
    ACCESSKEY: z.string(),
    SECRETKEY: z.string(),
    BUCKET: z.string(),
    REGION: z.string(),

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
    environment = process.env;
}

module.exports = environment;

