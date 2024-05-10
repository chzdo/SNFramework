import ExcelJS from 'exceljs';
import fse from "fs-extra";
import dayjs from 'dayjs';
import { Readable } from 'readable-stream'
import pdf from "html-pdf-node"
import { types } from '../utils/enums.mjs';

const sheetName = /[^\w\s-]/gi;
const tableNameRegex = /[^\w]/gi
const reportTypes = types;
const defaultFileType = reportTypes?.EXCEL;

function getTableOrSheetName({ name, workbook, isSheetName = true }) {
    if (!workbook) {
        return name;
    }
    let existingTableNames = [];
    workbook._worksheets.forEach(sheet => {
        const names = isSheetName ? [sheet.name] : Object.keys(sheet.tables)
        existingTableNames.push(...names);
    });

    let suffix = 0;
    if (existingTableNames.includes(name)) {
        name = `${name}${++suffix}`;
    }
    return name;
}
const operations = { "Mul": "*", "Add": "+", "Sub": "-", "Div": "/" };

const writeExcelSheet = async function ({ title = "main", rows, columns, name, workbook, tableName, returnBuffer = false }) {
    workbook = workbook || new ExcelJS.Workbook();
    name = name || title.replace(sheetName, '');
    name = getTableOrSheetName({ name, workbook })
    const worksheet = workbook.addWorksheet(name);
    if (!tableName) {
        tableName = 'table' + name.replace(tableNameRegex, '');
    }
    tableName = getTableOrSheetName({ name: tableName, workbook, isSheetName: false });
    let excelColumns = [];
    const firstRow = rows[0] || {};
    // const keys = Object.keys(firstRow);
    const keys = []
    for (const column in columns) {
        const details = columns[column]
        if (typeof details.keyOrder !== "undefined") {
            keys[details.keyOrder] = column
        } else {
            keys.push(column)
        }
    }
    let colFormats = [];
    let index = 0;
    for (const key of keys) {
        index++;
        const colConfig = columns[key];
        let name = key;
        if (colConfig) {
            const { title: colTitle, callback, ...others } = colConfig;
            name = colTitle || name;
            if (Object.keys(others).length > 0) {
                colFormats.push({ index, ...others });
            }
        }
        excelColumns.push({ name: name, filterButton: rows.length > 0, width: 200, ...columns[key] });
    }

    let tableRows = [];
    for (const row of rows) {
        const rowData = [];
        for (const key of keys) {
            rowData.push(row[key] || null);
        }
        tableRows.push(rowData);
    }

    worksheet.addTable({
        name: tableName,
        ref: "A1",
        headerRow: true,
        style: {
            showRowStripes: true,
        },
        columns: excelColumns,
        rows: tableRows?.length > 0 ? tableRows : [['']]
    });

    for (const [colNumber, key] of keys.entries()) {
        const callback = columns[key]?.callback;
        const formula = columns[key]?.formula;
        if (callback) {
            for (const [rowNumber, rowData] of rows.entries()) {
                await callback({ workbook, worksheet, colNumber: 1 + colNumber, rowNumber: 2 + rowNumber, rowData, length: tableRows.length });
            }
        }
        if (formula) {
            const { columns: col = [] } = formula;
            if (!operations[formula?.type]) continue;
            const selectedColumn = 1 + colNumber;
            const columnNumbers = col.map((k) => keys.findIndex((v) => v === k)).filter((v) => v != -1);
            if (columnNumbers.length != col.length) continue;
            for (const [rowNumber] of rows.entries()) {
                let formulas = [];
                const selectedRow = 2 + rowNumber;
                for (const index of columnNumbers) {
                    formulas.push(worksheet.getCell(selectedRow, (index + 1))?.address)
                }
                worksheet.getCell(selectedRow, selectedColumn).value = {
                    formula: formulas.join(operations[formula?.type]),
                }
            }
        }
    }

    for (const colFormat of colFormats) {
        const { index: colIndex, ...others } = colFormat;
        const column = worksheet.getColumn(colIndex);
        Object.assign(column, others);
    }
};

const format = {
    date: (value) => {
        if (!value) {
            return null;
        }
        return dayjs(value).toISOString().split("T")[0]
    }
}

