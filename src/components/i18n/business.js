const { i18nApi } = require('./http-adapter');
const { LOCALE, LOCALE_CONTEXT } = require('./model');

const clientId = process.env.CLIENT_ID;

const i18nBusiness = {
    get: async (locale, context) => {
        const { data } = await i18nApi.get(`/locales/${clientId}/${locale}?context=${context}`);

        return data;
    },

    create: async (payload) => {
        const { data } = await i18nApi.post(`/locales/${clientId}`, payload);

        return data;
    },

    update: async (id, payload) => {
        const { data } = await i18nApi.put(`/locales/${clientId}/${id}`, payload);

        return data;
    },

    translate: async ({
        locale = LOCALE.BR,
        context = LOCALE_CONTEXT.API,
        key,
        vars = {},
        matcher = {},
        items = [],
    }) => {
        const localeData = await i18nBusiness.get(locale, context);

        const translations = key
            .split('.')
            .reduce((acc, curr) => acc?.[curr], localeData?.translations);

        if (!Array.isArray(translations)) return deepInterpolate(translations || '', vars);

        if (items.length && matcher) {
            return items.map((item) => {
                const translation = translations.find((t) => t[matcher] === item[matcher]);
                if (!translation) return item;

                const interpolated = deepInterpolate(translation, vars);
                return { ...item, ...interpolated };
            });
        }

        return translations.map((t) => deepInterpolate(t, vars));
    },

    //FASE 2

    //dicionário de termos
    createDictionary: async (payload) => {
        const { data } = await i18nApi.post(`/dictionary`, payload);

        return data;
    },

    getDefaultDictionary: async () => {
        const { data } = await i18nApi.get(`/dictionary/default`);
        return data;
    },

    getLocaleByDictionaryId: async (id, context) => {
        const { data } = await i18nApi.get(`/dictionary/locale/${id}?context=${context}`);
        return data;
    },

    listDictionaries: async ({ page = 1, limit = 10 } = {}) => {
        const { data } = await i18nApi.get(`/dictionary/list/${clientId}`, {
            params: { page, limit }
        });
        return data;
    },

    listActiveDictionaries: async () => {
        const { data } = await i18nApi.get(`/dictionary/active/${clientId}`);
        return data;
    },

    updateDictionary: async (id, payload) => {
        const { data } = await i18nApi.put(`/dictionary/${id}`, payload);
        return data;
    },

    deleteDictionary: async (id) => {
        const { data } = await i18nApi.delete(`/dictionary/${id}`);
        return data;
    },

    //locales

    getLocaleById: async (id) => {
        const { data } = await i18nApi.get(`/locales/id/${id}`);
        return data;
    },

    updateByKey: async (id, payload) => {
        const { data } = await i18nApi.put(`/locales/key/${clientId}/${id}`, payload);
        return data;
    }
};

function interpolate(text, vars) {
    if (typeof text !== 'string') {
        return text;
    }

    for (const [key, value] of Object.entries(vars)) {
        const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        text = text.replace(pattern, value);
    }

    return text;
}

function deepInterpolate(data, vars) {
    if (typeof data === 'string') {
        return interpolate(data, vars);
    }

    if (Array.isArray(data)) {
        return data.map((item) => deepInterpolate(item, vars));
    }

    if (typeof data === 'object' && data !== null) {
        const result = {};

        for (const key of Object.keys(data)) {
            result[key] = deepInterpolate(data[key], vars);
        }

        return result;
    }

    return data;
}

module.exports = { i18nBusiness };
