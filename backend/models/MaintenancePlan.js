import mongoose from 'mongoose';

const maintenanceItemSchema = new mongoose.Schema({
  equipmentCode: { type: String, required: true, trim: true },
  equipmentName: { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  content: { type: String, required: true, trim: true },
  scheduledDate: { type: Date },
  status: { type: String, enum: ['Chưa thực hiện', 'Đã thực hiện'], default: 'Chưa thực hiện' },
  result: { type: String, trim: true },
  performedBy: { type: String, trim: true },
  note: { type: String, trim: true }
});

const maintenancePlanSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  period: { type: String, trim: true },
  department: { type: String, trim: true, index: true },
  createdBy: { type: String, trim: true },
  items: [maintenanceItemSchema],
  dueDate: { type: Date },
  status: { type: String, enum: ['Đang lập', 'Chờ duyệt', 'TGĐ phê duyệt', 'Từ chối', 'Đã thực hiện'], default: 'Đang lập' }
}, { timestamps: true });

export default mongoose.model('MaintenancePlan', maintenancePlanSchema);
