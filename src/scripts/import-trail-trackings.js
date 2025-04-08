const { groupBy } = require("lodash");
const moment = require("moment");

const { runScript, readSheet, generateReport } = require("./utils");

const { Trail } = require("../components/trails/model");
const { Item } = require("../components/items/model");
const { User } = require("../components/users/model");
const { Tracking } = require("../components/tracking/model");

const SAVE_TRACKINGS = false;
const XLSX_FILE = "";
const XLSX_SHEET = "";

const formattedDate = moment().format('YYYY-MM-DD');
const migrationTag = `migration-${formattedDate}`;

function getTrackingInfoByItem(item, { userLogin, completionAt }) {
    return {
        userLogin,
        kind: item.kind.replace('Item', 'Tracking'),
        item: item._id,
        completion: !['SCORMItem', 'ExamItem'].includes(item.kind) ? 1 : undefined,
        completionAt: completionAt ? new Date(completionAt) : undefined,
        lessonStatus: ['SCORMItem', 'ExamItem'].includes(item.kind) ? 'passed' : undefined,

        ...(item.kind === 'SCORMItem' && {
            interactions: [],
            score: 100,
            suspendData: '',
            expiredCompletion: null
        }),

        ...(item.kind === 'ExamItem' && {
            remainingAttempts: 0,
            score: 100,
            expiredCompletion: null
        }),

        sessionTime: 0,
        totalTime: 0,
        lastState: '{}',
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
    const groupedByTrail = groupBy(sheetData, 'TRILHA');

    const dbTrails = await Trail
        .find({})
        .populate({
            path: 'items.itemID',
            model: Item,
            select: '_id title kind'
        })
        .select('_id items title items')
        .lean();

    const mappedTrails = Object.entries(groupedByTrail).map(([trailTitle, trailUsers]) => {
        const trail = dbTrails.find(t => String(t.title).trim() === String(trailTitle).trim());

        return {
            title: trailTitle,
            users: trailUsers,
            trail: trail ? {
                ...trail,
                items: trail.items.map(item => item.itemID)
            } : null
        };
    });

    const dbUsers = await User
        .find({ networkLogin: { $in: mappedTrails.flatMap(t => t.users.map(user => parseUserNetworkLogin(user.LOGIN))) } })
        .select('_id networkLogin')
        .lean();

    return {
        dbUsers,
        dbTrails,
        mappedTrails,
        groupedByTrail,
    }
}

async function processSheetData(mappedTrails, dbUsers) {
    const notFoundTrails = [];
    const notFoundUsers = new Set();
    const trackings = [];

    for await (const [index, trailInfo] of Object.entries(mappedTrails)) {
        const { title, users, trail } = trailInfo;

        if (!trail) {
            notFoundTrails.push({ title });
            continue;
        };

        console.log(`Processando trilha ${Number(index) + 1} de ${mappedTrails.length}`, title);

        for await (const user of users) {
            const foundUser = dbUsers.find(u => u.networkLogin === parseUserNetworkLogin(user.LOGIN));

            if (!foundUser) {
                notFoundUsers.add(parseUserNetworkLogin(user.LOGIN));
                continue;
            }

            const userTrackings = trail.items
                ?.filter(item => item.kind !== 'SoonItem')
                .map(item => getTrackingInfoByItem(item, { userLogin: foundUser.networkLogin, completionAt: user.DATA_DE_CONCLUSAO }));

            trackings.push(...userTrackings);
        }
    }

    return {
        notFoundTrails,
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
    const sheetData = await readSheet(XLSX_FILE, XLSX_SHEET)

    const { dbUsers, mappedTrails } = await getDatabaseInformation(sheetData);

    console.log('Total de usuários', dbUsers.length);

    console.log('Total de trilhas', mappedTrails.length);

    console.log('Total de trilhas sem informações', mappedTrails.filter(t => !t.trail).length);

    const { notFoundTrails, notFoundUsers, trackings } = await processSheetData(mappedTrails, dbUsers);

    const foundTrackings = await getFoundTrackings(trackings);

    console.log('Total de trackings', trackings.length);

    console.log('Total de trackings encontrados', foundTrackings.size);

    await generateReport(
        notFoundTrails,
        [{ header: 'Trilhas não encontradas', key: 'title' }],
        { fileName: `trilhas_nao_encontradas_${formattedDate}` }
    );

    await generateReport(
        [...notFoundUsers].map(login => ({ login })),
        [{ header: 'Usuários não encontrados', key: 'login' }],
        { fileName: `usuarios_nao_encontrados_${formattedDate}` }
    );

    await generateReport(
        trackings,
        [
            { header: 'Usuário', key: 'userLogin' },
            { header: 'Tipo', key: 'kind' },
            { header: 'Item', key: 'item' },
            { header: 'Conclusão', key: 'completion' },
            { header: 'Conclusão em', key: 'completionAt' },
            { header: 'Status da lição', key: 'lessonStatus' },
            { header: 'Migracao', key: 'migration' },
        ],
        { fileName: `trackings_${formattedDate}` }
    );

    await generateReport(
        [...foundTrackings.values()],
        [
            { header: 'Usuário', key: 'userLogin' },
            { header: 'Tipo', key: 'kind' },
            { header: 'Item', key: 'item' },
            { header: 'Conclusão', key: 'completion' },
            { header: 'Conclusão em', key: 'completionAt' },
            { header: 'Status da lição', key: 'lessonStatus' },
            { header: 'Migracao', key: 'migration' },
        ],
        { fileName: `trackings_encontrados_${formattedDate}` }
    );

    const batchSize = 1000;
    const totalBatches = Math.ceil(trackings.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = start + batchSize;
        const batch = trackings.slice(start, end);

        console.log(`\nProcessando batch ${i + 1} de ${totalBatches}`);

        const trackingsToCreate = batch.filter(t => !foundTrackings.has(foundTrackingKey(t)));
        const trackingsToUpdate = batch.filter(t => foundTrackings.has(foundTrackingKey(t)));

        console.log(`Total de trackings a serem criados: ${trackingsToCreate.length}`);
        console.log(`Total de trackings a serem atualizados: ${trackingsToUpdate.length}`);

        if (SAVE_TRACKINGS) {
            console.log('Salvando trackings...');

            await Tracking.insertMany(trackingsToCreate);

            for (const tracking of trackingsToUpdate) {
                const existingTracking = foundTrackings.get(foundTrackingKey(tracking));

                if (existingTracking) await Tracking.updateOne(
                    { _id: existingTracking._id },
                    { $set: { ...tracking, migration: migrationTag } }
                );
            }

        }

        console.log('Trackings salvos com sucesso! Migration:', migrationTag);
    }

    process.exit(0);
}

runScript(run);