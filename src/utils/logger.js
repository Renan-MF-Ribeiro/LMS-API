const debug = require('debug')

const namespace = 'happlearning'

const logger = {
    log: debug(`${namespace}:log`),
    info: debug(`${namespace}:info`),
    error: debug(`${namespace}:error`),
    warn: debug(`${namespace}:warn`),
}

for (const k in logger) {
    // eslint-disable-next-line no-console
    logger[k].log = console[k].bind(console)
}

module.exports = logger
