import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Equipment from './models/Equipment.js';
import RepairRequest from './models/RepairRequest.js';
import ProcurementRequest from './models/ProcurementRequest.js';
import MaintenancePlan from './models/MaintenancePlan.js';
import AuditLog from './models/AuditLog.js';
import Counter from './models/Counter.js';
import ProcurementPlan from './models/ProcurementPlan.js';
import InventoryAudit from './models/InventoryAudit.js';
import DisposalRequest from './models/DisposalRequest.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => { console.error(err); process.exit(1); });

const clearDatabase = async () => {
    try {
        console.log('Đang xóa dữ liệu cũ...');
        await Equipment.deleteMany({});
        console.log('- Đã xóa Equipment');
        
        await RepairRequest.deleteMany({});
        console.log('- Đã xóa RepairRequest');
        
        await ProcurementRequest.deleteMany({});
        console.log('- Đã xóa ProcurementRequest');

        await ProcurementPlan.deleteMany({});
        console.log('- Đã xóa ProcurementPlan');
        
        await MaintenancePlan.deleteMany({});
        console.log('- Đã xóa MaintenancePlan');
        
        await AuditLog.deleteMany({});
        console.log('- Đã xóa AuditLog');

        await InventoryAudit.deleteMany({});
        console.log('- Đã xóa InventoryAudit');

        await DisposalRequest.deleteMany({});
        console.log('- Đã xóa DisposalRequest');

        await Counter.deleteMany({});
        console.log('- Đã xóa Counter');
        
        console.log('✅ Đã xóa toàn bộ dữ liệu (ngoại trừ User) thành công!');
        process.exit(0);
    } catch(err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
}

clearDatabase();
