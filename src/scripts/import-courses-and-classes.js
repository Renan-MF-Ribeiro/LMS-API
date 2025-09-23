const { groupBy } = require("lodash");
const moment = require("moment");
const { BlobServiceClient } = require('@azure/storage-blob');

const { runScript, readSheet } = require("./utils");
const environment = require("../environment");

const { CourseModel, ProgramModel, MaterialModel, ClassModel } = require("../components/courses/model");
const { User } = require("../components/users/model");

const FILE_PATH = "";
const SHEET_NAME = "";

const DEFAULT_INSTRUCTOR_NETWORK_LOGIN = "T000307";
const AZURE_CONTAINER_NAME = "lmsassets";
const ORIGIN_FOLDER_PATH = "load-history";

function isYouTubeOrVimeoLink(url) {
    return url?.includes('youtube.com')
        || url?.includes('vimeo.com')
        || url?.includes('youtu.be');
}

function parseDateHoursToMinutes(date) {
    const d = new Date(date);
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();

    return (hours * 60) + minutes;
}

async function transferFileInAzure(fileName, destinationFolderPath) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(environment.AZURE_STRINGCONN);

        const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

        const originFileExtension = fileName.split('.').pop();

        const destinationFileName = `upload_${Date.now()}_${Math.round(Math.random() * 1E9)}.${originFileExtension}`;

        const originPath = `${ORIGIN_FOLDER_PATH}/${fileName}`;
        const destinationPath = `${destinationFolderPath}/${destinationFileName}`;

        const blobClientOrigem = containerClient.getBlobClient(originPath);
        const blobClientDestino = containerClient.getBlobClient(destinationPath);

        const originUrl = blobClientOrigem.url;

        const copyPoller = await blobClientDestino.beginCopyFromURL(originUrl);
        const result = await copyPoller.pollUntilDone();

        if (result.copyStatus !== 'success') {
            console.error(`Erro ao copiar o arquivo ${fileName} para o destino ${destinationPath}`);
            return null;
        }

        return blobClientDestino.url.replace(environment.AZURE_BLOB_URL, environment.DOMAIN);
    } catch (error) {
        console.error(`Erro ao transferir o arquivo ${fileName}:`, error.message);
        return null;
    }
}

async function handleProgram(programName = 'Importação') {
    const dbProgram = await ProgramModel.findOne({ title: programName });

    if (dbProgram) return dbProgram;

    return await ProgramModel.create({
        title: programName,
        status: 1,
    });
}

async function handleMaterial(materialName, courseId) {
    const dbMaterial = await MaterialModel.findOne({ title: materialName });

    if (dbMaterial) return dbMaterial;

    return await MaterialModel.create({
        title: materialName,
        url: isYouTubeOrVimeoLink(materialName)
            ? materialName
            : (await transferFileInAzure(materialName, `courses/${courseId}/materials`)) || 'file-not-found',
        author: 'CONTEUDISTA',
    });
}

async function handleCourse({ thumb, ...courseData }, programId) {
    const dbCourse =
        (await CourseModel.findOne({ title: courseData.title }))
        || await CourseModel.create({
            ...courseData,
            program: programId,
            materials: [],
            thumbPath: thumb
                ? (await transferFileInAzure(thumb, 'items/thumbs')) || 'file-not-found'
                : null,

            // DEFAULTS
            certificateLayout: null,
            certificate: 0,
            certificateDateType: 1,
            certificateDue: { type: '', value: null },
            deleted: 0,
            status: 1,
            isEvaluationAvailable: true,
            tags: [],
            mandatory: [],
            obligatory: [],
            dimensions: [],
            inWaitList: false,
            score: null,
            highlighted: false,
            banner: null,
        });

    const materials = [];

    if (courseData.materials?.length) {
        for await (const materialName of courseData.materials) {
            const dbMaterial = await handleMaterial(materialName, dbCourse._id);
            materials.push(dbMaterial._id);
        }

        await CourseModel.updateOne({ _id: dbCourse._id }, { $addToSet: { materials: { $each: materials } } });
    }

    return { ...dbCourse.toObject(), materials };
}

async function handleClass({ instructor, ...classData }, courseId) {
    const dbClass = await ClassModel.findOne({ name: classData.name, courseID: courseId });

    if (dbClass) return dbClass;

    const instructorUser =
        (await User.findOne({ name: instructor }))
        || await User.findOne({ networkLogin: DEFAULT_INSTRUCTOR_NETWORK_LOGIN });

    return await ClassModel.create({
        ...classData,
        courseID: courseId,
        instructor: instructorUser?._id || null,

        // DEFAULTS
        users: [],
        materials: [],
        qrCodeSelfRegistration: null,
        isSelfRegistrationEnabled: false,
        signup: false,
        qrcode: null,
        registrationDeadline: 0,
        cancellationDeadline: 0,
        canCreateClass: false,
        limit: 0,
        location: classData.name,
        costs: [],
    });
}

