import mongoose from 'mongoose';

const disposalRequestSchema = new mongoose.Schema({
  equipmentCode: { type: String, required: true, trim: true, index: true },
  equipmentName: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true, index: true },
  reason: { type: String, required: true, trim: true },
  requestedBy: { type: String, trim: true },
  requestedDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Chờ duyệt', 'TGĐ phê duyệt', 'Từ chối', 'Đã thanh lý'], default: 'Chờ duyệt' },
  approvedBy: { type: String, trim: true },
  approvedDate: { type: Date },
  completedBy: { type: String, trim: true },
  completedDate: { type: Date },
  note: { type: String, trim: true },
}, { timestamps: true });

export default mongoose.model('DisposalRequest', disposalRequestSchema);
