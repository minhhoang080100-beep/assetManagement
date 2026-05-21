import mongoose from 'mongoose';

const repairRequestSchema = new mongoose.Schema({
  reqCode: { type: String, required: true, unique: true, trim: true, index: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  equipmentCode: { type: String, trim: true },
  equipmentName: { type: String, trim: true },
  department: { type: String, required: true, trim: true, index: true },
  issue: { type: String, required: true, trim: true },
  requestType: { type: String, enum: ['Sửa chữa', 'Thay thế linh kiện'], default: 'Sửa chữa' },
  status: { type: String, enum: ['Chờ duyệt', 'Đã tiếp nhận', 'TGĐ phê duyệt', 'Từ chối', 'Đang sửa chữa', 'Đã hoàn thành'], default: 'Chờ duyệt' },
  requestedDate: { type: Date, default: Date.now },
  requestedBy: { type: String, trim: true },
  requesterName: { type: String, trim: true },
  hcthAssessment: { type: String, enum: ['Đúng thực tế', 'Khác'] },
  hcthAssessmentNote: { type: String, trim: true },
  hcthProposal: { type: String, trim: true },
  assessedBy: { type: String, trim: true },
  assessedDate: { type: Date },
  dueDate: { type: Date },
  completedDate: { type: Date },
  solution: { type: String, trim: true },
  cost: { type: Number, default: 0, min: 0 },
  performedBy: { type: String, trim: true },
  attachment: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model('RepairRequest', repairRequestSchema);
