const _messages = require('../../utils/messages');
const { Log } = require('../logs/model');
const config = require('../../../config.json');
const {
    executeCronDailyCharge,
    executeCronAverageCourses,
    executeCronGroupsAD,
    executeCourseReleaseNotification,
    executeCourseChargeNotification,
    executeCronUsers,
    executeExamDeleteTrackingCron,
    executeRevokeTrail,
    executeRecommendedTrails,
    executeUpdateTrailsViewsCron,
    executeInactiveOldOnboardingUsers,
    executeRemoveAutomaticEligibilityTags,
    executeIntegrator,
} = require('../../utils/cron');

module.exports = {
    async executeDailyCharge(req, res) {
        executeCronDailyCharge();
        res.status(200).json('CRON INICIADO COM SUCESSO');
    },

    async executeAverageCourses(req, res) {
        executeCronAverageCourses();
        res.status(200).json('CRON INICIADO COM SUCESSO');
    },

    async executeGroupsAD(req, res) {
        executeCronGroupsAD();
        res.status(200).json('CRON INICIADO COM SUCESSO');
    },

    async executeUsersCron(req, res) {
        executeCronUsers();
        res.status(200).json('CRON INICIADO COM SUCESSO');
    },

    async executeCourseReleaseNotification(req, res) {
        executeCourseReleaseNotification();
        res.status(200).json('CRON INICIADO COM SUCESSO');
    },

    async executeCourseChargeNotification(req, res) {
        executeCourseChargeNotification();
        res.status(200).json('CRON INICIADO COM SUCESSO');
    },

    async executeDeleteTrackingCron(req, res) {
        executeExamDeleteTrackingCron();
        res.status(200).json('CRON INICIADO COM SUCESSO');
    },

    async executeUpdateTrailsViewsCron(req, res) {
        executeUpdateTrailsViewsCron()
        res.status(200).json('CRON INICIADO COM SUCESSO')
    },

    async LastExecuteDailyCharge(req, res) {
        try {
            let log = await Log.findOne({
                component: 'CRON_DAILY_CHARGE',
            }).sort({ createdAt: -1 });

            if (log)
                log = await verifyLog(log);

            return _messages.success(res, req, log);

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                '/last-users'
            );
        }
    },

    async LastExecuteIntegrator(req, res) {
        try {
            let log = await Log.findOne({
                component: 'CRON_INTEGRATOR',
            }).sort({ createdAt: -1 });
            if (log)
                log = await verifyLog(log);

            return _messages.success(res, req, log);

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                '/last-users'
            );
        }
    },


    async LastExecuteAverageCourses(req, res) {
        try {
            let log = await Log.findOne({ component: 'CRON_AVERAGE' }).sort({
                createdAt: -1,
            });
            if (log) {
                log = await verifyLog(log);
            }
            return _messages.success(res, req, log);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                '/last-average-courses'
            );
        }
    },

    async LastExecuteGroupsAD(req, res) {
        try {
            let log = await Log.findOne({ component: 'CRON_GROUP' }).sort({
                createdAt: -1,
            });
            if (log) {
                log = await verifyLog(log);
                _messages.success(res, req, log);
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Erro ao buscar última execução do cron de grupos'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                '/last-groups-ad'
            );
        }
    },

    async executeCronRevokeTrail(req, res) {
        if (config.cron.revokeTrail.active) {
            executeRevokeTrail();
            res.status(200).json('CRON INICIADO COM SUCESSO');
        } else {
            res.status(500).json('FUNCIONALIDADE INATIVA');
        }
    },

    async executeIntegratorCron(req, res) {
        if (config.cron.integrator.active) {
            executeIntegrator();
            res.status(200).json('CRON INICIADO COM SUCESSO');
        } else {
            res.status(500).json('FUNCIONALIDADE INATIVA');
        }
    },

    async executeRecommendedTrails(req, res) {
        if (config.cron.recommendedTrails.active) {
            executeRecommendedTrails();
            res.status(200).json('CRON INICIADO COM SUCESSO');
        } else {
            res.status(500).json('FUNCIONALIDADE INATIVA');
        }
    },

    async handleInactiveOldOnboardingUsers(req, res) {
        if (!config.cron?.inactiveOldOnboardingUsers?.active) {
            return res.status(400).json({
                message: 'FUNCIONALIDADE INATIVA',
            });
        }

        await executeInactiveOldOnboardingUsers(true);

        res.status(200).json({
            message: 'CRON INICIADO COM SUCESSO',
        });
    },
    

    async handleRemoveAutomaticEligibilityTags(req, res) {
        if (!config.cron?.removeAutomaticEligibilityTags?.active) {
            return res.status(400).json({
                message: 'FUNCIONALIDADE INATIVA',
            });
        }

        await executeRemoveAutomaticEligibilityTags(true);

        res.status(200).json({
            message: 'CRON INICIADO COM SUCESSO',
        });
    },
};

async function verifyLog(log) {
    const msg = log.message.toLowerCase();
    let successful = msg.indexOf('sucesso');
    if (successful !== -1) {
        successful = true;
        log = { log, successful };
    } else {
        successful = false;
        log = { log, successful };
    }
    return log;
}
