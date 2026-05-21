import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Equipment from './models/Equipment.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UNIT_CODE_MAP = {
  "Cửa Lò": "CL",
  "Bến Thủy": "BT",
  "Văn phòng Cảng": "VPC"
};

const DEPT_CODE_MAP = {
  "Bộ phận kinh doanh": "KD",
  "Phòng An toàn": "AT",
  "Phòng Giám đốc": "GD",
  "Phòng Giám đốc khai thác": "GDKH",
  "Phòng Giám đốc kỹ thuật": "GDKT",
  "Phòng Giám đốc thương vụ": "GDTV",
  "Phòng Kế toán tổng hợp": "KT",
  "Phòng Kỹ thuật": "KTH",
  "Phòng Quỹ": "Q",
  "Phòng Y tế": "YT",
  "Phòng giao ban, Hội trường": "HT",
  "Phòng Điều độ hiện trường": "DĐHT",
  "Trung tâm khai thác": "TTKT",
  "Hội trường": "HT",
  "Ngoài văn phòng": "NVP",
  "Phòng Kế toán nghiệp vụ": "KTNV",
  "Phòng Phó Giám đốc": "PGD",
  "Phòng Điều độ": "DĐ",
  "Hội trường tầng 5": "HT5",
  "Phòng Bảo vệ": "BV",
  "Phòng Chủ tịch Hội đồng quản trị": "HDQT",
  "Phòng Công đoàn": "CD",
  "Phòng Giám đốc nội chính": "GDNC",
  "Phòng Hành chính tổng hợp": "HC",
  "Phòng Kế hoạch Kinh doanh": "KHKD",
  "Phòng Lái xe": "LX",
  "Phòng Phó Tổng Giám đốc Kinh doanh": "PTGDKD",
  "Phòng Quản trị": "QT",
  "Phòng Tài chính kế toán": "TCKT",
  "Phòng Tạp vụ": "TV",
  "Phòng Tổ chức Cán bộ - Lao động": "TCCB",
  "Phòng Tổng Giám đốc": "TGD",
  "Phòng Vệ sinh": "VS",
  "Phòng họp giao ban": "PHGB",
  "Phòng truyền thống": "PTT",
  "Trạm biến áp": "TBA"
};

const getDepartmentCode = (donvi, bophan) => {
    const unitCode = UNIT_CODE_MAP[donvi] || 'CNT';
    const deptCode = DEPT_CODE_MAP[bophan] || 'KH';
    return `${unitCode}.${deptCode}`;
}

const getTypeFromDeviceName = (name) => {
    let n = String(name || '').toLowerCase();
    if(n.includes('máy tính') || n.includes('laptop')) return 'MT';
    if(n.includes('máy in')) return 'MI';
    if(n.includes('điều hòa') || n.includes('máy lạnh')) return 'DH';
    if(n.includes('máy photo')) return 'MP';
    if(n.includes('bàn') || n.includes('ghế') || n.includes('tủ')) return 'NT'; 
    return 'TB'; 
}

const worksheetToRows = (worksheet) => {
    const rows = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
        rows.push(row.values.slice(1));
    });
    return rows;
};

const normalizeHeaderName = (header, index) => {
    const value = String(header || '').trim();
    return value || `__EMPTY_${index}`;
};

const rowsToObjects = (rows, headerRowIndex) => {
    const headers = rows[headerRowIndex].map(normalizeHeaderName);
    return rows.slice(headerRowIndex + 1).map((row) => {
        const record = {};
        headers.forEach((header, index) => {
            record[header] = row[index];
        });
        return record;
    });
};

