const fs = require('fs/promises');

const ExcelJS = require('exceljs');

async function writeDebugJson(fileName, data) {
    await fs.writeFile(
        `./src/scripts/debug/${fileName}.json`,
        JSON.stringify(data, null, 2)
    );
}

async function generateReport(
    data = [],
    columns = [],
    { sheetName, fileName } = {}
) {
    let reportData = [];

    if(Array.isArray(data)) {
        reportData = data;
    }
    else if(typeof data === 'function') {
        reportData = await data();
    }

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet(sheetName ?? 'Planilha1', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.columns = columns;

    reportData.forEach(item => {
        sheet.addRow(item);
    });

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

    await workbook.xlsx.writeFile(`./src/scripts/data/${fileName ?? `extracao_${new Date().getTime()}`}.xlsx`);
}

async function runScript(functionToRun) {
    console.time('Total time');
    console.log('Running script...', functionToRun.name);
    console.log('DATABASE', process.env.DB_HOST);

    try {
        await fs.access('./src/scripts/debug');
    } catch (error) {
        await fs.mkdir('./src/scripts/debug');
    }

    await new Promise((resolve) => {
        let count = 5;

        const interval = setInterval(() => {
            console.log(`Script will start in ${count} seconds`);
            count--;

            if (count < 0) {
                clearInterval(interval);
                resolve();
            }
        }, 1000);
    });

    await functionToRun();

    console.timeEnd('Total time');
    process.exit(0);
}

module.exports = {
    runScript,
    writeDebugJson,
    generateReport,
};