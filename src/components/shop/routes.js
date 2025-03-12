const express = require('express');

const { validateTokenRoute, isEngagementManager, hasFeature } = require('../../utils/middlewares');
const { shopMiddleware } = require('./middlewares');

const userRouter = require('./routes/user.routes');
const adminRouter = require('./routes/admin.routes');

const shopRouter = express.Router();

shopRouter.use(validateTokenRoute);

shopRouter.use(hasFeature(['gamefication', 'shop']));

shopRouter.use(shopMiddleware);

shopRouter.use('/', userRouter);

shopRouter.use('/admin', isEngagementManager, adminRouter);

module.exports = shopRouter;
