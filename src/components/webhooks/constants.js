const WebhooksDefault = [
    {
        status: false,
        label: "Atualização",
        endpoint: "http://localhost:3000",
        target: "tracking",
        action: "update",

    },
    {
        status: false,
        label: "Criação",
        endpoint: "http://localhost:3000",
        target: "tracking",
        action: "create",

    },
    {
        status: false,
        label: "Atualização de nota",
        endpoint: "http://localhost:3000",
        target: "class",
        action: "grades",

    },
    {
        status: false,
        label: "Deleção",
        endpoint: "http://localhost:3000",
        target: "class",
        action: "delete",

    },
    {
        status: false,
        label: "Atualização",
        endpoint: "http://localhost:3000",
        target: "class",
        action: "update",

    },
    {
        status: false,
        label: "Criação",
        endpoint: "http://localhost:3000",
        target: "class",
        action: "create",

    },
    {
        status: false,
        label: "Deleção",
        endpoint: "http://localhost:3000",
        target: "course",
        action: "delete",

    },
    {
        status: false,
        label: "Update",
        endpoint: "http://localhost:3000",
        target: "course",
        action: "update",

    },
    {
        status: false,
        label: "Criação",
        endpoint: "http://localhost:3000",
        target: "course",
        action: "create",

    },
    {
        status: false,
        label: "Deleção",
        endpoint: "http://localhost:3000",
        target: "item",
        action: "delete",

    },
    {
        status: false,
        label: "Atualização",
        endpoint: "http://localhost:3000",
        target: "item",
        action: "update",

    },
    {
        status: false,
        label: "Criação",
        endpoint: "http://localhost:3000",
        target: "item",
        action: "create",

    },
    {
        status: false,
        label: "Deleção",
        endpoint: "http://localhost:3000",
        target: "trail",
        action: "delete",

    },
    {
        status: false,
        label: "Atualização",
        endpoint: "http://localhost:3000",
        target: "trail",
        action: "update",

    },
    {
        status: false,
        label: "Criação",
        endpoint: "http://localhost:3000",
        target: "trail",
        action: "create",

    },
    {
        status: false,
        label: "Deleção",
        endpoint: "http://localhost:3000",
        target: "users",
        action: "delete",

    },
    {
        status: false,
        label: "Atualização",
        endpoint: "http://localhost:5000/webhook",
        target: "users",
        action: "update",
        auth: {
            type: "api_key",
            key: "hDDFnLt3HPUy6HPN3Gkn"
        }
    },
    {
        status: false,
        label: "Criação",
        endpoint: "http://localhost:5000/webhook",
        target: "users",
        action: "create",

    },
    {
        status: false,
        label: "Autenticação",
        endpoint: "http://localhost:5000/webhook",
        target: "users",
        action: "auth",

    }
]

module.exports = { WebhooksDefault };