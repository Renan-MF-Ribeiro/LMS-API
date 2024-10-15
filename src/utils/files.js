const path = require('path');
const iconv = require('iconv-lite');
const shelljs = require('shelljs');
const revHash = require('rev-hash');
const mime = require('mime-types');
const xlsx = require('read-excel-file/node');
const csv = require('csv-parser');
const fs = require('fs');
const isStream = require('is-stream');
const Vimeo = require('vimeo').Vimeo;
const { pipe, test, reject } = require('ramda');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const createObjectCsvStringifier =
    require('csv-writer').createObjectCsvStringifier;
const aws = require('aws-sdk');
const { BlobServiceClient } = require('@azure/storage-blob');
const { ShareServiceClient } = require('@azure/storage-file-share');
const momentz = require('moment-timezone');
const ExcelJS = require('exceljs');
const axios = require('axios');
const _functions = require('./functions');
const { mapUserOld, defaultUserMap } = require('./../components/users/model');
const { Item, MediaItem } = require('../components/items/model');
const { sleep } = require('./functions');
const {
    sendMessageToKafka,
} = require('../../src/components/new-messages/business');
const { Readable } = require('stream');
const configJson = require('../../config.json');
const { Log } = require('../components/logs/model');
const bucket = process.env.BUCKET;
aws.config = {
    accessKeyId: process.env.ACCESSKEY,
    secretAccessKey: process.env.SECRETKEY,
    region: process.env.REGION,
};

const {
    PUBLIC_PATH,
    UPLOADS_PATH,
    AZURE_STRINGCONN,
    AZURE_BLOBNAME,
    AZURE_ACCESSKEY,
    AZURE_BLOB_URL,
    DOMAIN,
} = process.env;

shelljs.mkdir('-p', UPLOADS_PATH);

async function streamToBuffer (readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}

function bufferToStream (binary) {
    const readableInstanceStream = new Readable({
        read () {
            this.push(binary);
            this.push(null);
        },
    });

    return readableInstanceStream;
}

const forEachRowCSV = (
    row,
    rowNumber,
    map,
    labels,
    users,
    previousHyperLink
) => {
    if (rowNumber === 1) {
        // rowNumber === 1 means its headers
        for (const columnHeader of row.values) {
            const mapEntries = Object.entries(map);
            const labelDB = mapEntries.find(
                (entry) => entry[1] && columnHeader && entry[1] === columnHeader
            )?.[0];
            labels.push(labelDB);
        }
    } else {
        const tmpUser = {};
        previousHyperLink.index = -1;

        for (const value of row.values) {
            if (!value) continue;

            let labelIndex;
            if (value.text) {
                row.values.find((findValue, findIndex) => {
                    if (!findValue?.text) return false;
                    labelIndex = findIndex;
                    return (
                        findValue &&
                        value &&
                        findValue.text &&
                        value.text &&
                        findValue.text === value.text &&
                        (previousHyperLink.index === -1 ||
                            findIndex > previousHyperLink.index)
                    );
                });
                previousHyperLink.index = labelIndex;
            } else {
                row.values.find((findValue, findIndex) => {
                    if (findValue?.text) return false;
                    if (
                        tmpUser[labels[findIndex]] &&
                        tmpUser[labels[findIndex]] === findValue
                    )
                        return false;

                    labelIndex = findIndex;
                    return findValue === value;
                });
            }

            if (labels[labelIndex] && row.values[labelIndex]) {
                let tmpValue =
                    row.values[labelIndex].text ?? row.values[labelIndex] ?? '';

                if (typeof tmpValue === 'string') {
                    tmpValue = tmpValue.trim()
                }
                tmpUser[labels[labelIndex]] = tmpValue;
            }
        }
        users.push(tmpUser);
    }
};

