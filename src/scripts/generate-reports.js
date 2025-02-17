const ExcelJS = require('exceljs');

const { Group } = require("../components/groups/model");
const { Trail } = require("../components/trails/model");
const { User } = require("../components/users/model");

const { runScript } = require('./utils');

async function createTrailsSheet(workbook) {
    const trails = await Trail.find({})
        .select('_id title tags tagsAnd enabled')
        .exec();

    const trailsSheet = workbook.addWorksheet('Trilhas', { views: [{ state: 'frozen', ySplit: 1 }] });

    trailsSheet.columns = [
        { header: 'ID', key: '_id', width: 30 },
        { header: 'Nome', key: 'title', width: 35 },
        { header: 'Tags', key: 'tags', width: 35 },
        { header: 'Tags AND', key: 'tagsAnd', width: 35 },
        { header: 'Ativo', key: 'enabled', width: 35 },
    ];

    trails.forEach(trail => {
        trailsSheet.addRow({
            _id: String(trail._id),
            title: trail.title,
            tags: trail.tags?.map(t => t.value ?? t).join(', '),
            tagsAnd: trail.tagsAnd?.map(t => t.value ?? t).join(', '),
            enabled: trail.enabled ? 'Sim' : 'Não',
        });
    });
}

async function createGroupsSheet(workbook) {
    const groups = await Group.find({})
        .select('_id name tags active')
        .exec();

    const groupsSheet = workbook.addWorksheet('Grupos', { views: [{ state: 'frozen', ySplit: 1 }] });

    groupsSheet.columns = [
        { header: 'ID', key: '_id', width: 30 },
        { header: 'Nome', key: 'name', width: 35 },
        { header: 'Tags', key: 'tags', width: 35 },
        { header: 'Ativo', key: 'active', width: 35 },
    ];

    groups.forEach(group => {
        groupsSheet.addRow({
            _id: String(group._id),
            name: group.name,
            tags: group.tags?.map(t => t.value ?? t).join(', '),
            active: group.active ? 'Sim' : 'Não',
        });
    });
}

async function createUsersSheet(workbook) {
    const users = await User.find({})
        .select('_id name networkLogin groupsAD status onboarding')
        .exec();

    const usersSheet = workbook.addWorksheet('Usuários', { views: [{ state: 'frozen', ySplit: 1 }] });

    usersSheet.columns = [
        { header: 'ID', key: '_id', width: 30 },
        { header: 'Login', key: 'networkLogin', width: 35 },
        { header: 'Nome', key: 'name', width: 35 },
        { header: 'Grupos AD', key: 'groupsAD', width: 35 },
        { header: 'Status', key: 'status', width: 35 },
        { header: 'Onboarding', key: 'onboarding', width: 35 },
    ];

    users.forEach(user => {
        usersSheet.addRow({
            _id: String(user._id),
            networkLogin: user.networkLogin,
            name: user.name,
            groupsAD: user.groupsAD?.join(', '),
            status: user.status,
            onboarding: user.onboarding ? 'Sim' : 'Não',
        });
    });
}

async function run() {
    const workbook = new ExcelJS.Workbook();

    await createTrailsSheet(workbook);

    await createGroupsSheet(workbook);

    await createUsersSheet(workbook);

    workbook.eachSheet(sheet => {
        sheet.getRow(1).eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFDDDDDD' },
            };
            cell.font = {
                bold: true,
            };
        });
    });

    await workbook.xlsx.writeFile(`./src/scripts/data/report_trails_groups_users_${new Date().getTime()}.xlsx`);

    process.exit(0);
}

runScript(run);
