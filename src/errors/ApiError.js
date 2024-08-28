
/**
 * @typedef {{ skipDbLog?: boolean, internalCode?: number }} ApiErrorConfig
 * 
 * @param {string} message Mensagem de erro
 * @param {number} statusCode Código de status HTTP
 * @param {any} data Dados adicionais do erro
 * @param {ApiErrorConfig} config { skipDbLog: Não loga no banco de dados, internalCode: Código interno do erro }
 */
class ApiError extends Error {
    statusCode = 500;
    timestamp = new Date();
    data = undefined;
    config = { skipDbLog: false, internalCode: undefined };

    constructor(message = 'Algo deu errado', statusCode = 400, data, config = {}) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.data = data;
        this.config = config;
    }

    json() {
        return {
            name: this.name,
            timestamp: this.timestamp,
            message: this.message,
            data: this.data,
            config: this.config,
        };
    }
}

// Exemplos de uso
// app.get('/error/api', (req, res) => {
//     throw new ApiError('Teste de erro API', 403);
// });

// app.get('/error/api/data', (req, res) => {
//     throw new ApiError('Teste de erro API', 400, { teste: 'teste' }, { skipDbLog: true });
// });

// app.get('/error/internal', (req, res) => {
//     const user = null;
//     console.log(user.id);
// });

// app.get('/error', (req, res) => {
//     throw new Error('Erro NAO mapeado');
// });

module.exports = ApiError;