function setConnectMapInForm(connectMap, form) {
    return {
        ...form,
        sections: form.sections.map((section) => {
            return {
                ...section,
                fields: section.fields.map((field) => {
                    const config = connectMap[field.key] ?? null

                    return {
                        ...field,
                        config: typeof config === 'string' ? {
                            label: field.key,
                            field: config,
                            activeInForms: true,
                            type: 'string'
                        } : config,
                    };
                }),
            };
        }),
    }
}

module.exports = {
    setConnectMapInForm
};