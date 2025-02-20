const moment = require('moment');
const { appDefaultForm } = require("./constants");
const { FormModel } = require("./model");

function getDefaultConfigByKey(field) {
    switch (field) {
        case 'name':
            return {
                field,
                label: 'Nome completo',
                activeInForms: true,
                type: 'string',
            };
        case 'socialName':
            return {
                field,
                label: 'Nome social',
                activeInForms: true,
                type: 'string',
            };
        case 'email':
            return {
                field,
                label: 'E-mail principal',
                activeInForms: true,
                type: 'string',
            };
        case 'emailAlternative':
            return {
                field,
                label: 'E-mail alternativo',
                activeInForms: true,
                type: 'string',
            };
        case 'phone':
            return {
                field,
                label: 'Telefone',
                activeInForms: true,
                type: 'string',
            };
        case 'birthDate':
            return {
                field,
                label: 'Data de nascimento',
                activeInForms: true,
                type: 'date',
            };
        case 'gender':
            return {
                field,
                label: 'Gênero',
                activeInForms: true,
                type: 'string',
            };
        case 'cpf':
            return {
                field,
                label: 'CPF',
                activeInForms: true,
                type: 'cpf',
            };
        case 'postalCode':
            return {
                field,
                label: 'CEP',
                activeInForms: true,
                type: 'string',
            };
        case 'state':
            return {
                field,
                label: 'Estado',
                activeInForms: true,
                type: 'string',
            };
        case 'city':
            return {
                field,
                label: 'Cidade',
                activeInForms: true,
                type: 'string',
            };
        default:
            return null;
    }
}

function setConnectMapInForm(connectMap, form) {
    return {
        ...form,
        sections: form.sections.map((section) => {
            return {
                ...section,
                fields: section.fields.map((field) => {
                    const config = connectMap[field.key] ?? null;

                    return {
                        ...field,
                        config: !config
                            ? getDefaultConfigByKey(field.key)
                            : (typeof config === 'string' ? {
                                label: field.key,
                                field: config,
                                activeInForms: true,
                                type: 'string'
                            } : config),
                    };
                }),
            };
        }),
    }
}

function getFormErrorsByMapConfig(connectMap, form, data) {
    const errors = [];

    if (form) {
        const formWithConnectFields = setConnectMapInForm(connectMap, form);
        const allFields = formWithConnectFields.sections.flatMap((section) => section.fields);

        Object.entries(data).forEach(([key, value]) => {
            const field = allFields.find((field) => field.key === key);

            if (!field) return;

            if ((field.required || key === (form.loginField ?? 'cpf')) && !value?.length) {
                errors.push({ key, message: `Campo ${field.config?.label ?? key} é obrigatório` });
            }

            const fieldType = field.config?.type ?? 'string';

            switch (fieldType) {
                case 'cpf':
                    if (value && value.length !== 11) {
                        errors.push({ key, message: 'CPF inválido' });
                    }
                    break;

                case 'email':
                    if (value && !value.match(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/)) {
                        errors.push({ key, message: 'Email inválido' });
                    }
                    break;

                case 'date':
                    if (value && moment(value, 'YYYY-MM-DD', true).isValid()) {
                        errors.push({ key, message: 'Data inválida' });
                    }
                    break;

                case 'boolean':
                    if (value && typeof value !== 'boolean') {
                        errors.push({ key, message: 'Valor inválido' });
                    }
                    break;

                default:
                    break;
            }
        });
    }

    return errors;
}

async function getDefaultForm() {
    const defaultForm = await FormModel.findOne({
        isDefault: true,
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }).lean();

    if (!defaultForm) {
        const createdForm = await FormModel.create(appDefaultForm);

        return createdForm.toObject();
    }

    return defaultForm;
}

async function getAdminForm() {
    const adminForm = await FormModel.findOne({
        isAdmin: true,
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }).lean();

    if (!adminForm) {
        return getDefaultForm();
    }

    return adminForm;
}

module.exports = {
    setConnectMapInForm,
    getFormErrorsByMapConfig,
    getDefaultForm,
    getAdminForm,
};