const toExcelFile = async function ({ title, sheets, fileName, stream, returnBuffer = false }) {
    const workbook = new ExcelJS.Workbook();
    for (const sheetDetail of sheets) {
        await writeExcelSheet({ title, ...sheetDetail, workbook });
    }
    if (stream) {
        if (typeof stream.set === "function") {
            stream.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            stream.set('Content-Disposition', `inline; filename="${fileName}.xlsx"`);
        }
        await workbook.xlsx.write(stream);
    } else {
        if (returnBuffer) {
            return await workbook.xlsx.writeBuffer()
        }
        fileName = `./${title || fileName}.xlsx`;
        await workbook.xlsx.writeFile(fileName);
        return fileName;
    }
}

const toTextFile = async ({ fileName, settings, stream, reportType = reportTypes.CSV }) => {
    let textFile;
    let { rows, useHeader = false, delimiter = ",", columns = {} } = settings
    const isJson = reportType === reportTypes.JSON, keysOrder = Object.keys(columns);
    let ct = 'application/json'
    if (!isJson) {
        ct = reportTypes.CSV ? 'text/csv' : 'text/plain'
        textFile = '';
        if (Object.keys(columns)?.length) {
            //filter columns
            for (const item of rows) {
                for (const key in item) {
                    if (columns[key]) continue;
                    delete item[key]
                }
            }
            for (const item of rows) {
                for (const key in item) {
                    const { format: formatKey } = columns[key];
                    const formatValue = format[formatKey];
                    if (typeof formatValue === "function") {
                        item[key] = formatValue(item[key])
                    }
                }
            }

        }
        if (useHeader && rows.length) {
            textFile += `${Object.keys(rows[0]).join(delimiter)}`;
        }
        for (const [index, row] of rows.entries()) {
            const orderedVal = []
            for (const key of keysOrder) {
                orderedVal.push(row[key])
            }
            const newLine = !textFile && index === 0 ? "" : "\n";
            textFile += `${newLine}${Object.values(orderedVal).join(delimiter)}`;
        }
    }


    if (stream) {
        stream.set('Content-Type', ct);
        stream.set('Content-Disposition', `inline; filename="${fileName}.${reportType}"`);
        const readable = new Readable();
        readable.push(isJson ? JSON.stringify(rows) : textFile.toString());
        readable.push(null)
        readable.pipe(stream);
        return;
    }

    if (isJson) {
        await fse.writeJSON(`./${title}.${reportType}`, rows);
        return;
    }
    fse.writeFile(`./${title}.${reportType}`, textFile)
}

function createHTMLTable({ data = [], columns }) {

    let tableHTML = '<style>';
    tableHTML += 'table { border-collapse: collapse; width: 100%; }';
    tableHTML += 'th, td { border: 1px solid #000; padding: 8px; text-align: left; }';
    tableHTML += '</style>';

    tableHTML += '<table>';
    tableHTML += '<thead><tr>';
    for (const key in data[0]) {
        tableHTML += `<th>${columns[key].title}</th>`;
    }
    tableHTML += '</tr></thead>';

    tableHTML += '<tbody>';
    data.forEach((row) => {
        tableHTML += '<tr>';
        for (const key in row) {
            tableHTML += `<td>${columns[key]?.format ? columns[key]?.format(row[key]) : row[key]}</td>`;
        }
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';

    tableHTML += '</table>';
    return tableHTML;
}


const toPdfFile = async function ({ fileName, settings, stream }) {
    const tableHTML = createHTMLTable(settings);
    const pdfOptions = { format: 'A4' };
    stream.set('Content-Type', 'application/pdf');
    stream.set('Content-Disposition', `inline; filename="${fileName}.pdf"`);
    await pdf.generatePdf({ content: tableHTML }, pdfOptions)
        .then((pdfBuffer) => {
            if (stream) {
                const readable = new Readable();
                readable.push(pdfBuffer);
                readable.push(null);
                readable.pipe(stream);
            } else {
                const fileName = `./${title}.${reportTypes.PDF}`;
                fse.writeFile(fileName, pdfBuffer);
            }
        })
        .catch((error) => {
            console.log('Error creating PDF:', error);
        });
}

const handlers = {
    [reportTypes?.EXCEL]: toExcelFile,
    [reportTypes?.CSV]: toTextFile,
    [reportTypes?.TXT]: toTextFile,
    [reportTypes?.JSON]: toTextFile,
    [reportTypes?.PDF]: toPdfFile
}


const getFile = async function ({ reportType = defaultFileType, title, fileName, stream, sheets, settings, returnBuffer }) {
    const reportHandler = handlers[reportType]
    if (typeof reportHandler !== "function") {
        console.log(`handler not defined for ${reportType}`)
        return
    }

    return await reportHandler({ reportType, title, sheets, stream, settings, fileName, returnBuffer })
}


export default getFile