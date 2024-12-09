require('dotenv').config();
require('express-async-errors');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
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
    setCurrentFeatures,
} = require('./utils/middlewares');
const { PUBLIC_PATH } = process.env;
const app = express();
const passport = require('./utils/passport');

const { errorHandler } = require('./utils/errors');

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
const calendarRoutes = require('./components/calendar/routes');
const certificateRoutes = require('./components/certificates/routes');
const dimensionRoutes = require('./components/dimensions/routes');
const partnerRoutes = require('./components/partners/routes');
const trainingRouter = require('./components/training/routes');
const feedRoutes = require('./components/feed/routes');
const configRouter = require('./components/config/routes');
const { socialApiMiddleware } = require('./components/social/http-adapter');

const corsOptions = {
    origin: [
        process.env.DOMAIN,
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

if (process.env.NODE_ENV !== 'production') {
    corsOptions.origin = '*';
}

app.disable('x-powered-by');

app.disable('server');

app.use(cors(corsOptions));

app.use(helmet({
    referrerPolicy: { policy: 'same-origin' },
}));

app.use(htmlInjection(path.resolve(PUBLIC_PATH)));

app.set('trust proxy', 1);

app.use(rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 600, // Limit each IP to 100 requests per `window` (here, per 5 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.includes('/tracking') // Skip rate limit for tracking routes
}));

app.use(noCache());

app.use(morgan('dev'));

app.use(bodyParser.json({ limit: '500mb' }));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(express.static(path.resolve(PUBLIC_PATH)));

app.get('/', (req, res) => {
    res.sendFile(path.resolve(path.join(PUBLIC_PATH, 'index.html')));
});

app.use(passport.initialize());

app.use(passport.session());

app.use(socialApiMiddleware)

app.use(setCurrentFeatures);

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
    .use('/calendar', validateTokenRoute, calendarRoutes)
    .use('/alura', validateTokenRoute, aluraRoutes)
    .use('/theme', themeRoutes)
    .use('/unsplash', validateTokenRoute, unsplashRoutes)
    .use('/dashboard', validateTokenRoute, dashboardRoutes)
    .use('/certificates', certificateRoutes)
    .use('/dimensions', dimensionRoutes)
    .use('/partners', partnerRoutes)
    .use('/training', trainingRouter)
    .use('/feed', feedRoutes)
    .use('/config', configRouter)
    .use(
        '/assessment',
        isAssessmentActive,
        validateTokenRoute,
        assessmentRoutes
    );

app.use(errorHandler);

module.exports = app;
