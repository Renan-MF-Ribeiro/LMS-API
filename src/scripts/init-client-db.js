const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const { getSectionTrailId, isSectionTrailInfo } = require("../components/sections/business");

const { runScript, generateReport } = require("./utils");

const ObjectId = mongoose.Types.ObjectId;

async function updateMonolitoIds(connection, { clientId, domainToReplace, domainToReplaceWith, reportName = 'updated_ids' }) {
    const channelsMap = new Map();
    const sectionsMap = new Map();
    const trailsMap = new Map();
    const itemsMap = new Map();

    const { db } = connection;

    console.log('Mudando trailIdentifier e courseIdentifier');

    const currentTrails = await db.collection('trails').find().toArray();

    for await (const [index, trail] of currentTrails.entries()) {
        await db.collection('trails').updateOne(
            { _id: trail._id },
            { $set: { trailIdentifier: 999999 - Number(index) } }
        );
    }

    const currentItems = await db.collection('items').find().toArray();

    for await (const [index, item] of currentItems.entries()) {
        await db.collection('items').updateOne(
            { _id: item._id },
            { $set: { courseIdentifier: 999999 - Number(index) } }
        );
    }

    console.log('Atualizando canais');

    // Atualiza ID's dos canais
    const channels = await db.collection('channels').find().toArray();

    for await (const channel of channels) {
        const newChannelId = new ObjectId();

        channelsMap.set(String(channel._id), String(newChannelId));

        await db.collection('channels').insertOne({
            ...channel,
            _id: newChannelId,
            oldId: channel._id,
            banners: channel.banners?.map(banner => ({
                ...banner,
                path: banner.path?.replace(domainToReplace, domainToReplaceWith) ?? null
            })) ?? [],
        });

        await db.collection('channels').deleteOne({ _id: channel._id });
    }

    console.log('Atualizando sessoes');

    // Atualiza ID's das sessoes
    const sections = await db.collection('sections').find().toArray();

    for await (const section of sections) {
        const newSectionId = new ObjectId();

        sectionsMap.set(String(section._id), String(newSectionId));

        await db.collection('sections').insertOne({
            ...section,
            _id: newSectionId,
            oldId: section._id,
        });

        await db.collection('sections').deleteOne({ _id: section._id });
    }

    console.log('Atualizando ID do cliente nas trilhas');

    // Atualiza ID do cliente nas trilhas
    await db.collection('trails').updateMany({}, { $set: { clientId } });

    console.log('Atualizando trilhas');

    // Atualiza ID's das trilhas
    const trails = await db.collection('trails').find().toArray();

    for await (const [index, trail] of trails.entries()) {
        const newTrailId = new ObjectId();

        trailsMap.set(String(trail._id), String(newTrailId));

        await db.collection('trails').insertOne({
            ...trail,
            _id: newTrailId,
            oldId: trail._id,
            thumbPath: trail.thumbPath?.replace(domainToReplace, domainToReplaceWith) ?? null,
            contentPath: trail.contentPath?.replace(domainToReplace, domainToReplaceWith) ?? null,
            bannerPath: trail.bannerPath?.replace(domainToReplace, domainToReplaceWith) ?? null,
            trailIdentifier: Number(index) + 1
        });

        await db.collection('trails').deleteOne({ _id: trail._id });
    }

    console.log('Atualizando itens');

    // Atualiza ID's dos itens
    const items = await db.collection('items').find().toArray();

    for await (const [index, item] of items.entries()) {
        const newItemId = new ObjectId();

        itemsMap.set(String(item._id), String(newItemId));

        await db.collection('items').insertOne({
            ...item,
            _id: newItemId,
            oldId: item._id,
            thumbPath: item.thumbPath?.replace(domainToReplace, domainToReplaceWith) ?? null,
            contentPath: item.contentPath?.replace(domainToReplace, domainToReplaceWith) ?? null,
            bannerPath: item.bannerPath?.replace(domainToReplace, domainToReplaceWith ?? null),
            courseIdentifier: Number(index) + 1,
        });

        // Atualiza trackings do item
        await db.collection('trackings').updateMany(
            { item: item._id },
            { $set: { item: newItemId } }
        );

        await db.collection('items').deleteOne({ _id: item._id });
    }

    console.log('Atualizando sessoes nos canais');

    // Atualiza ID das sessoes nos canais
    for await (const channel of channels) {
        const sections = channel.idSections.map(sectionId => {
            const newSectionId = new ObjectId(sectionsMap.get(String(sectionId)));

            return newSectionId;
        });

        await db.collection('channels').updateOne(
            { _id: new ObjectId(channelsMap.get(String(channel._id))) },
            { $set: { idSections: sections } }
        );
    }

    console.log('Atualizando trilhas nas sessoes');

    // Atualiza ID das trilhas nas sessoes
    for await (const section of sections) {
        const trails = section.trails.map(sectionTrailId => {
            const trailId = isSectionTrailInfo(sectionTrailId) ? getSectionTrailId(sectionTrailId) : null;

            if (trailId) {
                const newTrailId = new ObjectId(trailsMap.get(String(trailId)));

                return newTrailId;
            }

            return sectionTrailId;
        });

        await db.collection('sections').updateOne(
            { _id: new ObjectId(sectionsMap.get(String(section._id))) },
            { $set: { trails } }
        );
    }

    console.log('Atualizando itens nas trilhas');

    // Atualiza ID dos itens nas trilhas
    for await (const trail of trails) {
        const newTrailId = new ObjectId(trailsMap.get(String(trail._id)));

        const items = trail.items.map(item => {
            const newItemId = new ObjectId(itemsMap.get(String(item.itemID)));

            const urlItem = item.urlItem
                ? item.urlItem
                    .replace(domainToReplace, domainToReplaceWith)
                    .replace(String(trail._id), String(newTrailId))
                    .replace(String(item.itemID), String(newItemId))
                : null;

            const urlTrail = item.urlTrail
                ? item.urlTrail
                    .replace(domainToReplace, domainToReplaceWith)
                    .replace(String(trail._id), String(newTrailId))
                    .replace(String(item.itemID), String(newItemId))
                : null;

            return {
                ...item,
                itemID: newItemId,
                urlItem,
                urlTrail,
            }
        });

        await db.collection('trails').updateOne(
            { _id: new ObjectId(trailsMap.get(String(trail._id))) },
            { $set: { items } }
        );
    }

    await db.collection('channels').updateMany({}, { $unset: { oldId: '', oldID: '' } });
    await db.collection('sections').updateMany({}, { $unset: { oldId: '', oldID: '' } });
    await db.collection('trails').updateMany({}, { $unset: { oldId: '', oldID: '' } });
    await db.collection('items').updateMany({}, { $unset: { oldId: '', oldID: '' } });

    console.log('Gerando relatorios');

    await generateReport(
        Array.from(channelsMap.entries()).map(([oldId, newId]) => ({
            oldId: String(oldId),
            newId: String(newId),
        })),
        [
            { header: 'Old ID', key: 'oldId' },
            { header: 'New ID', key: 'newId' },
        ],
        { fileName: reportName + '_channels' }
    );

    await generateReport(
        Array.from(sectionsMap.entries()).map(([oldId, newId]) => ({
            oldId: String(oldId),
            newId: String(newId),
        })),
        [
            { header: 'Old ID', key: 'oldId' },
            { header: 'New ID', key: 'newId' },
        ],
        { fileName: reportName + '_sections' }
    );

    await generateReport(
        Array.from(trailsMap.entries()).map(([oldId, newId]) => ({
            oldId: String(oldId),
            newId: String(newId),
        })),
        [
            { header: 'Old ID', key: 'oldId' },
            { header: 'New ID', key: 'newId' },
        ],
        { fileName: reportName + '_trails' }
    );

    await generateReport(
        Array.from(itemsMap.entries()).map(([oldId, newId]) => ({
            oldId: String(oldId),
            newId: String(newId),
        })),
        [
            { header: 'Old ID', key: 'oldId' },
            { header: 'New ID', key: 'newId' },
        ],
        { fileName: reportName + '_items' }
    );

    return {
        channelsMap,
        sectionsMap,
        trailsMap,
        itemsMap,
    }
}

async function updateDefaultUsers(connection, clientId) {
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('Minhasenha@1', salt);

    const { db } = connection;

    await db.collection('users')
        .updateMany({}, {
            $set: {
                clientId,
                passwordValid: true,
                password: [{
                    hash: defaultPasswordHash,
                    valid: true,
                    createdAt: new Date()
                }]
            }
        });

}

async function run() {
    console.log('DB', process.env.DB_HOST);

    const connection = await mongoose.createConnection(process.env.DB_HOST, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const clientId = 0;

    await updateMonolitoIds(connection, {
        clientId,
        domainToReplace: 'lms.experimente1.happmobi.com.br',
        domainToReplaceWith: 'lms.cliente.happlearning.com.br',
        reportName: 'monolito_ids'
    });

    await updateDefaultUsers(connection, clientId);

    console.log('Script concluído com sucesso!');

    process.exit(0);
}

runScript(run);