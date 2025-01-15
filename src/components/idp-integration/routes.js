const express = require("express");
const { validateTokenRoute, isAdmin } = require("../../utils/middlewares");

const idpIntegrationRouter = express.Router();

idpIntegrationRouter.use(validateTokenRoute)

idpIntegrationRouter.use(isAdmin)

// export interface IdpIntegrationProfile {
//     name: string;
//     profiles: string[];
// }

// export interface IdpIntegration {
//     _id: string;
//     identityProvider: string;
//     active: boolean;
//     keyField: string;
//     profiles: IdpIntegrationProfile[];
// }

const fakeData = Array.from({ length: 20 }, (_, i) => ({
    _id: i.toString(),
    identityProvider: `IDP`,
    active: true,
    keyField: "office",
    profiles: [
        {
            _id: i.toString(),
            name: `Admin`,
            profiles: ["PERFIL_Admin"]
        },
        {
            _id: i.toString(),
            name: `Geral`,
            profiles: ["PERFIL_Conteudista", "PERFIL_Analista"]
        },
    ]
}))

idpIntegrationRouter.get("/", (req, res) => {
    res.json({ data: fakeData.slice(0, 10), total: 20 })
});

idpIntegrationRouter.get("/:id", (req, res) => {
    res.json({
        _id: req.params.id,
        identityProvider: `IDP`,
        active: true,
        keyField: "office",
        profiles: [
            {
                _id: 'asdasd1',
                name: `Admin`,
                profiles: ["PERFIL_Admin"]
            },
            {
                _id: 'asdasd2',
                name: `Geral`,
                profiles: ["PERFIL_Conteudista", "PERFIL_Analista"]
            },
        ]
    })
});

module.exports = idpIntegrationRouter;

