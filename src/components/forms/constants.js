const appDefaultForm = {
    name: "Form padrão",
    description: null,
    displayType: "list",
    isDefault: true,
    sections: [
        {
            title: "Dados do usuário",
            description: null,
            index: 0,
            fields: [
                {
                    key: 'name',
                    required: true,
                    columns: 1,
                }, ,
                {
                    key: 'socialName',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'email',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'emailAlternative',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'phone',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'password',
                    required: true,
                    columns: 1,
                },
            ]
        },
        {
            title: "Dados de pessoais",
            description: null,
            index: 1,
            fields: [
                {
                    key: 'birthDate',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'gender',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'cpf',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'postalCode',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'state',
                    required: true,
                    columns: 1,
                },
                {
                    key: 'city',
                    required: true,
                    columns: 1,
                },
            ]
        }
    ]
};

module.exports = { appDefaultForm };