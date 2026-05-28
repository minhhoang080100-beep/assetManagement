import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedDepartmentAccounts } from './helpers/departmentAccounts.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => { console.error(err); process.exit(1); });

const seedUsers = async () => {
    try {
        const samplePassword = process.env.SEED_USER_PASSWORD;
        if (!samplePassword || samplePassword.length < 6) {
            throw new Error('Vui lòng đặt SEED_USER_PASSWORD tối thiểu 6 ký tự trước khi tạo tài khoản mẫu.');
        }
        const result = await seedDepartmentAccounts(samplePassword);
        console.log(`✅ Đã tạo/cập nhật ${result.accountCount} tài khoản (${result.departmentAccountCount} tài khoản phòng ban, ${result.approverAccountCount} tài khoản phê duyệt).`);
        if (result.removedDeprecated > 0) {
            console.log(`ℹ️ Đã xóa ${result.removedDeprecated} tài khoản mẫu cũ không còn đúng mô hình dùng chung.`);
        }
        process.exit(0);
    } catch(err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
}

seedUsers();
