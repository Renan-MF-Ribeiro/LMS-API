const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const _messages = require('../utils/messages');
const { returnProfileByToken, validateToken, validateMonitoringToken } = require('./auth');
const config = require('../../config.json');
const {
    getDbCurrentFeatures,
    setAppCurrentFeatures,
    getAppCurrentFeatures,
} = require('./features');
const { ConfigModel, ConfigTypes } = require('../components/config/model');
const { getSegmentation, isSegmentationException } = require('../components/config/business');
const { User } = require('../components/users/model');
const axios = require('axios');
const { getConnectMap } = require('./connect');
const { getUserByToken, validateProfile } = require('./functions');

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
        validateProfile(req, res, next, ['PERFIL_Conteudista']);
    },

    isCollaborator: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Colaborador']);
    },

    isAdmin: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Admin']);
    },

    isAdminOrAccountant: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Admin, PERFIL_Conteudista']);
    },

    isAccountantOrIntegrator: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Conteudista, PERFIL_Integrador']);
    },

    isIntegrator: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Integrador']);
    },

    isAccountantOrInstructor: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Conteudista, PERFIL_Instrutor']);
    },

    isInstructor: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Instrutor']);
    },

    isAnalyst: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Analista']);
    },

    isStudent: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Aluno']);
    },

    isAdminOrInstructor: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Instrutor, PERFIL_Admin']);
    },
    isSuperAdmin: async (req, res, next) => {
        validateProfile(req, res, next, ['PERFIL_Super_Admin']);
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
