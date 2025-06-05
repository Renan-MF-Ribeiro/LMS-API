const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const _messages = require('../utils/messages');
const _auth = require('./auth');
const { validateToken, validateMonitoringToken } = require('./auth');
const {
    getDbCurrentFeatures,
} = require('./features');
const { getSegmentation, isSegmentationException } = require('../components/config/business');
const { getUserByToken } = require('./functions');
const ApiError = require('../errors/ApiError');
const { log } = require('./logger');

const Profiles = {
    ADMIN: 'PERFIL_Admin',
    ACCOUNTANT: 'PERFIL_Conteudista',
    COLLABORATOR: 'PERFIL_Colaborador',
    INTEGRATOR: 'PERFIL_Integrador',
    INSTRUCTOR: 'PERFIL_Instrutor',
    ANALYST: 'PERFIL_Analista',
    STUDENT: 'PERFIL_Aluno',
    // Novos perfis
    ELEGIBILITY_MANAGER: 'PERFIL_Gestor_Elegibilidade', // Antigo "Perfil_Admin"
    SUPER_ADMIN: 'PERFIL_Super_Admin',
    USER_MANAGER: 'PERFIL_Gestor_Usuario',
    ENGAGEMENT_MANAGER: 'PERFIL_Gestor_Engajamento',
    MATRICES_MANAGER: 'PERFIL_Gestor_Matriz',
    MATRICES_APPLIER: 'PERFIL_Aplicador_Matriz',
};

const validateProfile = async (req, res, next, expectedProfiles) => {
    const profiles = await _auth.returnProfileByToken(req.headers?.authorization);
    // Descomente para ver os perfis do usuário / o que era esperado para ele ter acesso a rota
    //console.log(profiles, expectedProfiles)
    const doesUserHasProfile = profiles.some(
        (profile) =>
            expectedProfiles.includes(profile)
    );
    if (!doesUserHasProfile) {
        return _messages.forbidden(
            res,
            req,
            'Sem permissão de acesso',
            'Você não tem permissão para prosseguir com a ação!',
            '',
            req.originalUrl
        );
    }
    next();
}

