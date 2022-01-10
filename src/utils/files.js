const path = require('path')
const iconv = require('iconv-lite')
const shelljs = require('shelljs')
const revHash = require('rev-hash')
const mime = require('mime-types')
const xlsx = require('read-excel-file/node')
const csv = require('csv-parser')
const fs = require('fs')
const isStream = require('is-stream')
const Vimeo = require('vimeo').Vimeo
const { pipe, test, reject } = require('ramda')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const createObjectCsvStringifier = require('csv-writer').createObjectCsvStringifier
const aws = require('aws-sdk')
const { BlobServiceClient } = require('@azure/storage-blob')
const { ShareServiceClient } = require('@azure/storage-file-share')
const momentz = require('moment-timezone')
const ExcelJS = require('exceljs')
const _functions = require('./functions')
const { mapUser } = require('./../components/users/model')
const { Item, VimeoItem } = require('../components/items/model')
const { sleep } = require('./functions')
const { sendMessageToKafka } = require('../../src/components/messages/business')

const bucket = process.env.BUCKET
aws.config = { accessKeyId: process.env.ACCESSKEY, secretAccessKey: process.env.SECRETKEY, region: process.env.REGION }

const { PUBLIC_PATH, UPLOADS_PATH, AZURE_STRINGCONN, AZURE_BLOBNAME, AZURE_ACCESSKEY } = process.env

shelljs.mkdir('-p', UPLOADS_PATH)

async function streamToBuffer (readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = []
        readableStream.on('data', data => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data))
        })
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks))
        })
        readableStream.on('error', reject)
    })
}

