const fs = require('fs')
const path = require('path')
const shelljs = require('shelljs')
const hasha = require('hasha')
const { UPLOADS_PATH } = process.env

module.exports = {
    OBJECTID_REGEX: /^[a-f\d]{24}$/i,

    rmUploads (glob) {
        shelljs.rm('-Rf', path.join(UPLOADS_PATH, glob))
    },

    readFile (file) {
        return fs.readFileSync(file)
    },

    readStream (file) {
        return fs.createReadStream(file)
    },

    async delay (ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },

    async hashFiles (...files) {
        return Promise.all(files.map(hasha.fromFile))
    },
}
