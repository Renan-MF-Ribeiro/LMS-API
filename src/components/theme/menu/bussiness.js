const { Menu } = require('./model')

module.exports = {
    async validateMenuAccess (menu, req, currentGroupsAD) {
        return filterMenuByAccess(menu, req, currentGroupsAD);
    },
    async verifyDefaultItems () {
        const menu = await Menu.find({});
        for (const item of MenuDefault) {
            const found = menu.find(m => m.button === item.button);
            if (!found) {
                const newItem = await Menu.create(item);
                menu.push(newItem);
            }
        }
        return menu;
    }
}

async function filterMenuByAccess (menu, req, currentGroupsAD) {
    const filteredMenu = [];
    for (const item of menu) {
        if (item['feature'] && req.features[item['feature']] !== true) continue;
        const hasAccess = item['roles'].some(role => currentGroupsAD.includes(role));
        if (!hasAccess) continue;

        if (item['subMenu']?.length > 0) {
            item['subMenu'] = await filterMenuByAccess(item['subMenu'], req, currentGroupsAD);
            if (item['subMenu'].length === 0) continue;
        }

        filteredMenu.push(item);
    }
    return filteredMenu;
}

const MenuDefault = [
    {
        button: "user",
        roles: [
            "PERFIL_Gestor_Usuario",
            "PERFIL_Gestor_Elegibilidade",
        ],
        subMenu: [
            {
                button: "list",
                roles: [
                    "PERFIL_Gestor_Usuario",
                    "PERFIL_Gestor_Elegibilidade",
                ],
            },
            {
                button: "groups",
                roles: [
                    "PERFIL_Gestor_Usuario",
                    "PERFIL_Gestor_Elegibilidade",
                ],
                subMenu: [
                    {
                        button: "groupsEligibility",
                        roles: [
                            "PERFIL_Gestor_Elegibilidade",
                        ],
                    },
                    {
                        button: "automaticEligibility",
                        roles: [
                            "PERFIL_Gestor_Elegibilidade",
                        ],
                    },
                ],
            },
            {
                button: "classes",
                roles: [
                    "PERFIL_Gestor_Usuario",
                    "PERFIL_Gestor_Elegibilidade",
                ],
            },
            {
                button: "loadClass",
                roles: [
                    "PERFIL_Gestor_Usuario",
                    "PERFIL_Gestor_Elegibilidade",
                ],
            },
            {
                button: "load",
                roles: [
                    "PERFIL_Gestor_Usuario",
                ],
                subMenu: [
                    {
                        button: "loadUsers",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                        ],
                    },
                    {
                        button: "loadSingleUsers",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                        ],
                        feature: "singleUser",
                    },
                    {
                        button: "mapLoadUsers",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                        ],
                        feature: "userPayloadMapping",
                    },
                ],
            },
            {
                button: "partners",
                roles: [
                    "PERFIL_Gestor_Usuario",
                ],
                feature: "partners",
            },
            {
                button: "avatar",
                roles: [
                    "PERFIL_Gestor_Usuario",
                ],
                feature: "feed",
            },
        ],
    },
    {
        button: "contents",
        roles: [
            "PERFIL_Conteudista",
        ],
        subMenu: [
            {
                button: "exams",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "items",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "trails",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "sections",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "channels",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "dimensions",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
        ],
    },
    {
        button: "marketplace",
        roles: [
            "PERFIL_Conteudista",
        ],
        feature: "happplace",
    },
    {
        button: "social",
        roles: [
            "PERFIL_Gestor_Engajamento",
        ],
        feature: "social",
        subMenu: [
            {
                button: "comment",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "socialConfig",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
        ],
    },
    {
        button: "feed",
        roles: [
            "PERFIL_Gestor_Engajamento",
        ],
        feature: "feed",
        subMenu: [
            {
                button: "feedPost",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "feedGroup",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "feedConfig",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
        ],
    },
    {
        button: "activities",
        roles: [
            "PERFIL_Conteudista",
        ],
        subMenu: [
            {
                button: "activitiesList",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "activitiesHistoric",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
        ],
    },
    {
        button: "presencialTrainings",
        roles: [
            "PERFIL_Conteudista",
            "PERFIL_Instrutor",
        ],
        subMenu: [
            {
                button: "presencialCourses",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "presencialNewClass",
                roles: [
                    "PERFIL_Conteudista",
                    "PERFIL_Instrutor",
                ],
            },
            {
                button: "presencialMyClasses",
                roles: [
                    "PERFIL_Conteudista",
                    "PERFIL_Instrutor",
                ],
            },
            {
                button: "presencialHistoric",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "presencialWaitingList",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "presencialConvocation",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
        ],
    },
    {
        button: "assessment",
        roles: [
            "PERFIL_Conteudista",
        ],
        feature: "assessement",
        subMenu: [
            {
                button: "assessmentPillars",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "assessmentCycles",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "assessmentMatrix",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
        ],
    },
    {
        button: "message",
        roles: [
            "PERFIL_Conteudista",
        ],
        subMenu: [
            {
                button: "messageList",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "messageAutomation",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
        ],
    },
    {
        button: "showcase",
        roles: [
            "PERFIL_Gestor_Engajamento",
        ],
        feature: "showcaseComponent",
        subMenu: [
            {
                button: "showcaseConfig",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "showcaseBanners",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "showcaseVideos",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "showcaseMostViewed",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "showcaseSelectionTrails",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "showcaseTextArea",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "showcaseImageArea",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "showcaseDepositions",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "showcaseDynamicPage",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
        ],
    },
    {
        button: "certificate",
        roles: [
            "PERFIL_Conteudista",
        ],
        feature: "certificateTrail",
        subMenu: [
            {
                button: "certificatesIssued",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "certificateModels",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
        ],
    },
    {
        button: "collaboration",
        roles: [
            "PERFIL_Conteudista",
            "PERFIL_Colaborador",
            "PERFIL_Super_Admin",
        ],
        feature: "collaborationComponent",
        subMenu: [
            {
                button: "collaborationContent",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "collaborationCollaborator",
                roles: [
                    "PERFIL_Super_Admin",
                ],
            },
            {
                button: "collaborationNewItem",
                roles: [
                    "PERFIL_Colaborador",
                ],
            },
            {
                button: "collaborationMyContributions",
                roles: [
                    "PERFIL_Colaborador",
                ],
            },
            {
                button: "collaborationTermsOfUse",
                roles: [
                    "PERFIL_Super_Admin",
                ],
            },
        ],
    },
    {
        button: "onboarding",
        roles: [
            "PERFIL_Integrador",
            "PERFIL_Conteudista",
        ],
        feature: "onboarding",
        subMenu: [
            {
                button: "onboardingForms",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "onboardingApplication",
                roles: [
                    "PERFIL_Integrador",
                ],
            },
            {
                button: "onboardingHistory",
                roles: [
                    "PERFIL_Integrador",
                ],
            },
        ],
    },
    {
        button: "gamification",
        roles: [
            "PERFIL_Gestor_Engajamento",
        ],
        feature: "gamefication",
        subMenu: [
            {
                button: "gamificationEvents",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "gamificationRanking",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "gamificationLevels",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "gamificationRewards",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
            },
            {
                button: "gamificationShop",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                feature: "shop",
                subMenu: [
                    {
                        button: "shopProducts",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                    },
                    {
                        button: "shopCategories",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                    },
                    {
                        button: "shopOrders",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                    },
                ],
            },
        ],
    },
    {
        button: "dashboard",
        roles: [
            "PERFIL_Analista",
            "PERFIL_Super_Admin",
        ],
        subMenu: [
            {
                button: "dashboardView",
                roles: [
                    "PERFIL_Analista",
                ],
            },
            {
                button: "dashboardConfig",
                roles: [
                    "PERFIL_Super_Admin",
                ],
            },
        ],
    },
    {
        button: "internalGallery",
        roles: [
            "PERFIL_Conteudista",
        ],
    },
    {
        button: "system",
        roles: [
            "PERFIL_Conteudista",
            "PERFIL_Super_Admin",
            "PERFIL_Gestor_Engajamento",
        ],
        subMenu: [
            {
                button: "termsOfUse",
                roles: [
                    "PERFIL_Conteudista",
                ],
            },
            {
                button: "integrations",
                roles: [
                    "PERFIL_Super_Admin",
                ],
                subMenu: [
                    {
                        button: "apiKey",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                        feature: "apiKey",
                    },
                    {
                        button: "alura",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                        feature: "alura",
                    },
                ],
            },
            {
                button: "environments",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                subMenu: [
                    {
                        button: "themeConfig",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                    },
                    {
                        button: "loginConfig",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                    },
                    {
                        button: "footerConfig",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                    },
                ],
            },
            {
                button: "superAdmin",
                roles: [
                    "PERFIL_Super_Admin",
                ],
                subMenu: [
                    {
                        button: "systemAdmin",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                    },
                    {
                        button: "segmentationRules",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                    },
                    {
                        button: "configLogin",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                    },
                    {
                        button: "menu",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                    },
                    {
                        button: "idp",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                    },
                    {
                        button: "modules",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                    },
                ],
            },
        ],
    },
]