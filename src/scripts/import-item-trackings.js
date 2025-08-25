const { groupBy } = require("lodash");
const moment = require("moment");

const { runScript, readSheet, generateReport } = require("./utils");

const { Item } = require("../components/items/model");
const { User } = require("../components/users/model");
const { Tracking } = require("../components/tracking/model");

const CREATE_TRACKINGS = false;
const UPDATE_TRACKINGS = false;
const XLSX_FILE = "";
const XLSX_SHEET = "";

const formattedDate = moment().format('YYYY-MM-DD');
const migrationTag = `migration-${formattedDate}`;

function getTrackingInfoByItem(item, { userLogin, completionAt, score }) {
    return {
        userLogin,
        kind: item.kind.replace('Item', 'Tracking'),
        item: item._id,
        completion: !['SCORMItem', 'ExamItem'].includes(item.kind) ? 1 : undefined,
        completionAt: completionAt ? new Date(completionAt) : undefined,
        lessonStatus: ['SCORMItem', 'ExamItem'].includes(item.kind) ? 'passed' : undefined,

        ...(item.kind === 'SCORMItem' && {
            interactions: [],
            score: Number(score || 100),
            suspendData: null,
            expiredCompletion: null
        }),

        ...(item.kind === 'ExamItem' && {
            remainingAttempts: 0,
            score: Number(score || 100),
            expiredCompletion: null
        }),

        sessionTime: 0,
        totalTime: 0,
        lastState: null,
        isAllowedToSendXAPI: false,
        migration: migrationTag
    };
}

function parseUserNetworkLogin(networkLogin) {
    // return String(networkLogin).replace(/\D/g, '').padStart(11, '0');
    return String(networkLogin).trim();
}

function foundTrackingKey(tracking) {
    return `${tracking.userLogin}-${tracking.item}`;
}

async function getDatabaseInformation(sheetData) {
    const groupedByItem = groupBy(sheetData, 'ITEM');

    const dbItems = await Item
        .find({ title: { $in: Object.keys(groupedByItem) } })
        .select('_id title kind')
        .lean();

    const mappedItems = Object.entries(groupedByItem).map(([itemTitle, itemUsers]) => {
        const item = dbItems.find(i => String(i.title).trim() === String(itemTitle).trim());

        return {
            title: itemTitle,
            users: itemUsers,
            item,
        };
    });

    const dbUsers = await User
        .find({ networkLogin: { $in: mappedItems.flatMap(t => t.users.map(user => parseUserNetworkLogin(user.CPF))) } })
        .select('_id networkLogin')
        .lean();

    return {
        dbUsers,
        dbItems,
        mappedItems,
        groupedByItem,
    }
}

async function processSheetData(mappedItems, dbUsers) {
    const notFoundItems = [];
    const notFoundUsers = new Set();
    const trackings = [];

    for await (const [index, itemInfo] of Object.entries(mappedItems)) {
        const { title, users, item } = itemInfo;

        if (!item) {
            notFoundItems.push({ title });
            continue;
        };

        console.log(`Processando item ${Number(index) + 1} de ${mappedItems.length}`, title);

        for await (const user of users) {
            const foundUser = dbUsers.find(u => u.networkLogin === parseUserNetworkLogin(user.CPF));

            if (!foundUser) {
                notFoundUsers.add(parseUserNetworkLogin(user.CPF));
                continue;
            }

            const userTracking = getTrackingInfoByItem(item, { userLogin: foundUser.networkLogin, completionAt: user.DATA_DE_CONCLUSAO, score: user.APROVEITAMENTO });

            trackings.push(userTracking);
        }
    }

    return {
        notFoundItems,
        notFoundUsers,
        trackings,
    }
}

async function getFoundTrackings(trackings) {
    const foundTrackings = new Map();
    const batchSize = 5000;
    const totalBatches = Math.ceil(trackings.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = start + batchSize;
        const batch = trackings.slice(start, end);

        const existingTrackings = await Tracking.find({
            userLogin: { $in: batch.map(t => t.userLogin) },
            item: { $in: batch.map(t => t.item) },
        }).lean();

        existingTrackings.forEach(existingTracking => {
            const trackingKey = foundTrackingKey(existingTracking); //`${existingTracking.userLogin}-${existingTracking.item}`;
            foundTrackings.set(trackingKey, existingTracking);
        });
    }

    return foundTrackings;
}

