const express = require('express');

const { getConnectMap } = require('../../utils/connect');
const { defaultOnboardingUserMap } = require('../users/model');
const { setSheetResponse } = require('./utils');

const downloadsRouter = express.Router();

downloadsRouter.get('/user-load-sheet', async (req, res) => {
    const connectMap = await getConnectMap(false);

    return setSheetResponse('CargaUsuariosDefault', connectMap, res);
});

downloadsRouter.get('/onboarding-user-load-sheet', async (req, res) => {
    const onboardingMap = Object.entries(defaultOnboardingUserMap).reduce((acc, [key, value]) => {
        acc[key] = value.field;
        return acc;
    }, {});

    return setSheetResponse('CargaUsuariosAvulso', onboardingMap, res);
});

module.exports = downloadsRouter;