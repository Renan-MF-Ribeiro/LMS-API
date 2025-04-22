const MenuDefault = [
    {
        button: "user",
        roles: [
            "PERFIL_Gestor_Usuario",
            "PERFIL_Gestor_Elegibilidade",
            "PERFIL_Super_Admin"
        ],
        subMenu: [
            {
                button: "list",
                roles: [
                    "PERFIL_Gestor_Usuario",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Super_Admin"
                ],
                index: 0
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
                        index: 0
                    },
                    {
                        button: "automaticEligibility",
                        roles: [
                            "PERFIL_Gestor_Elegibilidade",
                        ],
                        index: 1
                    },
                ],
                index: 1
            },
            {
                button: "class",
                roles: [
                    "PERFIL_Gestor_Usuario",
                    "PERFIL_Gestor_Elegibilidade",
                ],
                subMenu: [
                    {
                        button: "classes",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                            "PERFIL_Gestor_Elegibilidade",
                        ],
                        index: 0
                    },
                    {
                        button: "loadClass",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                            "PERFIL_Gestor_Elegibilidade",
                        ],
                        index: 1
                    }],
                index: 2
            },

            {
                button: "load",
                roles: [
                    "PERFIL_Gestor_Usuario",
                    "PERFIL_Super_Admin"
                ],
                subMenu: [
                    {
                        button: "loadUsers",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                            "PERFIL_Super_Admin"
                        ],
                        index: 0
                    },
                    {
                        button: "loadSingleUsers",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                            "PERFIL_Super_Admin"
                        ],
                        feature: "singleUser",
                        index: 1
                    },
                    {
                        button: "mapLoadUsers",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                            "PERFIL_Super_Admin"
                        ],
                        feature: "userPayloadMapping",
                        index: 2
                    },
                    {
                        button: "managerForm",
                        roles: [
                            "PERFIL_Gestor_Usuario",
                            "PERFIL_Super_Admin"
                        ],
                        feature: "userPayloadMapping",
                        index: 3
                    },
                ],
                index: 3
            },
            {
                button: "partners",
                roles: [
                    "PERFIL_Gestor_Usuario",
                ],
                feature: "partners",
                index: 4
            },
            {
                button: "avatar",
                roles: [
                    "PERFIL_Gestor_Usuario",
                ],
                feature: "feed",
                index: 5
            },
        ],
        index: 0
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
                index: 0
            },
            {
                button: "items",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 1
            },
            {
                button: "trails",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 2
            },
            {
                button: "sections",
                roles: [
                    "PERFIL_Conteudista",
                ], index: 3
            },
            {
                button: "channels",
                roles: [
                    "PERFIL_Conteudista",
                ], index: 4
            },
            {
                button: "dimensions",
                roles: [
                    "PERFIL_Conteudista",
                ], index: 5
            },
        ],
        index: 1
    },
    {
        button: "marketplace",
        roles: [
            "PERFIL_Conteudista",
        ],
        feature: "happplace",
        index: 2
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
                index: 0
            },
            {
                button: "socialConfig",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 1
            },
        ],
        index: 3
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
                index: 0
            },
            {
                button: "feedGroup",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 1
            },
            {
                button: "feedConfig",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 2
            },
        ],
        index: 4
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
                index: 0
            },
            {
                button: "activitiesHistoric",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 1
            },
        ],
        index: 5
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
                index: 0
            },
            {
                button: "presencialNewClass",
                roles: [
                    "PERFIL_Conteudista",
                    "PERFIL_Instrutor",
                ],
                index: 1
            },
            {
                button: "presencialMyClasses",
                roles: [
                    "PERFIL_Conteudista",
                    "PERFIL_Instrutor",
                ],
                index: 2
            },
            {
                button: "presencialHistoric",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 3
            },
            {
                button: "presencialWaitingList",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 4
            },
            {
                button: "presencialConvocation",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 5
            },
        ],
        index: 6
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
                index: 0
            },
            {
                button: "assessmentCycles",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 1
            },
            {
                button: "assessmentMatrix",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 2
            },
        ],
        index: 7
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
                index: 0
            },
            {
                button: "messageAutomation",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 1
            },
        ],
        index: 8
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
                index: 0
            },
            {
                button: "showcaseBanners",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 1
            },
            {
                button: "showcaseVideos",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 2
            },
            {
                button: "showcaseMostViewed",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 3
            },
            {
                button: "showcaseSelectionTrails",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 4
            },
            {
                button: "showcaseTextArea",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 5
            },
            {
                button: "showcaseImageArea",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 6
            },
            {
                button: "showcaseDepositions",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 7
            },
            {
                button: "showcaseDynamicPage",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 8
            },
        ],
        index: 9
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
                index: 0
            },
            {
                button: "certificateModels",
                roles: [
                    "PERFIL_Conteudista",
                ],
                index: 1
            },
        ],
        index: 10
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
                index: 0
            },
            {
                button: "collaborationCollaborator",
                roles: [
                    "PERFIL_Super_Admin",
                ],
                index: 1
            },
            {
                button: "collaborationNewItem",
                roles: [
                    "PERFIL_Colaborador",
                ],
                index: 2
            },
            {
                button: "collaborationMyContributions",
                roles: [
                    "PERFIL_Colaborador",
                ],
                index: 3
            },
            {
                button: "collaborationTermsOfUse",
                roles: [
                    "PERFIL_Super_Admin",
                ],
                index: 4
            },
        ],
        index: 11
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
                index: 0
            },
            {
                button: "onboardingApplication",
                roles: [
                    "PERFIL_Integrador",
                ],
                index: 1
            },
            {
                button: "onboardingHistory",
                roles: [
                    "PERFIL_Integrador",
                ],
                index: 2
            },
        ],
        index: 12
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
                index: 0
            },
            {
                button: "gamificationRanking",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 1
            },
            {
                button: "gamificationLevels",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 2
            },
            {
                button: "gamificationRewards",
                roles: [
                    "PERFIL_Gestor_Engajamento",
                ],
                index: 3
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
                        index: 0
                    },
                    {
                        button: "shopCategories",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                        index: 1
                    },
                    {
                        button: "shopOrders",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                        index: 2
                    },
                ],
                index: 4
            },
        ],
        index: 13
    },
    {
        button: "mentoring",
        feature: "mentoring",
        roles: [
            "PERFIL_Gestor_Usuario",
            "PERFIL_Gestor_Elegibilidade",
            "PERFIL_Gestor_Engajamento",
            "PERFIL_Super_Admin"
        ],
        subMenu: [
            {
                button: "mentors",
                roles: [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                index: 0
            },
            {
                button: "requestMentors",
                roles: [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                index: 1
            },
            {
                button: "mentoringProgram",
                roles: [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                index: 2
            },
            {
                button: "topics",
                roles: [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                index: 3
            },
            {
                button: "configMentoring",
                roles: [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                index: 4
            }
        ],
        index: 14
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
                index: 0
            },
            {
                button: "dashboardConfig",
                roles: [
                    "PERFIL_Super_Admin",
                ],
                index: 1
            },
        ],
        index: 15
    },
    {
        button: "internalGallery",
        roles: [
            "PERFIL_Conteudista",
        ],
        index: 16
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
                index: 0
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
                        index: 0
                    },
                    {
                        button: "alura",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                        feature: "alura",
                        index: 1
                    },
                    {
                        button: 'webhook',
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                        feature: "webhook",
                        index: 2
                    }
                ],
                index: 1
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
                        index: 0
                    },
                    {
                        button: "loginConfig",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                        index: 1
                    },
                    {
                        button: "footerConfig",
                        roles: [
                            "PERFIL_Gestor_Engajamento",
                        ],
                        index: 2
                    },
                    {
                        button: "headerConfig",
                        roles: [
                            "PERFIL_Gestor_Engajamento"
                        ],
                        index: 3
                    },
                    {
                        button: "welcomeConfig",
                        roles: [
                            "PERFIL_Gestor_Engajamento"
                        ],
                        feature: "welcomeComponent",
                        index: 4
                    }
                ],
                index: 2
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
                        index: 0
                    },
                    {
                        button: "segmentationRules",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                        index: 1,
                        feature: "segmentation",
                    },
                    {
                        button: "configLogin",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                        index: 2
                    },
                    {
                        button: "menu",
                        roles: [

                        ],
                        index: 3
                    },
                    {
                        button: "idp",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                        index: 4
                    },
                    {
                        button: "modules",
                        roles: [
                            "PERFIL_Super_Admin",
                        ],
                        index: 5
                    },
                ],
                index: 3
            },
        ],
        index: 17
    },

]

module.exports = { MenuDefault };