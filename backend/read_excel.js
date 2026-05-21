import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile('../Kiểm kê 2024.xlsx');
const sheet = workbook.getWorksheet('CL') || workbook.worksheets[0];
const data = [];

sheet.eachRow({ includeEmpty: true }, (row) => {
    data.push(row.values.slice(1));
});

const departmentsMap = {};
let currentUnit = null;

// Skip headers, assuming data starts at index 3
for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const unit = row[0];
    const department = row[1];
    
    // Update currentUnit if it's not empty
    if (unit && typeof unit === 'string' && unit.trim() !== '') {
        currentUnit = unit.trim();
    }
    
    if (currentUnit && department && typeof department === 'string' && department.trim() !== '') {
        const cleanDept = department.trim();
        
        if (!departmentsMap[currentUnit]) {
            departmentsMap[currentUnit] = new Set();
        }
        departmentsMap[currentUnit].add(cleanDept);
    }
}

const result = [];
for (const [unit, depts] of Object.entries(departmentsMap)) {
    result.push({
        group: unit,
        items: Array.from(depts).sort((a, b) => a.localeCompare(b, 'vi'))
    });
}

result.sort((a, b) => a.group.localeCompare(b.group, 'vi'));

console.log(JSON.stringify(result, null, 2));
