const ClientSftp = require('ssh2-sftp-client')
const ClientFtp = require('ftp')
const path = require('path')
const fs = require('fs')
const sftp = new ClientSftp()
const config = {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
}

const configDegreed = {
    host: process.env.SFTP_HOST_DEGREED,
    port: process.env.SFTP_PORT_DEGREED,
    user: process.env.SFTP_USERNAME_DEGREED,
    password: process.env.SFTP_PASSWORD_DEGREED,
}

const remotePath = process.env.SFTP_PATH
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
                            sftp.fastGet(remotePath, localPath + `${process.env.SFTP_FILENAME_CLIENT}_cargaUsuarios_${count + 1}.CSV`)
                                .then(async () => {
                                    sftp.end()
                                    resolve(localPath + `${process.env.SFTP_FILENAME_CLIENT}_cargaUsuarios_${count + 1}.CSV`)
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
            fs.unlink(localPath + `${process.env.SFTP_FILENAME_CLIENT}_cargaUsuarios_${file}.CSV`, err => {
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
    uploadFileDegreed (localFile, remoteFile) {
        if (process.env.SFTP_ENABLE_DEGREED !== 'true') {
            // console.log('Executação bloqueada, ambiente não é prod.')
            return
        }

        const client = new ClientFtp()

        client.on('ready', () => {
            client.put(localFile, remoteFile, err => {
                if (err) throw err
                fs.unlink(localFile, err => {
                    if (err) throw err
                    // console.log(localFile + 'was deleted')
                    client.end()
                })
            })
        })

        client.on('error', err => {
            if (err) {
                client.end()
            }
            client.end()
        })

        client.on('greeting', msg => {
            // console.log(msg)
        })

        client.connect(configDegreed)
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
