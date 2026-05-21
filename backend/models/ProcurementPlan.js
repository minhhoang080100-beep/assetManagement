import mongoose from 'mongoose';

const planItemSchema = new mongoose.Schema({
  sourceProcurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcurementRequest' },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  specs: { type: String, trim: true },
  department: { type: String, required: true, trim: true },
  estimatedPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const procurementPlanSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  period: { type: String, required: true, trim: true },
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
