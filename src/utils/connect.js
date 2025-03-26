const axios = require('axios');

const moment = require('moment');

const { defaultUserMap } = require('../components/users/model');

module.exports = {
    async getConnectMap(newFormat = false) {
        const response = await axios.get(
            `${process.env.API_CONNECT}/maps/${process.env.CLIENT_ID}`,
            {
                params: { newFormat },
                headers: {
                    'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                },
            }
        );
        const connectMaps = response.data?.user;
        const hasConnectMap = connectMaps && Object.keys(connectMaps).length > 0;

        if (!hasConnectMap) {
            return newFormat ? defaultUserMap : Object.keys(defaultUserMap).reduce((acc, key) => ({ ...acc, [key]: defaultUserMap[key].field }), {});
        }

        return Object.keys(defaultUserMap).reduce((acc, key) => {
            acc[key] = connectMaps[key] || defaultUserMap[key];
            return acc;
        }, {});
    },

    async getConnectEligibilities() {
        const response = await axios.get(
            `${process.env.API_CONNECT}/maps/elegibility/${process.env.CLIENT_ID}`,
            {
                headers: {
                    'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                },
            }
        );

        return response.data;
    },

    validateDataByConnectMap(data, connectMap) {
        const errors = [];

        for (const connectKey in connectMap) {
            if (connectKey === 'elegibility') continue;

            const connectKeyValue = connectMap[connectKey];

            if (typeof connectKeyValue === 'string' || !connectKeyValue) continue;

            if (!data[connectKey]) continue;

            const fieldType = connectKeyValue.type;
            const fieldConfig = connectKeyValue.config;

            switch (fieldType) {
                case 'string':
                    data[connectKey] = String(data[connectKey]);
                    break;
                case 'number':
                    data[connectKey] = Number(data[connectKey]);
                    break;
                case 'boolean':
                    data[connectKey] = ['sim', 's', '1', 'true'].includes(String(data[connectKey]).toLowerCase());
                    break;
                case 'cpf':
                    data[connectKey] = String(data[connectKey]).replace(/\D/g, '');
                    break;
                case 'cnpj':
                    data[connectKey] = String(data[connectKey]).replace(/\D/g, '');
                    break;
            }

            if (connectKey === 'status') {
                data.status = ['sim', 's', '1', 'true', 'ativo'].includes(String(data.status).toLowerCase()) ? 'ATIVO' : 'INATIVO';
            }

            const dataValue = data[connectKey];

            switch (fieldType) {
                case 'string':
                    if (fieldConfig && fieldConfig.minLength && dataValue.length < fieldConfig.minLength) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ter no mínimo ${fieldConfig.minLength} caracteres.`,
                        })
                    }

                    if (fieldConfig && fieldConfig.maxLength && dataValue.length > fieldConfig.maxLength) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ter no máximo ${fieldConfig.maxLength} caracteres.`,
                        })
                    }
                    break;
                case 'number':
                    if (fieldConfig && fieldConfig.min && Number(dataValue) < Number(fieldConfig.min)) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ser maior que ${fieldConfig.min}.`,
                        })
                    }

                    if (fieldConfig && fieldConfig.max && Number(dataValue) > Number(fieldConfig.max)) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ser menor que ${fieldConfig.max}.`,
                        })
                    }
                    break;
                case 'boolean':
                    if (!['sim', 's', '1', 'true', 'não', 'n', '0', 'false'].includes(String(dataValue).toLowerCase())) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ser um valor booleano.`,
                        })
                    }
                    break;
                case 'date':
                    if (fieldConfig && fieldConfig.minDate && moment(dataValue).isBefore(fieldConfig.minDate)) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ser maior que ${moment(fieldConfig.minDate).format('DD/MM/YYYY')}.`,
                        })
                    }
                    if (fieldConfig && fieldConfig.maxDate && moment(dataValue).isAfter(fieldConfig.maxDate)) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ser menor que ${moment(fieldConfig.maxDate).format('DD/MM/YYYY')}.`,
                        })
                    }
                    break;
                case 'cpf':
                    if (String(dataValue).length !== 11) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ter 11 caracteres.`,
                        })
                    }
                    break;
                case 'cnpj':
                    if (String(dataValue).length !== 14) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ter 14 caracteres.`,
                        })
                    }
                    break;
                case 'email':
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dataValue)) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ser um e-mail válido.`,
                        })
                    }
                    break;
                case 'selection':
                    if (fieldConfig.options?.length && !fieldConfig.options.includes(dataValue)) {
                        errors.push({
                            field: connectKey,
                            message: `O campo ${connectKeyValue.label} deve ser um dos valores disponíveis.`,
                        })
                    }
                    break;
            }

        }

        return errors;
    }
};
