const path = require('node:path');
const express = require('express');
const ExcelJS = require('exceljs');

const { getConnectMap } = require('../../utils/connect');

const downloadsRouter = express.Router();

downloadsRouter.get('/user-load-sheet', async (req, res) => {
    const connectMap = await getConnectMap(false);

    const headers = Object.values(connectMap).filter(value => !['não mapear'].includes(String(value).toLowerCase()));

    const workbook = new ExcelJS.Workbook();

    const userLoadTemplatePath = path.join(__dirname, './templates/CargaUsuarios_Default.xlsx');

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

    res.setHeader('Content-Disposition', 'attachment; filename="CargaUsuarios_Default.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);

    res.end();
})

module.exports = downloadsRouter;