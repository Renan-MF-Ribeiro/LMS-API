const path = require('node:path');
const ExcelJS = require('exceljs');

async function setSheetResponse(fileName, fieldMap, res) {
    const headers = Object.values(fieldMap).filter(value => !['não mapear'].includes(String(value).toLowerCase()));

    const workbook = new ExcelJS.Workbook();

    const userLoadTemplatePath = path.join(__dirname, `./templates/${fileName}.xlsx`);

    await workbook.xlsx.readFile(userLoadTemplatePath);

    const worksheet = workbook.getWorksheet('Sua CargaUsuario Aqui');

    worksheet.getRow(1).values = headers;

    worksheet.getRow(1).eachCell(cell => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF000000' },
        };

        cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
        };

        const contentWidth = cell.value ? cell.value.toString().length + 4 : 10;

        const column = worksheet.getColumn(cell.col);

        column.width = contentWidth;
    });

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);

    res.end();
}

module.exports = { setSheetResponse };