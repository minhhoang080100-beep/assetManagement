import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['Bảo dưỡng', 'Sửa chữa', 'Thay thế linh kiện', 'Nghiệm thu mới', 'Nhập kho', 'Kiểm kê', 'Thanh lý'] },
  description: { type: String, trim: true }
});

const equipmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  specs: { type: String, trim: true },
  department: { type: String, trim: true, index: true },
  status: { type: String, enum: ['Tốt', 'Đang sửa chữa', 'Kém phẩm chất', 'Thanh lý'], default: 'Tốt' },
  condition: { type: Number, default: 100, min: 0, max: 100 },
  purchaseYear: { type: Number, min: 1990, max: 2100 },
  price: { type: Number, min: 0, default: 0 },
  images: [{ type: String, trim: true }],
  history: [eventSchema]
}, { timestamps: true });

export default mongoose.model('Equipment', equipmentSchema);
