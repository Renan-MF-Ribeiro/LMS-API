const { ZENDESK_USER, ZENDESK_API_KEY } = process.env;

const axios = require('axios');
const fs = require('fs').promises;

const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://happlearning.zendesk.com/api/v2/uploads',
    headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${ZENDESK_USER}/token:${ZENDESK_API_KEY}`)}`,
        'Content-Type': 'application/binary', // Alterado para indicar que estamos enviando um arquivo binário
    },
}

const custom_fields = {
    ClientName: 9475144442263,
    NetworkLogin: 1500015359621,
    ClientID: 19253343340439,
    ClientClass: 9475087643671,
};

module.exports = {
    custom_fields,
    async getTokenAttachment (fileArray) {
        let token; // Variável para armazenar o token

        const allResponses = [];

        for (let index = 0; index < fileArray.length; index++) {
            const attached = fileArray[index];
            const response = await sendFile(attached, index, token);

            // Se for a primeira chamada, armazene o token para uso posterior
            if (index === 0 && response.data.upload && response.data.upload.token) {
                token = response.data.upload.token;
            }

            allResponses.push(response.data); // Adiciona o resultado ao array
        }

        return token; // Retorna o token ao final de todas as chamadas
    }
}

// Função auxiliar para fazer uma chamada Axios com promessa
const sendFile = async (attached, index, token) => {
    // Configuração básica
    const fileData = await fs.readFile(attached.path);
    config['data'] = fileData;
    config['headers']['Content-Type'] = attached.type;
    config['params'] = { filename: attached.name };

    if (token) {
        // Se já tiver um token (ou seja, não é a primeira chamada), adicione ao parâmetro
        config['params']['token'] = token;
    }

    try {
        const response = await axios.request(config);
        return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
};
