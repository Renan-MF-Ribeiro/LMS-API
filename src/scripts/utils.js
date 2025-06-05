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

    if (Array.isArray(data)) {
        reportData = data;
    }
    else if (typeof data === 'function') {
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

    console.log('DB_HOST', process.env.DB_HOST);
    console.log('AZURE_BLOBNAME', process.env.AZURE_BLOBNAME);
    console.log('AZURE_BLOB_URL', process.env.AZURE_BLOB_URL);
    console.log('DOMAIN', process.env.DOMAIN);
    console.log('CLIENT_ID', process.env.CLIENT_ID);

    try {
        await fs.access('./src/scripts/debug');
    } catch (error) {
        await fs.mkdir('./src/scripts/debug');
    }
    
    try {
        await fs.access('./src/scripts/data');
    } catch (error) {
        await fs.mkdir('./src/scripts/data');
    }

    await new Promise((resolve) => {
        let count = 5;

        const interval = setInterval(() => {
            process.stdout.write(`\rScript will start in ${count} seconds`);
            count--;

            if (count < 0) {
                clearInterval(interval);
                process.stdout.write('\n\n');
                resolve();
            }
        }, 1000);
    });

    await functionToRun();

    console.timeEnd('Total time');
    process.exit(0);
}

async function readSheet(fileName, worksheetName) {
    const workbook = new ExcelJS.Workbook();
    const headers = [];
    const rows = [];

    await workbook.xlsx.readFile(fileName, { map: value => value });

    const worksheet = workbook.getWorksheet(worksheetName ?? workbook.worksheets[0].name);

    worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
        if (rowNumber === 1) {
            headers.push(...row.values);
        } else {
            rows.push(row.values);
        }
    });

    const rowsObj = rows.map(row => {
        const item = row.reduce((acc, value, index) => {
            acc[headers[index]] = value;

            return acc;
        }, {});

        return item;
    });

    return rowsObj;
}

module.exports = {
    runScript,
    writeDebugJson,
    generateReport,
    readSheet,
};