import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../Kiểm kê 2024.xlsx');
const ws = wb.worksheets[0];
const headerRow = ws.getRow(1).values.slice(1).map((value, index) => String(value || `__EMPTY_${index}`).trim());
const data = [];

ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    row.values.slice(1).forEach((value, index) => {
        record[headerRow[index]] = value;
    });
    data.push(record);
});

const donvis = new Set();
data.forEach(r => {
    if(r['Đơn vị']) donvis.add(r['Đơn vị']);
});
console.log('Distinct Đơn vị:', Array.from(donvis));
