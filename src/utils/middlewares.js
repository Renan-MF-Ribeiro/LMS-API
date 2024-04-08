const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const _messages = require('../utils/messages');
const {
    returnProfileByToken,
    validateToken,
    validateMonitoringToken,
} = require('./auth');
const config = require('../../config.json');

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
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (profiles.indexOf('PERFIL_Conteudista') >= 0) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isCollaborator: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (profiles.indexOf('PERFIL_Colaborador') >= 0) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isAdmin: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (profiles.indexOf('PERFIL_Admin') >= 0) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isAdminOrAccountant: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (
            profiles.indexOf('PERFIL_Admin') >= 0 ||
            profiles.indexOf('PERFIL_Conteudista') >= 0
        ) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isAccountantOrIntegrator: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (
            profiles.indexOf('PERFIL_Conteudista') >= 0 ||
            profiles.indexOf('PERFIL_Integrador') >= 0
        ) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isIntegrator: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (profiles.indexOf('PERFIL_Integrador') >= 0) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isAccountantOrInstructor: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (
            profiles.indexOf('PERFIL_Conteudista') >= 0 ||
            profiles.indexOf('PERFIL_Instrutor') >= 0
        ) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isInstructor: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (profiles.indexOf('PERFIL_Instrutor') >= 0) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isAnalyst: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (profiles.indexOf('PERFIL_Analista') >= 0) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isStudent: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (profiles.indexOf('PERFIL_Aluno') >= 0) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    isAdminOrInstructor: async (req, res, next) => {
        const profiles = await returnProfileByToken(req.headers.authorization);
        if (
            profiles.indexOf('PERFIL_Admin') >= 0 ||
            profiles.indexOf('PERFIL_Instrutor') >= 0
        ) {
            next();
        } else {
            _messages.forbidden(
                res,
                req,
                'Sem permissão de acesso',
                'Você não tem permissão para prosseguir com a ação!',
                '',
                req.originalUrl
            );
        }
    },

    validateMonitoringToken: async (req, res, next) => {
        const token = req.headers.authorization;
        if (token) {
            if (await validateMonitoringToken(req)) {
                next();
            } else {
                _messages.forbidden(res, req, 'Sem permissão de acesso');
            }
        }
    },

    isShowcaseActive: (req, res, next) => {
        if (config?.showcase?.active) {
            next();
        } else {
            _messages.successEmpty(
                res,
                req,
                'Feature "Showcase" não está ativa'
            );
        }
    },

    isAluraActive: (req, res, next) => {
        if (config?.alura?.active) {
            next();
        } else {
            _messages.successEmpty(res, req, 'Feature "Alura" não está ativa');
        }
    },

    isAssessmentActive: (req, res, next) => {
        if (config?.assessment?.active) {
            next();
        } else {
            _messages.successEmpty(
                res,
                req,
                'Feature "Assessment" não está ativa'
            );
        }
    },
};
