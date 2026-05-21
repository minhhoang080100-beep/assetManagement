import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true, index: true },
  entity: { type: String, required: true, trim: true },
  entityId: { type: String, trim: true },
  user: { type: String, required: true, trim: true, index: true },
  details: { type: String, trim: true },
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
