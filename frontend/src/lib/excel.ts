import type { CellValue } from 'exceljs';

export type ExcelRow = Record<string, string | number | boolean | Date | null>;

function normalizeCellValue(value: CellValue): string | number | boolean | Date | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value) return normalizeCellValue(value.result as CellValue);
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
  }
  return String(value);
}

export async function readWorkbookRows(file: File): Promise<ExcelRow[]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const value = normalizeCellValue(cell.value);
    headers[colNumber] = String(value || `__EMPTY_${colNumber - 1}`).trim();
  });

  const rows: ExcelRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: ExcelRow = {};
    headers.forEach((header, index) => {
      const cell = row.getCell(index);
      record[header] = normalizeCellValue(cell.value);
    });
    rows.push(record);
  });

  return rows;
}

export async function writeWorkbook(
  sheetName: string,
  rows: ExcelRow[],
  filename: string,
  columnWidths: number[] = []
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const headers = Object.keys(rows[0] || {});

  worksheet.columns = headers.map((header, index) => ({
    header,
    key: header,
    width: columnWidths[index] || Math.max(15, header.length + 4),
  }));
  rows.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
