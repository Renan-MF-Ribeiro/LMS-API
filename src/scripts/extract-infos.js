const { User } = require("../components/users/model");

const { runScript, generateReport } = require("./utils");

async function run() {
    console.log('Extracting infos...');

    console.time('Extract infos');

    const data = async () => {
        return await User.find({}).lean();
    };

    const columns = [
        { header: 'Nome', key: 'name', width: 30 },
        { header: 'CPF', key: 'cpf', width: 30 },
        { header: 'Unidade', key: 'company', width: 30 },
    ];

    await generateReport(data, columns, { sheetName: 'Usuários', fileName: `usuarios_${new Date().getTime()}` });

    console.timeEnd('Extract infos');

    process.exit(0);
}

runScript(run);