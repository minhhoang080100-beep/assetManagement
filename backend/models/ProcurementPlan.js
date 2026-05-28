import mongoose from 'mongoose';

const planItemSchema = new mongoose.Schema({
  sourceProcurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcurementRequest' },
  name: { type: String, required: true, trim: true },
  unit: { type: String, trim: true, default: 'Cái' },
  quantity: { type: Number, required: true, min: 1 },
  specs: { type: String, trim: true },
  department: { type: String, required: true, trim: true },
  estimatedPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const procurementPlanSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  period: { type: String, required: true, trim: true },
  planType: { type: String, enum: ['Định kỳ', 'Đột xuất'], default: 'Đột xuất' },
  targetYear: { type: Number, min: 2020, max: 2100, index: true },
  planningDeadline: { type: Date },
  createdBy: { type: String, trim: true },
  sourceProcurements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProcurementRequest' }],
  items: [planItemSchema],
  totalEstimatedCost: { type: Number, default: 0, min: 0 },
  note: { type: String, trim: true },
  dueDate: { type: Date },
  status: { type: String, enum: ['Đang lập', 'Chờ duyệt', 'TGĐ phê duyệt', 'Từ chối'], default: 'Đang lập' },
  approvedBy: { type: String, trim: true },
  approvedDate: { type: Date },
}, { timestamps: true });

export default mongoose.model('ProcurementPlan', procurementPlanSchema);
