import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from './models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => { console.error(err); process.exit(1); });

const seedUsers = async () => {
    try {
        const samplePassword = process.env.SEED_USER_PASSWORD;
        if (!samplePassword || samplePassword.length < 8) {
            throw new Error('Vui lòng đặt SEED_USER_PASSWORD tối thiểu 8 ký tự trước khi tạo tài khoản mẫu.');
        }
        await User.deleteMany({});

        const SALT_ROUNDS = 10;
        const passwordHash = await bcrypt.hash(samplePassword, SALT_ROUNDS);

        const users = [
            { username: 'admin_hcth', password: passwordHash, fullName: 'Quản trị Hành chính', role: 'ADMIN', department: 'Văn phòng Cảng - Phòng Hành chính tổng hợp' },
            { username: 'ketoan_cl', password: passwordHash, fullName: 'Kế toán Cửa Lò', role: 'MANAGER', department: 'Cửa Lò - Phòng Kế toán tổng hợp' },
            { username: 'kythuat_bt', password: passwordHash, fullName: 'Kỹ thuật Bến Thủy', role: 'USER', department: 'Bến Thủy - Phòng Kỹ thuật' },
            { username: 'tgd', password: passwordHash, fullName: 'Tổng Giám Đốc', role: 'DIRECTOR', department: 'Văn phòng Cảng - Phòng Tổng Giám đốc' }
        ];
        
        await User.insertMany(users);
        console.log('✅ Đã tạo 4 tài khoản mẫu thành công (mật khẩu đã hash bcrypt)!');
        process.exit(0);
    } catch(err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
}

seedUsers();
