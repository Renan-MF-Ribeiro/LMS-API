require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const noCache = require('nocache');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const {
    htmlInjection,
    validateTokenRoute,
    isAssessmentActive,
    isShowcaseActive,
} = require('./utils/middlewares');
const { PUBLIC_PATH } = process.env;
const app = express();
const passport = require('./utils/passport');
const config = require('../config.json');

var corsOptions = {
    origin: [
        process.env.DOMAIN,
        'http://localhost:4200',
        'https://monitoring.happlearning.com.br',
    ],
    credentials: true,
    allowedHeaders: [
        'Content-Type',
        'Range',
        'X-CSRF-TOKEN',
        'Authorization',
        'Mfatoken',
    ],
    exposedHeaders: [
        'Accept-Ranges',
        'Content-Encoding',
        'Content-Length',
        'Content-Range',
    ],
};
//

// if (process.env.NODE_ENV === 'local') {
//     corsOptions = Object.assign(corsOptions, { origin: 'http://localhost:4200' })
// }

app.use(cors(corsOptions));

app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(htmlInjection(path.resolve(PUBLIC_PATH)));

app.use(noCache());
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

app.use(morgan('dev'));

app.use(
    bodyParser.json({
        limit: '100mb',
    })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.resolve(PUBLIC_PATH)));
app.get('/', (req, res) => {
    res.sendFile(path.resolve(path.join(PUBLIC_PATH, 'index.html')));
});

app.use(passport.initialize());
app.use(passport.session());

const usersRoutes = require('./components/users/routes');
const itemsRoutes = require('./components/items/routes');
const trackingRoutes = require('./components/tracking/routes');
const trailsRoutes = require('./components/trails/routes');
const assessmentsRoutes = require('./components/assessments/routes');
const sectionsRoutes = require('./components/sections/routes');
const groupsRoutes = require('./components/groups/routes');
const profilesRoutes = require('./components/profiles/routes');
const coursesRoutes = require('./components/courses/routes');
const onboardingRoutes = require('./components/onboarding/routes');
const reportsRoutes = require('./components/reports/routes');
const homeRoutes = require('./components/home/routes');
const cronRoutes = require('./components/crons/routes');
const logsRoutes = require('./components/logs/routes');
const xapiRoutes = require('./components/xapi/routes');
const supplierRoutes = require('./components/suppliers/routes');
const termsOfUseRoutes = require('./components/terms-of-use/routes');
const messagesRoutes = require('./components/messages/routes');
const showCaseRoutes = require('./components/showcase/routes');
const channelRoutes = require('./components/channels/routes');
const newMessagesRoutes = require('./components/new-messages/routes');
const gamificationRoutes = require('./components/gamification/routes');
const systemUsersRoutes = require('./components/system-users/routes');
const socialRoutes = require('./components/social/routes');
const padletRoutes = require('./components/padlets/routes');
const supportRoutes = require('./components/support/routes');
const aluraRoutes = require('./components/alura/routes');
const dashboardRoutes = require('./components/dashboard/routes');
const unsplashRoutes = require('./components/unsplash/routes');
const assessmentRoutes = require('./components/assessment/routes');
const themeRoutes = require('./components/theme/routes');

app.use('/items', validateTokenRoute, itemsRoutes)
    .use('/tracking', validateTokenRoute, trackingRoutes)
    .use('/trails', validateTokenRoute, trailsRoutes)
    .use('/evaluations', validateTokenRoute, assessmentsRoutes)
    .use('/sections', validateTokenRoute, sectionsRoutes)
    .use('/users', usersRoutes)
    .use('/groups', validateTokenRoute, groupsRoutes)
    .use('/profiles', validateTokenRoute, profilesRoutes)
    .use('/courses', validateTokenRoute, coursesRoutes)
    .use('/onboarding', validateTokenRoute, onboardingRoutes)
    .use('/reports', reportsRoutes)
    .use('/home', validateTokenRoute, homeRoutes)
    .use('/crons', validateTokenRoute, cronRoutes)
    .use('/logs', validateTokenRoute, logsRoutes)
    .use('/xapi', validateTokenRoute, xapiRoutes)
    .use('/suppliers', supplierRoutes)
    .use('/terms-of-use', validateTokenRoute, termsOfUseRoutes)
    .use('/showcase', isShowcaseActive, showCaseRoutes)
    .use('/channels', validateTokenRoute, channelRoutes)
    .use('/messages', validateTokenRoute, messagesRoutes)
    .use('/messages/v2', validateTokenRoute, newMessagesRoutes)
    .use('/gamification', validateTokenRoute, gamificationRoutes)
    .use('/connect-key', validateTokenRoute, systemUsersRoutes)
    .use('/social', validateTokenRoute, socialRoutes)
    .use('/padlets', validateTokenRoute, padletRoutes)
    .use('/support', supportRoutes)
    .use('/alura', validateTokenRoute, aluraRoutes)
    .use('/theme', themeRoutes)
    .use('/unsplash', validateTokenRoute, unsplashRoutes)
    .use('/dashboard', validateTokenRoute, dashboardRoutes)
    .use(
        '/assessment',
        isAssessmentActive,
        validateTokenRoute,
        assessmentRoutes
    );

app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err);
    res.status(403);
    res.json('Formulário inválido');
});

module.exports = app;