const forEachRow = (row, rowNumber, map, labels, users, previousHyperLink) => {
    if (rowNumber === 1) {
        // rowNumber === 1 means its headers
        for (const columnHeader of row.values) {
            const mapEntries = Object.entries(map);
            const labelDB = mapEntries.find(
                (entry) => entry[1] && columnHeader && entry[1] === columnHeader
            )?.[0];
            labels.push(labelDB);
        }
    } else {
        const tmpUser = {};
        previousHyperLink.index = -1;

        for (const value of row.values) {
            if (!value) continue;

            let i;
            if (value.text) {
                row.values.find((findValue, findIndex) => {
                    if (!findValue?.text) return false;
                    i = findIndex;
                    return (
                        findValue &&
                        value &&
                        findValue.text &&
                        value.text &&
                        findValue.text === value.text &&
                        (previousHyperLink.index === -1 ||
                            findIndex > previousHyperLink.index)
                    );
                });
                previousHyperLink.index = i;
            } else {
                row.values.find((findValue, findIndex) => {
                    if (findValue?.text) return false;
                    if (
                        tmpUser[labels[findIndex]] &&
                        tmpUser[labels[findIndex]] === findValue
                    )
                        return false;

                    i = findIndex;
                    return findValue === value;
                });
            }

            if (labels[i] && row.values[i]) {
                tmpUser[labels[i]] = row.values[i].text ?? row.values[i] ?? '';
            }
        }
        users.push(tmpUser);
    }
};

