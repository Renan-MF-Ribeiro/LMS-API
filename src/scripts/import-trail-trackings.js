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
    return String(networkLogin).replace(/\D/g, '').padStart(11, '0');
}

async function run() {
    const sheetData = await readSheet(XLSX_FILE, XLSX_SHEET)

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
        const trail = dbTrails.find(t => t.title === trailTitle);

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

    console.log('Total de usuários', dbUsers.length);

    console.log('Total de trilhas', mappedTrails.length);

    console.log('Total de trilhas sem informações', mappedTrails.filter(t => !t.trail).length);

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

    const formattedDate = moment().format('YYYY-MM-DD');

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

    console.log('Total de trackings', trackings.length);

    if (SAVE_TRACKINGS) {
        const batchSize = 1000;
        const totalBatches = Math.ceil(trackings.length / batchSize);

        for (let i = 0; i < totalBatches; i++) {
            const start = i * batchSize;
            const end = start + batchSize;
            const batch = trackings.slice(start, end);

            console.log(`Salvando batch ${i + 1} de ${totalBatches}`);
            await Tracking.insertMany(batch);
        }

        console.log('Trackings salvos com sucesso! Migration:', migrationTag);
    }

    process.exit(0);
}

runScript(run);