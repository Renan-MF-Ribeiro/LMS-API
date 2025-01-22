const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const _messages = require('../utils/messages');
const { validateToken, validateMonitoringToken } = require('./auth');
const config = require('../../config.json');
const {
    getDbCurrentFeatures,
    setAppCurrentFeatures,
    getAppCurrentFeatures,
} = require('./features');
const { getSegmentation, isSegmentationException } = require('../components/config/business');
const { getUserByToken, validateProfile } = require('./functions');

const Profiles = {
    ELEGIBILITY_MANAGER: 'PERFIL_Gestor_Elegibilidade', // Antigo "Perfil_Admin"
    ADMIN: 'PERFIL_Admin',
    ACCOUNTANT: 'PERFIL_Conteudista',
    COLLABORATOR: 'PERFIL_Colaborador',
    INTEGRATOR: 'PERFIL_Integrador',
    INSTRUCTOR: 'PERFIL_Instrutor',
    ANALYST: 'PERFIL_Analista',
    STUDENT: 'PERFIL_Aluno',
    // Novos perfis
    SUPER_ADMIN: 'PERFIL_Super_Admin',
    USER_MANAGER: 'PERFIL_Gestor_Usuário',
    ENGAGEMENT_MANAGER: 'PERFIL_Gestor_Engajamento',

};
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
        if (req.headers.authorization !== undefined) {
            const token = req.headers.authorization;
            if (token != null) {
                if (await validateToken(req)) {
                    next();
                } else {
                    _messages.forbidden(
                        res,
                        req,
                        'Sessão expirada',
                        'Sessão expirada!',
                        '',
                        req.originalUrl
                    );
                }
            } else {
                _messages.forbidden(
                    res,
                    req,
                    'Sessão expirada!',
                    'Sessão expirada!',
                    '',
                    req.originalUrl
                );
            }
        } else {
            _messages.badRequest(
                res,
                req,
                'Sessão expirada!',
                'Sessão expirada!',
                '',
                req.originalUrl
            );
        }
    },

    isAccountant: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ACCOUNTANT]);
    },

    isCollaborator: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.COLLABORATOR]);
    },

    isAdmin: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ADMIN, PERFIL_Gestor_Elegibilidade]);
    },

    isAdminOrAccountant: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ADMIN, PERFIL_Gestor_Elegibilidade, Profiles.ACCOUNTANT]);
    },

    isAccountantOrIntegrator: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ACCOUNTANT, Profiles.INTEGRATOR]);
    },

    isIntegrator: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.INTEGRATOR]);
    },

    isAccountantOrInstructor: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ACCOUNTANT, Profiles.INSTRUCTOR]);
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

    isAdminOrInstructor: async (req, res, next) => {
        validateProfile(req, res, next, [Profiles.ADMIN, PERFIL_Gestor_Elegibilidade, Profiles.INSTRUCTOR]);
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

    validateMonitoringToken: async (req, res, next) => {
        const token = req.headers.authorization;
        if (!token || !(await validateMonitoringToken(req))) {
            return _messages.forbidden(res, req, 'Sem permissão de acesso');
        }

        next();
    },

    isShowcaseActive: (req, res, next) => {
        if (!config?.showcase?.active) {
            return _messages.successEmpty(res, req, 'Feature "Showcase" não está ativa');
        }
        next();
    },

    isAluraActive: (req, res, next) => {
        if (!config?.alura?.active) {
            return _messages.successEmpty(res, req, 'Feature "Alura" não está ativa');
        }
        next();
    },

    isAssessmentActive: (req, res, next) => {
        if (!config?.assessment?.active) {
            return _messages.successEmpty(res, req, 'Feature "Assessment" não está ativa');
        }
        next();
    },

    async setCurrentFeatures(req, res, next) {
        const appCurrentFeatures = getAppCurrentFeatures(req.app);

        if (appCurrentFeatures) {
            req.features = appCurrentFeatures;
            return next();
        }

        const dbCurrentFeatures = (await getDbCurrentFeatures()) ?? null;

        setAppCurrentFeatures(req.app, dbCurrentFeatures);

        req.features = dbCurrentFeatures;

        next();
    },

    async setSegmentation(req, res, next) {
        if (config?.segmentation?.active) {
            const segmentation = await getSegmentation();

            if (segmentation.value?.rule) {
                req.segmentation = segmentation.value;

                const user = await getUserByToken(req);

                const issuer = req.segmentation.rule.issuer;

                if (user?.[issuer]) {
                    req.segmentation.owner = user[issuer];
                }

                const isException = isSegmentationException(user, req.segmentation);
                req.segmentation.isException = isException;
            }
        }

        next();
    },
};
