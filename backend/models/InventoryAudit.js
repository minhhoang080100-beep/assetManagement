import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  equipmentCode: { type: String, required: true, trim: true },
  equipmentName: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  actualStatus: { type: String, enum: ['Tốt', 'Đang sửa chữa', 'Kém phẩm chất', 'Thanh lý'], required: true },
  condition: { type: Number, min: 0, max: 100, default: 100 },
  note: { type: String, trim: true },
  recommendation: { type: String, enum: ['Không', 'Sửa chữa', 'Thanh lý'], default: 'Không' },
}, { _id: false });

const inventoryAuditSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  period: { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  createdBy: { type: String, trim: true },
  items: [inventoryItemSchema],
  status: { type: String, enum: ['Đang kiểm kê', 'Hoàn tất'], default: 'Đang kiểm kê' },
  completedDate: { type: Date },
}, { timestamps: true });

export default mongoose.model('InventoryAudit', inventoryAuditSchema);