module.exports = {
    awsAmazon (file, folder) {
        return new Promise((resolve, reject) => {
            const s3 = new aws.S3()

            let file$
            let filePath
            let fileType
            if (isStream(file)) {
                file$ = file
                filePath = folder + '/' + file.path
                fileType = mime.lookup(file.path) || 'text/plain'
            } else {
                const ext = mime.extension(file.type)
                file$ = fs.createReadStream(file.path)
                fileType = file.type
                filePath = folder + '/' + path.basename(`${file.path}.${ext}`)
            }

            const params = {
                Bucket: bucket,
                Key: filePath,
                Body: file$,
                ContentType: fileType,
                ACL: 'public-read',
            }

            s3.upload(params, function (err, some) {
                if (err) {
                    reject(err)
                } else {
                    resolve(some.Location)
                }
            })
        })
    },

    async azureBlob (file, folder) {
        // return new Promise((resolve, reject) => {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STRINGCONN)
        blobServiceClient.get

        const containerClient = blobServiceClient.getContainerClient('lmsassets')
        // containerClient.create();
        // console.log(containerClient)

        let file$
        let filePath
        let fileType
        if (isStream(file)) {
            file$ = file
            filePath = folder + '/' + file.path
            fileType = mime.lookup(file.path) || 'text/plain'
        } else {
            const ext = mime.extension(file.type)
            file$ = fs.createReadStream(file.path)
            fileType = file.type
            filePath = folder + '/' + path.basename(`${file.path}.${ext}`)
        }

        const blockBlobClient = containerClient.getBlockBlobClient(filePath)
        const blobOptions = { blobHTTPHeaders: { blobContentType: fileType } }
        const uploadBlobResponse = await blockBlobClient.uploadStream(file$, file.size, undefined, blobOptions)

        return decodeURIComponent(blockBlobClient.url)
        // })
    },

    async getAzureFile () {
        const fileShareServiceClient = ShareServiceClient.fromConnectionString(AZURE_STRINGCONN)
        const fileShareClient = fileShareServiceClient.getShareClient('sftpfileshare').rootDirectoryClient.getFileClient('CargaUsuarios (1).xlsx')

        const downloadFileResponse = await fileShareClient.download()
        return await streamToBuffer(downloadFileResponse.readableStreamBody)
        // return await streamToBuffer(downloadFileResponse.readableStreamBody)
    },

    vimeoFilePath (file, payload, user, mode = "create") {
        let filePath
        let fileType
        let uploadStatus
        if (isStream(file)) {
            filePath = file.path
            fileType = mime.lookup(file.path) || 'text/plain'
        } else {
            const ext = mime.extension(file.type)
            filePath = `${file.path}.${ext}`
        }

        const campainObj = function () {
            const title = 'Video upload'
            const text = 'Efetuado upload na plataforma Vimeo!'
            const communication = ['notification']
            const category = 'charge'
            const mode = 'automatic'
            const target = { url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/home`, trailid: '', item: '' }
            return { title, text, communication, category, target, mode }
        }

        const vimeoTrx = new Vimeo(
            process.env.VIMEO_CLIENTID,
            process.env.VIMEO_CLIENTSECRET,
            process.env.VIMEO_ACCESSTOKEN,
        )

        vimeoTrx.upload(
            String(file.path),
            function (uri) {
                uploadStatus = 'Upload was done!'
                console.log('Upload was done!', uri)
                const trx = async () => {
                    console.log(payload)
                    await sleep(3000)
                    const { _id } = await Item.findOne({
                        title: { $eq: payload.title },
                        contentPath: { $eq: payload.contentPath },
                    })
                    await VimeoItem.findByIdAndUpdate(_id, {
                        contentPath: 'https://vimeo.com' + uri,
                    })

                    const campObj = campainObj()
                    await sendMessageToKafka(campObj, [user])
                }
                trx()
            },
            function (bytes_uploaded, bytes_total) {
                var percentage = (bytes_uploaded / bytes_total * 100).toFixed(2)
                console.log(bytes_uploaded, bytes_total, percentage + '%')
            },
            function (error) {
                uploadStatus = { message: 'Something went wrong', error: error }
                console.error('Something went wrong: ' + error)
                const trx = async () => {
                    await Item.findOneAndDelete({
                        title: { $eq: payload.title },
                        contentPath: { $eq: payload.contentPath },
                    })
                }
                if(mode === "create"){
                    trx()
                }
            },
        )

        return uploadStatus
    },

    async moveUpload (file) {
        if (!file) return null

        const hash = revHash(file.path)
        let ext = mime.extension(file.type)
        ext = ext === 'jpeg' ? 'jpg' : ext

        const _path = path.join(UPLOADS_PATH, `${hash}.${ext}`)
        shelljs.mv(file.path, _path)
        return path.relative(PUBLIC_PATH, _path)
    },

    isSCORMManifestFile: pipe(path.basename, test(/^imsmanifest\.xml$/i)),
    isSCORMSchemaFile: pipe(path.basename, test(/^(adlcp_rootv1p2|ims_xml|imscp_rootv1p1p2|imsmd_rootv1p2p1)\.xsd$/i)),

    mkdirSCORM (packageId) {
        const _path = path.join(UPLOADS_PATH, 'scorm', packageId)

        try {
            shelljs.mkdir('-p', _path)
        } catch { }

        return _path
    },

    mvFile (file, name) {
        return new Promise((resolve, reject) => {
            try {
                const _path = path.join(UPLOADS_PATH, name)
                shelljs.mv(file, _path)
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },

    readXLSX (file) {
        return new Promise((resolve, reject) => {
            xlsx(file)
                .then(rows => {
                    resolve(rows)
                })
                .catch(error => {
                    console.log(error)
                    reject(error)
                })
        })
    },

    readXLSXAlternative (file) {
        return new Promise((resolve, reject) => {
            const workbook = new ExcelJS.Workbook()
            workbook.xlsx.readFile(file).then(() => {
                var worksheet = workbook.getWorksheet('Planilha1')
                const rows = []
                worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
                    rows.push(row.values)
                })
                resolve(rows)
            })
        })
    },

    formatCnpj (value) {
        const formatValue = value.replace(/[^\w\s]/gi, '')
        return formatValue
    },

    readXLSXUsers (file) {
        return new Promise((resolve, reject) => {
            const workbook = new ExcelJS.Workbook()
            workbook.xlsx.readFile(file)
                .then(function () {
                    var worksheet = workbook.getWorksheet('Sua CargaUsuario Aqui')
                    var objPattern = []
                    var objUsers = []

                    worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
                        if (objPattern.length == 0) {
                            for (var i = 0; i < row.values.length; i++) {
                                let labelCarga = row.values[i] ? _functions.clearString(row.values[i]) : row.values[i]

                                labelCarga = String(labelCarga).toUpperCase()

                                const labelDB = mapUser[labelCarga]
                                console.log(labelDB)

                                objPattern.push(labelDB)
                            }
                        } else {
                            const tmpUser = {}

                            for (var i = 0; i < row.values.length; i++) {
                                const val = typeof (row.values[i]) === 'object' && row.values[i].text != undefined ? row.values[i].text : row.values[i]
                                const tmpValue = String(row.values[i]) != 'undefined' ? String(val) : ''
                                tmpUser[objPattern[i]] = tmpValue
                            }

                            delete tmpUser.undefined

                            if (tmpUser[objPattern[1]] != objPattern[1]) {
                                objUsers.push(tmpUser)
                            }
                        }
                    })
                    resolve(objUsers)
                })
        })
    },
    readXLSXUsersBuffer (file) {
        return new Promise((resolve, reject) => {
            const workbook = new ExcelJS.Workbook()
            workbook.xlsx.load(file)
                .then(function () {
                    var worksheet = workbook.getWorksheet('Sua CargaUsuario Aqui')
                    var objPattern = []
                    var objUsers = []

                    worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
                        if (objPattern.length == 0) {
                            for (var i = 0; i < row.values.length; i++) {
                                let labelCarga = row.values[i] ? _functions.clearString(row.values[i]) : row.values[i]

                                labelCarga = String(labelCarga).toUpperCase()

                                const labelDB = mapUser[labelCarga]

                                objPattern.push(labelDB)
                            }
                        } else {
                            const tmpUser = {}

                            for (var i = 0; i < row.values.length; i++) {
                                const val = typeof (row.values[i]) === 'object' && row.values[i].text != undefined ? row.values[i].text : row.values[i]
                                const tmpValue = String(row.values[i]) != 'undefined' ? String(val) : ''
                                tmpUser[objPattern[i]] = tmpValue
                            }

                            delete tmpUser.undefined

                            if (tmpUser[objPattern[1]] != objPattern[1]) {
                                objUsers.push(tmpUser)
                            }
                        }
                    })
                    resolve(objUsers)
                })
        })
    },

    readCSV (file) {
        return new Promise((resolve, reject) => {
            try {
                const results = []
                fs.createReadStream(file)
                    .pipe(iconv.decodeStream('iso-8859-15'))
                    .pipe(csv({ separator: ';' }))
                    .on('data', data => results.push(data))
                    .on('end', () => {
                        resolve(results)
                    })
            } catch (error) {
                reject(error)
            }
        })
    },

    writeFile (header, records) {
        return new Promise((resolve, reject) => {
            const csvWriter = createCsvWriter({
                path: path.resolve() + '/src/public/lista_usuarios.csv',
                header,
            })

            csvWriter.writeRecords(records)
                .then(() => {
                    resolve()
                })
                .catch(error => {
                    reject(error)
                })
        })
    },

    writeFileLogs (header, records) {
        return new Promise((resolve, reject) => {
            const csvWriter = createCsvWriter({
                path: path.resolve() + `/src/public/logs_${momentz().format('HHmmss')}.csv`,
                header,
                encoding: 'utf8',
            })

            csvWriter.writeRecords(records)
                .then(() => {
                    resolve()
                })
                .catch(error => {
                    reject(error)
                })
        })
    },

    createCSVString (header, records) {
        const csvStringfier = createObjectCsvStringifier({
            header,
            encoding: 'utf8',
        })

        const csvString = [
            csvStringfier.getHeaderString(),
            csvStringfier.stringifyRecords(records),
        ].join('')

        return csvString
    },

    async moveUserLoadToProcessed (buffer) {
        try {
            const env = process.env.NODE_ENV
            const directory = env === 'production' ? 'producao' : 'homologacao'
            const fileShareServiceClient = ShareServiceClient.fromConnectionString(AZURE_STRINGCONN)

            await fileShareServiceClient.getShareClient('sftpfileshare').getDirectoryClient(directory).deleteFile('Happmobi_Carga.csv')

            const completeDate = new Date().toLocaleString('pt-BR').split(' ')
            const date = completeDate[0].replace('/', '').replace('/', '')
            const hours = completeDate[1].replace(':', '').replace(':', '')
            const fileName = `Happmobi_${date}_${hours}.csv`
            await fileShareServiceClient.getShareClient('sftpfileshare').getDirectoryClient(directory).getDirectoryClient('processados').createFile(fileName, 4000000)

            await fileShareServiceClient.getShareClient('sftpfileshare').getDirectoryClient(directory).getDirectoryClient('processados').getFileClient(fileName).uploadData(buffer)
        } catch (error) {
            console.log('Error', error)
        }
    },
}