module.exports = {
    // awsAmazon(file, folder) {
    //     return new Promise((resolve, reject) => {
    //         const s3 = new aws.S3();

    //         let file$;
    //         let filePath;
    //         let fileType;
    //         if (isStream(file)) {
    //             file$ = file;
    //             filePath = folder + '/' + file.path;
    //             fileType = mime.lookup(file.path) || 'text/plain';
    //         } else {
    //             const ext = mime.extension(file.type);
    //             file$ = fs.createReadStream(file.path);
    //             fileType = file.type;
    //             filePath = folder + '/' + path.basename(`${file.path}.${ext}`);
    //         }

    //         const params = {
    //             Bucket: bucket,
    //             Key: filePath,
    //             Body: file$,
    //             ContentType: fileType,
    //             ACL: 'public-read',
    //         };

    //         s3.upload(params, function (err, some) {
    //             if (err) {
    //                 reject(err);
    //             } else {
    //                 resolve(some.Location);
    //             }
    //         });
    //     });
    // },

    async azureBlob (
        file,
        folder,
        ignoreStream = false,
        container = 'lmsassets'
    ) {
        // return new Promise((resolve, reject) => {
        const blobServiceClient =
            BlobServiceClient.fromConnectionString(AZURE_STRINGCONN);

        const containerClient = blobServiceClient.getContainerClient(container);
        // containerClient.create();
        // console.log(containerClient)

        let file$;
        let filePath;
        let fileType;

        if (isStream(file) || ignoreStream) {
            file$ = file;
            filePath = folder + '/' + file.path;
            fileType = mime.lookup(file.path) || 'text/plain';
        } else {
            const ext = mime.extension(file.type);
            file$ = fs.createReadStream(file.path);
            fileType = file.type;
            filePath = folder + '/' + path.basename(`${file.path}.${ext}`);
        }

        const blockBlobClient = containerClient.getBlockBlobClient(filePath);
        const blobOptions = { blobHTTPHeaders: { blobContentType: fileType } };
        const uploadBlobResponse = await blockBlobClient.uploadStream(
            file$,
            file.size || file?.vars?.uncompressedSize || undefined,
            undefined,
            blobOptions
        );
        let url = decodeURIComponent(blockBlobClient.url);

        url =
            process.env.NODE_ENV === 'local'
                ? url
                : url.replace(
                    AZURE_BLOB_URL.substring(
                        0,
                        AZURE_BLOB_URL.lastIndexOf('/')
                    ) + `/${container}`,
                    DOMAIN
                );

        return url;
    },

    async getAzureFile () {
        try {
            const env = process.env.NODE_ENV;
            const directory = env === 'production' ? 'producao' : 'homologacao';
            const blobServiceClient =
                BlobServiceClient.fromConnectionString(AZURE_STRINGCONN);
            const containerClient =
                blobServiceClient.getContainerClient('sftp');
            const blockBlobClient = containerClient.getBlockBlobClient(
                config.userLoadCsv.active ? `${directory}/Happmobi_Carga.csv` : `${directory}/Happmobi_Carga.xlsx`
            );
            const downloadBlobResponse =
                await blockBlobClient.downloadToBuffer();

            const decodedFile = await iconv.decode(
                downloadBlobResponse,
                'iso88591'
            );
            const decodedReadStream = bufferToStream(decodedFile);

            return {
                readableStream: decodedReadStream,
                buffer: downloadBlobResponse,
            };
        } catch (error) {
            console.log(
                'Carga de usuários não encontrada no compartilhamento de arquivos'
            );
            Log.create({
                user: null,
                type: 'CREATE',
                message: 'Carga de usuários não encontrada no compartilhamento de arquivos',
                component: `CRON_DAILY_CHARGE`,
                dataNew: [],
                dataOld: [],
                route: null,
                ip: null,
                login: null,
                groups: [],
            });
            return null;
        }
        // return await streamToBuffer(downloadFileResponse.readableStreamBody)
    },

    async moveUserLoadToProcessed (buffer) {
        try {
            const env = process.env.NODE_ENV;
            const directory = env === 'production' ? 'producao' : 'homologacao';

            const blobServiceClient =
                BlobServiceClient.fromConnectionString(AZURE_STRINGCONN);
            const containerClient =
                blobServiceClient.getContainerClient('sftp');
            const blockBlobClient = containerClient.getBlobClient(
                config.userLoadCsv.active ? `${directory}/Happmobi_Carga.csv` : `${directory}/Happmobi_Carga.xlsx`
            );
            await blockBlobClient.delete();

            const completeDate = new Date().toLocaleString('pt-BR').split(' ');
            const date = completeDate[0].replace('/', '').replace('/', '');
            const hours = completeDate[1].replace(':', '').replace(':', '');
            const fileName = `Happmobi_${date}_${hours}.xlsx`;
            await containerClient
                .getBlockBlobClient(`${directory}/processados/${fileName}`)
                .uploadData(buffer);
        } catch (error) {
            console.log('Error', error);
        }
    },

    vimeoFilePathCreate (file, payload, user, mode = 'create') {
        let filePath;
        let fileType;
        let uploadStatus;
        const vimeoFolderUri = `/${configJson.vimeoFolder}`;
        if (isStream(file)) {
            filePath = file.path;
            fileType = mime.lookup(file.path) || 'text/plain';
        } else {
            const ext = mime.extension(file.type);
            filePath = `${file.path}.${ext}`;
        }

        const campainObj = function () {
            const title = 'Video upload';
            const text = 'Efetuado upload na plataforma Vimeo!';
            const communication = ['notification'];
            const category = 'charge';
            const mode = 'automatic';
            const target = {
                url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/home`,
                trailid: '',
                item: '',
            };
            return { title, text, communication, category, target, mode };
        };

        let vimeoTrx;
        setTimeout(() => {
            vimeoTrx = new Vimeo(
                process.env.VIMEO_CLIENTID,
                process.env.VIMEO_CLIENTSECRET,
                process.env.VIMEO_ACCESSTOKEN
            );
            vimeoTrx.upload(
                String(file.path),
                {
                    name: payload.title,
                    description: payload.description,
                    folder_uri: vimeoFolderUri,
                },
                function (uri) {
                    uploadStatus = 'Upload was done!';
                    console.log('Upload was done!', uri);
                    const trx = async () => {
                        await sleep(3000);
                        const vimeoId = uri.split('/')[2];
                        const { _id } = await Item.findOne({
                            title: { $eq: payload.title },
                            contentPath: { $eq: payload.contentPath },
                        });
                        await MediaItem.findByIdAndUpdate(_id, {
                            contentPath: 'https://vimeo.com/' + vimeoId,
                            vimeoId: vimeoId,
                            enabled: true,
                        });
                        const campObj = campainObj();
                        await sendMessageToKafka(campObj, [user]);
                    };
                    trx();
                },
                function (bytes_uploaded, bytes_total) {
                    var percentage = (
                        (bytes_uploaded / bytes_total) *
                        100
                    ).toFixed(2);
                    console.log(bytes_uploaded, bytes_total, percentage + '%');
                },
                function (error) {
                    uploadStatus = {
                        message: 'Something went wrong',
                        error: error,
                    };
                    console.error('Something went wrong: ' + error);
                    const trx = async () => {
                        await Item.findOneAndDelete({
                            title: { $eq: payload.title },
                            contentPath: { $eq: payload.contentPath },
                        });
                    };
                    if (mode === 'create') {
                        trx();
                    }
                }
            );

            return uploadStatus;
        }, 5000);
    },

    vimeoFilePathUpdate (file, payload, user, vimeoId) {
        let uploadStatus;
        const vimeoIdPath = `/videos/${vimeoId}`;
        const fileName = file.name;

        const campainObj = function () {
            const title = 'Video upload';
            const text = 'Efetuado upload na plataforma Vimeo!';
            const communication = ['notification'];
            const category = 'charge';
            const mode = 'automatic';
            const target = {
                url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/home`,
                trailid: '',
                item: '',
            };
            return { title, text, communication, category, target, mode };
        };

        let vimeoTrx;
        setTimeout(() => {
            vimeoTrx = new Vimeo(
                process.env.VIMEO_CLIENTID,
                process.env.VIMEO_CLIENTSECRET,
                process.env.VIMEO_ACCESSTOKEN
            );
            vimeoTrx.replace(
                String(file.path),
                vimeoIdPath,
                {
                    file_name: fileName,
                    upload: {
                        approach: 'post',
                    },
                },
                function (uri) {
                    uploadStatus = 'Upload was done!';
                    console.log('Upload was done!', uri);
                    const trx = async () => {
                        await sleep(3000);
                        const vimeoId = uri.split('/')[2];

                        const { _id } = await Item.findOne({
                            title: { $eq: payload.title },
                            contentPath: { $eq: payload.contentPath },
                        });
                        await MediaItem.findByIdAndUpdate(_id, {
                            contentPath: 'https://vimeo.com/' + vimeoId,
                            enabled: true,
                        });
                        const campObj = campainObj();
                        await sendMessageToKafka(campObj, [user]);
                    };
                    trx();
                },
                function (bytes_uploaded, bytes_total) {
                    var percentage = (
                        (bytes_uploaded / bytes_total) *
                        100
                    ).toFixed(2);
                    console.log(bytes_uploaded, bytes_total, percentage + '%');
                },
                function (error) {
                    uploadStatus = {
                        message: 'Something went wrong',
                        error: error,
                    };
                    console.error('Something went wrong: ' + error);
                }
            );

            return uploadStatus;
        }, 5000);
    },

    async moveUpload (file) {
        if (!file) return null;

        const hash = revHash(file.path);
        let ext = mime.extension(file.type);
        ext = ext === 'jpeg' ? 'jpg' : ext;

        const _path = path.join(UPLOADS_PATH, `${hash}.${ext}`);
        shelljs.mv(file.path, _path);
        return path.relative(PUBLIC_PATH, _path);
    },

    isSCORMManifestFile: pipe(path.basename, test(/^imsmanifest\.xml$/i)),
    isSCORMSchemaFile: pipe(
        path.basename,
        test(
            /^(adlcp_rootv1p2|ims_xml|imscp_rootv1p1p2|imsmd_rootv1p2p1)\.xsd$/i
        )
    ),

    mkdirSCORM (packageId) {
        const _path = path.join(UPLOADS_PATH, 'scorm', packageId);

        try {
            shelljs.mkdir('-p', _path);
        } catch { }

        return _path;
    },

    mvFile (file, name) {
        return new Promise((resolve, reject) => {
            try {
                const _path = path.join(UPLOADS_PATH, name);
                shelljs.mv(file, _path);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    readXLSX (file) {
        return new Promise((resolve, reject) => {
            xlsx(file)
                .then((rows) => {
                    resolve(rows);
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });
    },

    readXLSXAlternative (file) {
        return new Promise((resolve, reject) => {
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.readFile(file).then(() => {
                var worksheet = workbook.getWorksheet('Planilha1');
                const rows = [];
                worksheet.eachRow(
                    { includeEmpty: false },
                    function (row, rowNumber) {
                        rows.push(row.values);
                    }
                );
                resolve(rows);
            });
        });
    },

    readXLSXClassGroups (file) {
        return new Promise((resolve, reject) => {
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.readFile(file).then(function () {
                const worksheet = workbook.getWorksheet('Sua Carga Aqui');

                const labels = [];
                const classes = [];

                worksheet.eachRow(
                    { includeEmpty: false },
                    function (row, rowNumber) {
                        // if is header row
                        if (rowNumber === 1) {
                            for (value of row.values) {
                                if (value) {
                                    labels.push(value);
                                }
                            }
                        } else {
                            const classGroup = {};
                            for (const index in row.values) {
                                if (index === 0) continue;
                                classGroup[labels[index - 1]] =
                                    row.values[index];
                            }
                            classes.push(classGroup);
                        }
                    }
                );

                resolve({ classes, workbook });
            });
        });
    },

    writeXlsxClassGroupsResults (workbook, results) {
        const worksheet = workbook.getWorksheet('Sua Carga Aqui');

        worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
            // if is header row
            if (rowNumber === 1) {
                return;
            } else {
                // cell 6 is column F (STATUS) // -2 because rowNumber starts at 1 and first row is headers
                row.getCell(6).value = results[rowNumber - 2];
            }
        });

        return workbook;
    },

    /**
     * @param {string} file
     * @param {string} worksheetName
     * @returns {Promise<{ workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet, data: Record<string, string>[], labels: string[] }>}
     */
    async readXLSXAttendanceList (file, worksheetName) {
        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.readFile(file);

        const worksheet = workbook.getWorksheet(worksheetName);

        if (!worksheet) {
            throw new Error(`Planilha "${worksheetName}" não encontrada no arquivo.`);
        }

        const labelMap = {
            LOGIN: 'networkLogin',
            PRESENTE: 'presence',
            DATA_PRESENCA: 'presenceAt',
            NOTA: 'grades',
        };

        let labels = [];
        const data = [];

        worksheet.eachRow(
            { includeEmpty: false },
            (row, rowNumber) => {
                if (rowNumber === 1) {
                    labels = row.values;
                    return;
                }

                data.push(
                    row.values.reduce((acc, value, index) => {
                        const label = labels[index];
                        const mappedLabel = labelMap[label];
                        const columnValue = value?.text ?? value ?? '';

                        if (!label) return acc;

                        acc[mappedLabel ?? label] = columnValue;

                        return acc;
                    }, { rowNumber })
                );
            }
        );

        return { workbook, worksheet, data, labels, labelMap };
    },

    async readXLSXUsers (file, onboarding = false) {
        const getMapsResponse = await axios.get(
            `${process.env.API_CONNECT}/maps/${process.env.CLIENT_ID}`,
            {
                headers: {
                    'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                },
            }
        );
        const connectMaps = getMapsResponse.data;

        const map =
            connectMaps.user &&
                Object.keys(connectMaps.user).length > 0 &&
                onboarding == false
                ? connectMaps.user
                : defaultUserMap;
        return new Promise((resolve, reject) => {
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.readFile(file).then(function () {
                let worksheet = workbook.getWorksheet('Sua CargaUsuario Aqui');

                if (!worksheet) worksheet = workbook.worksheets[0];

                const labels = [];
                const users = [];
                let previousHyperLink = { index: -1 };

                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    return forEachRow(
                        row,
                        rowNumber,
                        map,
                        labels,
                        users,
                        previousHyperLink
                    );
                });

                resolve(users);
            });
        });
    },

    async readCSVUsersBuffer (file, onboarding = false) {
        const getMapsResponse = await axios.get(
            `${process.env.API_CONNECT}/maps/${process.env.CLIENT_ID}`,
            {
                headers: {
                    'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                },
            }
        );
        const connectMaps = getMapsResponse.data;

        const map =
            connectMaps.user && Object.keys(connectMaps.user).length > 0
                ? connectMaps.user
                : defaultUserMap;

        const workbook = new ExcelJS.Workbook();

        const worksheet = await workbook.csv.read(file, {
            parserOptions: { delimiter: ';' },
        });

        const labels = [];
        const users = [];
        let previousHyperLink = { index: -1 };

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            return forEachRowCSV(
                row,
                rowNumber,
                map,
                labels,
                users,
                previousHyperLink
            );
        });

        return users;
    },

    async readXLSXUsersBuffer (file) {
        const getMapsResponse = await axios.get(
            `${process.env.API_CONNECT}/maps/${process.env.CLIENT_ID}`,
            {
                headers: {
                    'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                },
            }
        );
        const connectMaps = getMapsResponse.data;

        const map =
            connectMaps.user && Object.keys(connectMaps.user).length > 0
                ? connectMaps.user
                : defaultUserMap;

        return new Promise((resolve, reject) => {
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.load(file).then(function () {
                let worksheet = workbook.getWorksheet('Sua CargaUsuario Aqui');
                if (!worksheet) worksheet = workbook.worksheets[0];

                const labels = [];
                const users = [];
                let previousHyperLink = { index: -1 };

                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    return forEachRow(
                        row,
                        rowNumber,
                        map,
                        labels,
                        users,
                        previousHyperLink
                    );
                });
                resolve(users);
            });
        });
    },

    readCSV (file) {
        return new Promise((resolve, reject) => {
            try {
                const results = [];
                fs.createReadStream(file)
                    .pipe(iconv.decodeStream('iso-8859-15'))
                    .pipe(csv({ separator: ';' }))
                    .on('data', (data) => results.push(data))
                    .on('end', () => {
                        resolve(results);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },

    writeFile (header, records) {
        return new Promise((resolve, reject) => {
            const csvWriter = createCsvWriter({
                path: path.resolve() + '/src/public/lista_usuarios.csv',
                header,
            });

            csvWriter
                .writeRecords(records)
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },

    writeFileLogs (header, records) {
        return new Promise((resolve, reject) => {
            const csvWriter = createCsvWriter({
                path:
                    path.resolve() +
                    `/src/public/logs_${momentz().format('HHmmss')}.csv`,
                header,
                encoding: 'utf8',
            });

            csvWriter
                .writeRecords(records)
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },

    createCSVString (header, records) {
        const csvStringfier = createObjectCsvStringifier({
            header,
            encoding: 'utf8',
        });

        const csvString = [
            csvStringfier.getHeaderString(),
            csvStringfier.stringifyRecords(records),
        ].join('');

        return csvString;
    },

    readXLSXHeaders (file) {
        return new Promise((resolve, reject) => {
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.readFile(file).then(function () {
                let worksheet = workbook.getWorksheet('Sua CargaUsuario Aqui');
                if (!worksheet) worksheet = workbook.getWorksheet(0);

                const headers = [];

                worksheet.eachRow(
                    { includeEmpty: false },
                    function (row, rowNumber) {
                        if (rowNumber !== 1) return;
                        for (let i = 0; i < row.values.length; i += 1) {
                            if (row.values[i]) headers.push(row.values[i]);
                        }
                    }
                );
                resolve(headers);
            });
        });
    },

    async listAzureFilesInContainer(containerName, directory) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STRINGCONN);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const files = [];

        const parsedDirectory = directory ? (directory.endsWith('/') ? directory : `${directory}/`) : '';

        const blobsList = containerClient.listBlobsByHierarchy('/', {
            prefix: parsedDirectory
        });

        for await (const blob of blobsList) {
            if (blob.kind === 'prefix') continue;

            files.push(blob.name.replace(parsedDirectory, ''));
        }

        return files;
    },

    async getAzureFileByPath(containerName, filePath) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STRINGCONN);

        const containerClient = blobServiceClient.getContainerClient(containerName);

        const blockBlobClient = containerClient.getBlockBlobClient(filePath);

        const downloadBlobResponse = await blockBlobClient.downloadToBuffer();

        const decodedFile = iconv.decode(
            downloadBlobResponse,
            'iso88591'
        );

        const decodedReadStream = bufferToStream(decodedFile);

        return {
            readableStream: decodedReadStream,
            buffer: downloadBlobResponse,
        };
    },

    async moveAzureFile(containerName, sourcePath, destinationPath) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STRINGCONN);

        const containerClient = blobServiceClient.getContainerClient(containerName);

        const sourceBlockBlobClient = containerClient.getBlockBlobClient(sourcePath);

        const destinationBlockBlobClient = containerClient.getBlockBlobClient(destinationPath);

        await destinationBlockBlobClient.beginCopyFromURL(sourceBlockBlobClient.url);

        await sourceBlockBlobClient.delete();

        return destinationBlockBlobClient.url;
    },

    async deleteAzureFile(containerName, filePath) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STRINGCONN);

        const containerClient = blobServiceClient.getContainerClient(containerName);

        const blockBlobClient = containerClient.getBlockBlobClient(filePath);

        await blockBlobClient.delete();
    }
};
