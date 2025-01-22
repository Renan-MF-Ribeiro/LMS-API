const express = require('express');

const { validateTokenRoute, isAdminOrAccountant } = require('../../utils/middlewares');
const { shopMiddleware } = require('./middlewares');

const userRouter = require('./routes/user.routes');
const adminRouter = require('./routes/admin.routes');

const shopRouter = express.Router();

shopRouter.use(validateTokenRoute);

shopRouter.use(shopMiddleware);

shopRouter.use('/', userRouter);

shopRouter.use('/admin', isAdminOrAccountant, adminRouter);

module.exports = shopRouter;