async function parseSheetData(sheetData) {
    const groupedByCourse = groupBy(sheetData, 'TITULO_DO_CURSO');

    return Object.entries(groupedByCourse).map(([, entries]) => {
        const courseMaterials = new Set(
            entries
                .filter(e => e['NOME DO ARQUIVO'])
                .map(e => e['NOME DO ARQUIVO']?.text || e['NOME DO ARQUIVO'])
        );

        const courseInfo = {
            title: entries[0].TITULO_DO_CURSO,
            description: entries[0].DESCRICAO_DO_CURSO,
            program: entries[0].PROGRAMA || null,
            dateInitial: entries[0].DATA_INICIO_CURSO ? moment(entries[0].DATA_INICIO_CURSO).add(3, 'hours').toDate() : new Date(),
            dateFinal: entries[0].DATA_FIM_CURSO ? moment(entries[0].DATA_FIM_CURSO).add(3, 'hours').toDate() : new Date(),
            workload: entries[0].CARGA_HORARIA ? parseDateHoursToMinutes(entries[0].CARGA_HORARIA) : 0,
            materials: Array.from(courseMaterials),
            passingScore: entries[0].NOTA_CORTE_CURSO && entries[0].NOTA_CORTE_CURSO !== '-' ? Number(entries[0].NOTA_CORTE_CURSO) : null,
            thumb: entries[0].THUMB_DO_CURSO || null,
        };

        const classes = entries.map(entry => {
            const initialTime = moment(entry.HORA_INICIO_TURMA || new Date()).utc().format('HH:mm:ss');
            const finalTime = moment(entry.HORA_FIM_TURMA || new Date()).utc().format('HH:mm:ss');

            const initialDate = moment(entry.DATA_INICIO_TURMA || new Date()).add(3, 'hours').format('YYYY-MM-DD');
            const finalDate = moment(entry.DATA_FIM_TURMA || new Date()).add(3, 'hours').format('YYYY-MM-DD');

            const dateApplicationInitial = moment(`${initialDate} ${initialTime}`, 'YYYY-MM-DD HH:mm:ss').toDate();
            const dateApplicationFinal = moment(`${finalDate} ${finalTime}`, 'YYYY-MM-DD HH:mm:ss').toDate();

            return {
                name: entry.TITULO_DA_TURMA || entry.TITULO_DO_CURSO,
                instructor: entry.INSTRUTOR || null,
                minister: entry.INSTRUTOR || null,
                requester: entry.SOLICITANTE || null,
                dateApplicationInitial: dateApplicationInitial,
                dateApplicationFinal: dateApplicationFinal,
            }
        });

        return {
            course: courseInfo,
            classes,
        };
    });
}

async function validateSheetDataFiles(sheetData) {
    const errors = [];

    const blobServiceClient = BlobServiceClient.fromConnectionString(environment.AZURE_STRINGCONN);
    const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

    for await (const entry of sheetData) {
        const fileName = entry['NOME DO ARQUIVO']?.text || entry['NOME DO ARQUIVO'];
        const thumbPath = entry.THUMB_DO_CURSO?.text || entry.THUMB_DO_CURSO;

        if (fileName && !isYouTubeOrVimeoLink(fileName)) {
            const blobClient = containerClient.getBlobClient(`${ORIGIN_FOLDER_PATH}/${fileName}`);
            const exists = await blobClient.exists();
            if (!exists) errors.push(fileName);
        }

        if (thumbPath) {
            const blobClient = containerClient.getBlobClient(`${ORIGIN_FOLDER_PATH}/${thumbPath}`);
            const exists = await blobClient.exists();
            if (!exists) errors.push(thumbPath);
        }
    }

    if (errors.length) {
        return errors;
    }

    return true;
}

async function importCoursesAndClasses() {
    console.log('importing courses and classes...');
    const sheetData = await readSheet(FILE_PATH, SHEET_NAME);

    const errors = await validateSheetDataFiles(sheetData);

    if (errors !== true) {
        console.error('The following files were not found in Azure Blob Storage:');
        errors.forEach(err => console.error(`- ${err}`));
        process.exit(1);
    }

    const coursesMap = await parseSheetData(sheetData);

    console.log(`Found ${coursesMap.length} unique courses.`);

    for await (const [index, { course, classes }] of coursesMap.entries()) {
        console.log(`Processing course ${index + 1} of ${coursesMap.length}: ${course.title} with ${classes.length} classes.`);

        const dbProgram = await handleProgram(course.program);
        const dbCourse = await handleCourse(course, dbProgram._id);

        for await (const classData of classes) {
            await handleClass(classData, dbCourse._id);
        }
    }

    process.exit(0);
}

runScript(importCoursesAndClasses);