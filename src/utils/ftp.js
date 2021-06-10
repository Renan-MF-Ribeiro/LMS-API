const Client = require('ssh2-sftp-client')
const path = require('path')
const fs = require('fs')
const sftp = new Client()
const config = {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
}

const remotePath = '/home/happmobi/prod/AcademiaModaCEA_cargaUsuarios.csv'
const localPath = path.resolve() + '/src/public/cargas/'

module.exports = {
    downloadFile () {
        return new Promise((resolve, reject) => {
            sftp.connect(config)
                .then(async () => {
                    sftp.exists(remotePath)
                        .then(async data => {
                            if (!data) reject(new Error('Arquivo não encontrado'))
                            let count = await countFiles()
                            if (count >= 14) {
                                count = await getLastFile()
                            }
                            sftp.fastGet(remotePath, localPath + `AcademiaModaCEA_cargaUsuarios_${count + 1}.CSV`)
                                .then(async () => {
                                    sftp.end()
                                    resolve(localPath + `AcademiaModaCEA_cargaUsuarios_${count + 1}.CSV`)
                                })
                                .catch(error => {
                                    sftp.end()
                                    reject(error)
                                })
                        })
                        .catch(error => {
                            sftp.end()
                            reject(error)
                        })
                })
                .catch(error => {
                    sftp.end()
                    reject(error)
                })
        })
    },
    getFiles () {
        return new Promise((resolve, reject) => {
            fs.readdir(localPath, (err, files) => {
                if (err) reject(err)
                resolve(files)
            })
        })
    },
    deleteFile (file) {
        return new Promise((resolve, reject) => {
            fs.unlink(localPath + `AcademiaModaCEA_cargaUsuarios_${file}.CSV`, err => {
                if (err) reject(err)
                resolve()
            })
        })
    },
    getOldFile () {
        return new Promise((resolve, reject) => {
            fs.readdir(localPath, (err, files) => {
                if (err) reject(err)
                const arrNumbers = []
                for (const f in files) {
                    const splitNameFile = files[f].split('_')
                    const number = splitNameFile[2].split('.')
                    arrNumbers.push(parseInt(number[0]))
                }

                resolve(Math.min(...arrNumbers))
            })
        })
    },
}

function countFiles () {
    return new Promise((resolve, reject) => {
        fs.readdir(localPath, (err, files) => {
            if (err) reject(err)
            resolve(files.length)
        })
    })
}

function getLastFile () {
    return new Promise((resolve, reject) => {
        fs.readdir(localPath, (err, files) => {
            if (err) reject(err)
            const arrNumbers = []
            for (const f in files) {
                const splitNameFile = files[f].split('_')
                const number = splitNameFile[2].split('.')
                arrNumbers.push(parseInt(number[0]))
            }

            resolve(Math.max(...arrNumbers))
        })
    })
}