async function run() {
    console.log('Iniciando o processamento...');
    console.log('Arquivo:', XLSX_FILE);
    console.log('Planilha:', XLSX_SHEET);
    console.log('CREATE_TRACKINGS:', CREATE_TRACKINGS);
    console.log('UPDATE_TRACKINGS:', UPDATE_TRACKINGS);

    console.log('Lendo a planilha...');
    const sheetData = await readSheet(XLSX_FILE, XLSX_SHEET)

    console.log('Buscando infos...');
    const { dbUsers, mappedItems } = await getDatabaseInformation(sheetData);

    console.log('Processando dados...');
    const { notFoundItems, notFoundUsers, trackings } = await processSheetData(mappedItems, dbUsers);

    console.log('Buscando trackings existentes...');
    const foundTrackings = await getFoundTrackings(trackings);

    const trackingsToCreate = trackings.filter(t => !foundTrackings.has(foundTrackingKey(t)));
    const trackingsToUpdate = trackings.filter(t => foundTrackings.has(foundTrackingKey(t)));

    console.log('Gerando relatórios...');

    await generateReport(
        notFoundItems,
        [{ header: 'Itens não encontrados', key: 'title' }],
        { fileName: `itens_nao_encontrados_${formattedDate}` }
    );

    await generateReport(
        [...notFoundUsers].map(login => ({ login })),
        [{ header: 'Usuários não encontrados', key: 'login' }],
        { fileName: `usuarios_nao_encontrados_${formattedDate}` }
    );

    await generateReport(
        trackingsToCreate,
        [
            { header: 'Usuário', key: 'userLogin' },
            { header: 'Tipo', key: 'kind' },
            { header: 'Item', key: 'item' },
            { header: 'Conclusão', key: 'completion' },
            { header: 'Conclusão em', key: 'completionAt' },
            { header: 'Status da lição', key: 'lessonStatus' },
            { header: 'Pontuação', key: 'score' },
        ],
        { fileName: `created_trackings_${formattedDate}` }
    );

    await generateReport(
        trackingsToUpdate.map(tracking => ({
            ...tracking,
            databaseId: foundTrackings.get(foundTrackingKey(tracking))?._id,
        })),
        [
            { header: 'Usuário', key: 'userLogin' },
            { header: 'Tipo', key: 'kind' },
            { header: 'Item', key: 'item' },
            { header: 'Conclusão', key: 'completion' },
            { header: 'Conclusão em', key: 'completionAt' },
            { header: 'Status da lição', key: 'lessonStatus' },
            { header: 'Pontuação', key: 'score' },
            { header: 'ID no banco', key: 'databaseId' },
        ],
        { fileName: `updated_trackings_${formattedDate}` }
    );

    const batchSize = 1000;
    const totalCreateBatches = Math.ceil(trackingsToCreate.length / batchSize);
    const totalUpdateBatches = Math.ceil(trackingsToUpdate.length / batchSize);

    console.log('Processando trackings...');

    if (CREATE_TRACKINGS) {
        console.log(`Total de batches para criação: ${totalCreateBatches}`);

        for (let i = 0; i < totalCreateBatches; i++) {
            const start = i * batchSize;
            const end = start + batchSize;
            const batch = trackingsToCreate.slice(start, end);

            console.log(`\nCriando batch ${i + 1} de ${totalCreateBatches}`);
            await Tracking.insertMany(batch);
        }

        console.log('Trackings criados com sucesso!');
    }

    if (UPDATE_TRACKINGS) {
        console.log(`Total de batches para atualização: ${totalUpdateBatches}`);

        for (let i = 0; i < totalUpdateBatches; i++) {
            const start = i * batchSize;
            const end = start + batchSize;
            const batch = trackingsToUpdate.slice(start, end);

            console.log(`\nAtualizando batch ${i + 1} de ${totalUpdateBatches}`);

            for (const [index, tracking] of Object.entries(batch)) {
                const existingTracking = foundTrackings.get(foundTrackingKey(tracking));

                if (existingTracking) {
                    console.log(`Atualizando tracking ${Number(index) + 1} de ${batch.length}`, tracking.userLogin, tracking.item);

                    await Tracking.updateOne(
                        { _id: existingTracking._id },
                        { $set: { ...tracking, migration: migrationTag } }
                    );
                }
            }
        }

        console.log('Trackings atualizados com sucesso!');
    }

    console.log('Total de usuários', dbUsers.length);
    console.log('Total de usuários não encontrados', notFoundUsers.size);

    console.log('Total de items', mappedItems.length);
    console.log('Total de items não encontradas', notFoundItems.length);

    console.log(`Total de trackings: ${trackings.length}`);
    console.log(`Total de trackings a serem criados: ${trackingsToCreate.length}`);
    console.log(`Total de trackings a serem atualizados: ${trackingsToUpdate.length}`);

    console.log('TAG DE MIGRAÇÃO:', migrationTag);

    console.log('Processamento concluído!');

    process.exit(0);
}

runScript(run);