module.exports = {
    sendCsrf(req, res, next) {
        res.cookie('XSRF-TOKEN', req.csrfToken());
        next();
    },

    htmlInjection(publicPath) {
        return async (req, res, next) => {
            if (!/\.html?$/i.test(req.path)) return next();

            const p = path.join(publicPath, req.path);
            fs.access(p, fs.F_OK, (err) => {
                if (err) return next();

                fs.readFile(p, 'utf8', (err, data) => {
                    if (err) return res.status(500).send();

                    const $ = cheerio.load(data.toString());
                    $('head').append(
                        '<script type="text/javascript">(function(m){(m=document.domain.match(/^(\\w+\\.)?(.+)$/))&&(document.domain=m[2])})()</script>'
                    );

                    res.type('html');
                    res.send($.html());
                });
            });
        };
    },

    validateTokenRoute: async (req, res, next) => {
        const token = req.headers?.authorization;
        if (!token || !(await validateToken(req))) {
            return _messages.badRequest(
                res,
                req,
                'Sessão expirada!',
                'Sessão expirada!',
                '',
                req.originalUrl
            );
        }
        next();
    },

    isAccountant: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ACCOUNTANT]);
    },

    isCollaborator: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.COLLABORATOR]);
    },

    isElegibilityManager: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ADMIN, Profiles.ELEGIBILITY_MANAGER]);
    },

    isAdmin: async (req, res, next) => { // Retrocompatibilidade
        validateProfile(req, res, next, [Profiles.ADMIN, Profiles.ELEGIBILITY_MANAGER]);
    },

    isIntegrator: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.INTEGRATOR]);
    },

    isInstructor: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.INSTRUCTOR]);
    },

    isAnalyst: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ANALYST]);
    },

    isStudent: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.STUDENT]);
    },

    isSuperAdmin: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.SUPER_ADMIN]);
    },

    isUserManager: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.USER_MANAGER]);
    },

    isEngagementManager: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ENGAGEMENT_MANAGER]);
    },

    isAccountantOrIntegrator: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ACCOUNTANT, Profiles.INTEGRATOR]);
    },

    isAccountantOrInstructor: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ACCOUNTANT, Profiles.INSTRUCTOR]);
    },

    isAdminOrAccountant: async (req, res, next) => {
        validateProfile(req, res, next, [
            Profiles.ADMIN,
            Profiles.ELEGIBILITY_MANAGER,
            Profiles.ACCOUNTANT,
        ]);
    },

    isAdminOrInstructor: async (req, res, next) => {
        validateProfile(req, res, next, [
            Profiles.ADMIN,
            Profiles.ELEGIBILITY_MANAGER,
            Profiles.INSTRUCTOR,
        ]);
    },


    isSuperAdminOrAnalyst: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.SUPER_ADMIN, Profiles.ANALYST]);
    },

    isSuperAdminOrEngagementManager: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.SUPER_ADMIN, Profiles.ENGAGEMENT_MANAGER]);
    },

    isUserManagerOrSuperAdminOrElegibilityManager: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.SUPER_ADMIN, Profiles.USER_MANAGER, Profiles.ELEGIBILITY_MANAGER]);
    },

    canListUsers: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.SUPER_ADMIN, Profiles.USER_MANAGER, Profiles.ELEGIBILITY_MANAGER, Profiles.ENGAGEMENT_MANAGER, Profiles.INTEGRATOR]);
    },

    isUserManagerOrSuperAdmin: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.USER_MANAGER, Profiles.SUPER_ADMIN]);
    },
    isAccountantOrCollaborator: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ACCOUNTANT, Profiles.COLLABORATOR]);
    },

    hasElegibilityPermission: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.SUPER_ADMIN, Profiles.ELEGIBILITY_MANAGER, Profiles.USER_MANAGER, Profiles.ACCOUNTANT, Profiles.ENGAGEMENT_MANAGER, Profiles.COLLABORATOR, Profiles.INTEGRATOR]);
    },

    isUserManagerOrSuperAdminOrInstructor: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.SUPER_ADMIN, Profiles.USER_MANAGER, Profiles.INTEGRATOR]);
    },

    isUserManagerOrElegibilityManager: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.USER_MANAGER, Profiles.ELEGIBILITY_MANAGER]);
    },

    isMatricesManager: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.MATRICES_MANAGER])
    },

    validateMonitoringToken: async (req, res, next) => {
        const token = req.headers.authorization;
        if (!token || !(await validateMonitoringToken(req))) {
            return _messages.forbidden(res, req, 'Sem permissão de acesso');
        }

        next();
    },

    isShowcaseActive: (req, res, next) => {
        return module.exports.hasFeature('showcaseComponent')(req, res, next);
    },

    isAluraActive: (req, res, next) => {
        return module.exports.hasFeature('alura')(req, res, next);
    },

    isAssessmentActive: (req, res, next) => {
        return module.exports.hasFeature('assessement')(req, res, next);
    },

    hasFeature(features) {
        const parsedFeatures = Array.isArray(features) ? features : [features];

        log('Checking features', parsedFeatures);
        
        return async function hasFeatureMiddleware(req, res, next) {
            const features = await getDbCurrentFeatures(req);
            
            if (parsedFeatures.every((feature) => features?.[feature])) {
                return next();
            }

            throw new ApiError('Feature(s) desabilitada(s)', 403, { requiredFeatures: parsedFeatures });
        }
    },

    async setSegmentation(req, res, next) {
        const features = await getDbCurrentFeatures(req);
        
        if (features?.segmentation) {
            const segmentation = await getSegmentation();

            if (segmentation.value?.rule) {
                req.segmentation = segmentation.value;

                try {
                    const user = await getUserByToken(req);

                    const issuer = req.segmentation.rule.issuer;

                    if (user?.[issuer]) {
                        req.segmentation.owner = user[issuer];
                    }

                    const isException = isSegmentationException(user, req.segmentation);
                    req.segmentation.isException = isException;
                    //Fix: improve this logic
                } catch { }
            }
        }

        next();
    },
};
