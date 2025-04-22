const MenuDefault = [
    {
        "roles": [
            "PERFIL_Gestor_Usuario",
            "PERFIL_Gestor_Elegibilidade",
            "PERFIL_Gestor_Engajamento",
            "PERFIL_Super_Admin",
            "PERFIL_Analista"
        ],
        "subMenu": [
            {
                "button": "list",
                "roles": [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ]
            },
            {
                "button": "groups",
                "roles": [
                    "PERFIL_Gestor_Usuario",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Super_Admin",
                    "PERFIL_Analista"
                ],
                "subMenu": [
                    {
                        "button": "groupsEligibility",
                        "roles": ["PERFIL_Analista", "PERFIL_Gestor_Elegibilidade"]
                    },
                    {
                        "button": "automaticEligibility",
                        "roles": ["PERFIL_Gestor_Elegibilidade"]
                    }
                ]
            },
            {
                "button": "class",
                "roles": ["PERFIL_Gestor_Usuario", "PERFIL_Gestor_Elegibilidade"],
                "subMenu": [
                    {
                        "button": "classes",
                        "roles": ["PERFIL_Gestor_Usuario", "PERFIL_Gestor_Elegibilidade"],
                        "index": 0
                    },
                    {
                        "button": "loadClass",
                        "roles": ["PERFIL_Gestor_Usuario", "PERFIL_Gestor_Elegibilidade"],
                        "index": 1
                    }
                ],
                "index": 2
            },
            {
                "button": "load",
                "roles": ["PERFIL_Gestor_Usuario", "PERFIL_Super_Admin"],
                "subMenu": [
                    {
                        "button": "loadUsers",
                        "roles": ["PERFIL_Super_Admin", "PERFIL_Gestor_Usuario"]
                    },
                    {
                        "button": "loadSingleUsers",
                        "roles": ["PERFIL_Gestor_Usuario"],
                        "feature": "singleUser"
                    },
                    {
                        "button": "mapLoadUsers",
                        "roles": ["PERFIL_Gestor_Usuario"],
                        "feature": "userPayloadMapping"
                    },
                    {
                        "button": "managerForm",
                        "roles": ["PERFIL_Super_Admin", "PERFIL_Gestor_Usuario"],
                        "feature": "userPayloadMapping",
                        "index": 3
                    }
                ]
            },
            {
                "button": "partners",
                "roles": ["PERFIL_Gestor_Usuario"],
                "feature": "partners"
            },
            {
                "button": "avatar",
                "roles": ["PERFIL_Gestor_Usuario"],
                "feature": "feed"
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "user",
        "index": 0
    },
    {
        "roles": ["PERFIL_Conteudista"],
        "subMenu": [
            {
                "button": "exams",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "items",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "trails",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "sections",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "channels",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "dimensions",
                "roles": ["PERFIL_Conteudista"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "contents",
        "index": 1
    },
    {
        "roles": ["PERFIL_Conteudista"],
        "subMenu": [],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "marketplace",
        "feature": "happplace",
        "index": 2
    },
    {
        "roles": ["PERFIL_Gestor_Engajamento"],
        "subMenu": [
            {
                "button": "comment",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "socialConfig",
                "roles": ["PERFIL_Gestor_Engajamento"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "social",
        "feature": "social",
        "index": 3
    },
    {
        "roles": ["PERFIL_Gestor_Engajamento"],
        "subMenu": [
            {
                "button": "feedPost",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "feedGroup",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "feedConfig",
                "roles": ["PERFIL_Gestor_Engajamento"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "feed",
        "feature": "feed",
        "index": 4
    },
    {
        "roles": ["PERFIL_Conteudista"],
        "subMenu": [
            {
                "button": "activitiesList",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "activitiesHistoric",
                "roles": ["PERFIL_Conteudista"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "activities",
        "index": 5
    },
    {
        "roles": ["PERFIL_Conteudista", "PERFIL_Instrutor"],
        "subMenu": [
            {
                "button": "presencialCourses",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "presencialNewClass",
                "roles": ["PERFIL_Conteudista", "PERFIL_Instrutor"]
            },
            {
                "button": "presencialMyClasses",
                "roles": ["PERFIL_Conteudista", "PERFIL_Instrutor"]
            },
            {
                "button": "presencialHistoric",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "presencialWaitingList",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "presencialConvocation",
                "roles": ["PERFIL_Conteudista"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "presencialTrainings",
        "index": 6
    },
    {
        "roles": ["PERFIL_Conteudista"],
        "subMenu": [
            {
                "button": "assessmentPillars",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "assessmentCycles",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "assessmentMatrix",
                "roles": ["PERFIL_Conteudista"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "assessment",
        "feature": "assessement",
        "index": 7
    },
    {
        "roles": ["PERFIL_Conteudista"],
        "subMenu": [
            {
                "button": "messageList",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "messageAutomation",
                "roles": ["PERFIL_Conteudista"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "message",
        "index": 8
    },
    {
        "roles": ["PERFIL_Gestor_Engajamento"],
        "subMenu": [
            {
                "button": "showcaseConfig",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "showcaseBanners",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "showcaseVideos",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "showcaseMostViewed",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "showcaseSelectionTrails",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "showcaseTextArea",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "showcaseImageArea",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "showcaseDepositions",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "showcaseDynamicPage",
                "roles": ["PERFIL_Gestor_Engajamento"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "showcase",
        "feature": "showcaseComponent",
        "index": 9
    },
    {
        "roles": ["PERFIL_Conteudista"],
        "subMenu": [
            {
                "button": "certificatesIssued",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "certificateModels",
                "roles": ["PERFIL_Conteudista"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "certificate",
        "feature": "certificateTrail",
        "index": 10
    },
    {
        "roles": ["PERFIL_Conteudista", "PERFIL_Colaborador", "PERFIL_Super_Admin"],
        "subMenu": [
            {
                "button": "collaborationContent",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "collaborationCollaborator",
                "roles": ["PERFIL_Super_Admin"]
            },
            {
                "button": "collaborationNewItem",
                "roles": ["PERFIL_Colaborador"]
            },
            {
                "button": "collaborationMyContributions",
                "roles": ["PERFIL_Colaborador"]
            },
            {
                "button": "collaborationTermsOfUse",
                "roles": ["PERFIL_Super_Admin"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "collaboration",
        "feature": "collaborationComponent",
        "index": 11
    },
    {
        "roles": ["PERFIL_Integrador", "PERFIL_Conteudista"],
        "subMenu": [
            {
                "button": "onboardingForms",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "onboardingApplication",
                "roles": ["PERFIL_Integrador"]
            },
            {
                "button": "onboardingHistory",
                "roles": ["PERFIL_Integrador"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "onboarding",
        "feature": "onboarding",
        "index": 12
    },
    {
        "roles": ["PERFIL_Gestor_Engajamento"],
        "subMenu": [
            {
                "button": "gamificationEvents",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "gamificationRanking",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "gamificationLevels",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "gamificationRewards",
                "roles": ["PERFIL_Gestor_Engajamento"]
            },
            {
                "button": "gamificationShop",
                "roles": ["PERFIL_Gestor_Engajamento"],
                "feature": "shop",
                "subMenu": [
                    {
                        "button": "shopProducts",
                        "roles": ["PERFIL_Gestor_Engajamento"]
                    },
                    {
                        "button": "shopCategories",
                        "roles": ["PERFIL_Gestor_Engajamento"]
                    },
                    {
                        "button": "shopOrders",
                        "roles": ["PERFIL_Gestor_Engajamento"]
                    }
                ]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "gamification",
        "feature": "gamefication",
        "index": 13
    },
    {
        "roles": ["PERFIL_Analista", "PERFIL_Super_Admin"],
        "subMenu": [
            {
                "button": "dashboardView",
                "roles": ["PERFIL_Analista"]
            },
            {
                "button": "dashboardConfig",
                "roles": ["PERFIL_Super_Admin"]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "dashboard",

        "index": 15
    },
    {
        "roles": ["PERFIL_Conteudista"],
        "subMenu": [],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "button": "internalGallery",
        "index": 16
    },
    {
        "roles": [
            "PERFIL_Conteudista",
            "PERFIL_Super_Admin",
            "PERFIL_Gestor_Engajamento"
        ],
        "subMenu": [
            {
                "button": "termsOfUse",
                "roles": ["PERFIL_Conteudista"]
            },
            {
                "button": "integrations",
                "roles": ["PERFIL_Super_Admin"],
                "subMenu": [
                    {
                        "button": "apiKey",
                        "roles": ["PERFIL_Super_Admin"],
                        "feature": "apiKey",
                        "index": 0
                    },
                    {
                        "button": "alura",
                        "roles": ["PERFIL_Super_Admin"],
                        "feature": "alura",
                        "index": 1
                    },
                    {
                        "button": "webhook",
                        "roles": ["PERFIL_Super_Admin"],
                        "feature": "webhook",
                        "index": 2
                    }
                ]
            },
            {
                "button": "environments",
                "roles": ["PERFIL_Gestor_Engajamento"],
                "subMenu": [
                    {
                        "button": "themeConfig",
                        "roles": ["PERFIL_Gestor_Engajamento"]
                    },
                    {
                        "button": "loginConfig",
                        "roles": ["PERFIL_Gestor_Engajamento"]
                    },
                    {
                        "button": "footerConfig",
                        "roles": ["PERFIL_Gestor_Engajamento"]
                    },
                    {
                        "button": "headerConfig",
                        "roles": ["PERFIL_Gestor_Engajamento"]
                    },
                    {
                        "button": "welcomeConfig",
                        "roles": ["PERFIL_Gestor_Engajamento"]
                    }
                ]
            },
            {
                "button": "superAdmin",
                "roles": ["PERFIL_Super_Admin"],
                "subMenu": [
                    {
                        "button": "systemAdmin",
                        "roles": ["PERFIL_Super_Admin"]
                    },
                    {
                        "button": "segmentationRules",
                        "roles": ["PERFIL_Super_Admin"]
                    },
                    {
                        "button": "configLogin",
                        "roles": ["PERFIL_Super_Admin"]
                    },
                    {
                        "button": "menu",
                        "roles": ["PERFIL_Super_Admin"]
                    },
                    {
                        "button": "idp",
                        "roles": ["PERFIL_Super_Admin"]
                    },
                    {
                        "button": "modules",
                        "roles": ["PERFIL_Super_Admin"]
                    }
                ]
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "index": 17
    },
    {
        "roles": [
            "PERFIL_Gestor_Usuario",
            "PERFIL_Gestor_Elegibilidade",
            "PERFIL_Gestor_Engajamento",
            "PERFIL_Super_Admin",
            "PERFIL_Analista"
        ],
        "subMenu": [
            {
                "button": "mentors",
                "roles": [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                "index": 0
            },
            {
                "button": "requestMentors",
                "roles": [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                "index": 1
            },
            {
                "button": "mentoringProgram",
                "roles": [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                "index": 2
            },
            {
                "button": "topics",
                "roles": [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                "index": 3
            },
            {
                "button": "configMentoring",
                "roles": [
                    "PERFIL_Super_Admin",
                    "PERFIL_Gestor_Elegibilidade",
                    "PERFIL_Gestor_Usuario"
                ],
                "index": 4
            }
        ],
        "enabled": false,
        "defaultPalette": false,
        "deleted": false,
        "index": 14
    }
]


module.exports = { MenuDefault };