const seedDatabase = async () => {
    try {
        console.log('Đang kết nối MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for Seeding');

        const filePath = path.join(__dirname, '../Kiểm kê 2024.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];
        
        // Chuyển sang mảng 2 chiều để dễ tìm dòng Header
        const rawData = worksheetToRows(worksheet);
        
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell => String(cell).includes('Tên, nhãn hiệu'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.error('❌ Không tìm thấy dòng tiêu đề trong file Excel.');
            process.exit(1);
        }

        // Đọc lại data với cấu trúc header chuẩn xác
        const data = rowsToObjects(rawData, headerRowIndex);
        
        let counter = {};
        let equipments = [];

        let currentDonvi = '';

        const RAW_TO_CLEAN_MAP = {
          "P.CĐ -> P.An toàn)": "Phòng An toàn",
          "P. Giám đốc khai thác": "Phòng Giám đốc khai thác",
          "Kế toán tổng hợp": "Phòng Kế toán tổng hợp",
          "P.Giám đốc": "Phòng Giám đốc",
          "P.Giám đốc kỹ thuật": "Phòng Giám đốc kỹ thuật",
          "P.Giám đốc thương vụ": "Phòng Giám đốc thương vụ",
          "P.giao ban, Hội trường": "Phòng giao ban, Hội trường",
          "P.Điều độ hiện trường": "Phòng Điều độ hiện trường",
          "Phòng  Giám đốc": "Phòng Giám đốc",
          "Phòng P.Giám Đốc": "Phòng Phó Giám đốc",
          "Phòng Chủ Tịch Hội đồng quản trị": "Phòng Chủ tịch Hội đồng quản trị",
          "Phòng Công Đoàn": "Phòng Công đoàn",
          "Phòng Giám Đốc nội chính": "Phòng Giám đốc nội chính",
          "Phòng KHKD": "Phòng Kế hoạch Kinh doanh",
          "Phòng Kỹ Thuật": "Phòng Kỹ thuật",
          "Phòng Phó Tổng Giám đốc Kinh Doanh": "Phòng Phó Tổng Giám đốc Kinh doanh",
          "Phòng Quỷ": "Phòng Quỹ",
          "Phòng Tổ chức cán bộ - Lao động": "Phòng Tổ chức Cán bộ - Lao động"
        };

        for (const row of data) {
            const name = row['Tên, nhãn hiệu, quy cách vật tư, dụng cụ,...'];
            const quantity = Number(row['Theo kiểm kê']) || Number(row['Số lượng']); // Dựa theo format kiểm kê

            if (!name || isNaN(quantity) || quantity <= 0) continue; 

            let donvi = row['Đơn vị'];
            if (donvi && String(donvi).trim() !== '') {
                currentDonvi = String(donvi).trim();
            }
            donvi = currentDonvi;
            
            let bophan = row['Bộ Phận'];
            if (bophan && typeof bophan === 'string') {
                bophan = bophan.trim();
                if (RAW_TO_CLEAN_MAP[bophan]) {
                    bophan = RAW_TO_CLEAN_MAP[bophan];
                }
            }
            
            const deptCode = getDepartmentCode(donvi, bophan);
            const typeCode = getTypeFromDeviceName(name);
            const key = `${deptCode}-${typeCode}`;

            // Xác định tình trạng và phần trăm chất lượng
            let status = 'Tốt';
            let condition = 100;

            if (row['Phẩm chất'] !== undefined && Number(row['Phẩm chất']) > 0) {
                status = 'Tốt';
                condition = Math.round(Number(row['Phẩm chất']) * 100);
            } else if (row['__EMPTY_5'] !== undefined && Number(row['__EMPTY_5']) > 0) {
                status = 'Kém phẩm chất';
                condition = Math.round(Number(row['__EMPTY_5']) * 100); 
            } else if (row['__EMPTY_6'] !== undefined && Number(row['__EMPTY_6']) > 0) {
                status = 'Thanh lý';
                condition = Math.round(Number(row['__EMPTY_6']) * 100);
            }

            // Nếu 1 dòng Excel có số lượng > 1, ta sinh ra nhiều mã thiết bị riêng lẻ
            for(let q = 0; q < quantity; q++) {
                if(!counter[key]) counter[key] = 1;
                const seq = String(counter[key]).padStart(3, '0');
                const newCode = `${deptCode}-${typeCode}.24-${seq}`;
                counter[key]++;
                
                equipments.push({
                    code: newCode,
                    name: String(name).trim(),
                    department: `${donvi || ''} - ${bophan || ''}`.trim().replace(/^ - | - $/g, ''),
                    status: status,
                    condition: condition,
                    purchaseYear: 2024,
                    price: Number(row['Đơn giá']) || 0
                });
            }
        }
        
        console.log(`Đã phân tích xong: Tách được ${equipments.length} thiết bị từ file Excel.`);
        
        // Xóa db cũ và thêm mới
        await Equipment.deleteMany({});
        await Equipment.insertMany(equipments);
        
        console.log('✅ Đã nạp thành công dữ liệu vào MongoDB!');
        process.exit(0);
    } catch(err) {
        console.error('❌ Lỗi khi import:', err);
        process.exit(1);
    }
}

seedDatabase();
