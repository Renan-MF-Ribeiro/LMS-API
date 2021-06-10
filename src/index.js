require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const { isAdmin } = require('./utils/middlewares')
const {
    htmlInjection,
    validateTokenRoute,
} = require('./utils/middlewares')
const { PUBLIC_PATH } = process.env
const app = express()

const env = process.env.NODE_ENV
const origins = env === 'production' ? ['https://pearson.com.br', 'https://www.pearson.com.br'] : env === 'staging' ? ['https://pearson.happmobi.com.br'] : ['http://localhost:4200']
var corsOptions = {
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Range', 'X-CSRF-TOKEN', 'Authorization'],
    exposedHeaders: ['Accept-Ranges', 'Content-Encoding', 'Content-Length', 'Content-Range'],
}
app.use(cors(corsOptions))
app.use(helmet({ frameguard: false }))
app.use(helmet.xssFilter())
app.use(helmet.noSniff())
app.use(htmlInjection(path.resolve(PUBLIC_PATH)))
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", 'lmspearsonblob.blob.core.windows.net'],
        frameSrc: ["'self'", 'www.youtube.com'],
    },
}))
app.use(helmet.noCache())
app.use(helmet.referrerPolicy({ policy: 'same-origin' }))
app.use(helmet.featurePolicy({
    features: {
        camera: ["'none'"],
        microphone: ["'none'"],
        pictureInPicture: ["'none'"],
        usb: ["'none'"],
    },
}))

app.use(morgan('dev'))

app.use(bodyParser.json({
    limit: '100mb',
}))
app.use(cookieParser('', { domain: origins }))
app.use(express.static(path.resolve(PUBLIC_PATH)))
app.get('/', (req, res) => {
    res.sendFile(path.resolve(path.join(PUBLIC_PATH, 'index.html')))
})

const usersRoutes = require('./components/users/routes')
const itemsRoutes = require('./components/items/routes')
const trackingRoutes = require('./components/tracking/routes')
const trailsRoutes = require('./components/trails/routes')
const assessmentsRoutes = require('./components/assessments/routes')
const sectionsRoutes = require('./components/sections/routes')
const groupsRoutes = require('./components/groups/routes')
const profilesRoutes = require('./components/profiles/routes')
const coursesRoutes = require('./components/courses/routes')
const onboardingRoutes = require('./components/onboarding/routes')
const reportsRoutes = require('./components/reports/routes')
const homeRoutes = require('./components/home/routes')
const cronRoutes = require('./components/crons/routes')
const logsRoutes = require('./components/logs/routes')
const xapiRoutes = require('./components/xapi/routes')
const supplierRoutes = require('./components/suppliers/routes')

app
    .use('/items', validateTokenRoute, itemsRoutes)
    .use('/tracking', validateTokenRoute, trackingRoutes)
    .use('/trails', validateTokenRoute, trailsRoutes)
    .use('/evaluations', validateTokenRoute, assessmentsRoutes)
    .use('/sections', validateTokenRoute, sectionsRoutes)
    .use('/users', usersRoutes)
    .use('/groups', validateTokenRoute, groupsRoutes)
    .use('/profiles', validateTokenRoute, profilesRoutes)
    .use('/courses', validateTokenRoute, coursesRoutes)
    .use('/onboarding', validateTokenRoute, onboardingRoutes)
    .use('/reports', validateTokenRoute, reportsRoutes)
    .use('/home', validateTokenRoute, homeRoutes)
    .use('/crons', validateTokenRoute, cronRoutes)
    .use('/logs', validateTokenRoute, logsRoutes)
    .use('/xapi', validateTokenRoute, xapiRoutes)
    .use('/suppliers', supplierRoutes)


app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err)
    res.status(403)
    res.json('Formulário inválido')
})

module.exports = app
