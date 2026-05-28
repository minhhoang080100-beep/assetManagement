import mongoose from 'mongoose';

const procurementItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: 'Cái' },
    quantity: { type: Number, required: true, min: 1 },
    specs: { type: String, trim: true },
    estimatedPrice: { type: Number, required: true, min: 0 }
});

const quotationSchema = new mongoose.Schema({
    supplier: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    attachment: { type: String, trim: true },
    note: { type: String, trim: true }
}, { _id: false });

const procurementRequestSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true, index: true },
    reason: { type: String, required: true, trim: true },
    estimatedCost: { type: Number, required: true, min: 0 },
    items: [procurementItemSchema],
    procurementType: { type: String, enum: ['Định kỳ', 'Đột xuất'], default: 'Đột xuất' },
    targetYear: { type: Number, min: 2020, max: 2100, index: true },
    submissionDeadline: { type: Date },
    status: { type: String, enum: ['Chờ duyệt', 'Đã lập kế hoạch', 'TGĐ phê duyệt', 'Từ chối', 'Đang thực hiện', 'Hoàn tất', 'Đã nhập kho'], default: 'Chờ duyệt' },
    requestedBy: { type: String, trim: true },
    requesterName: { type: String, trim: true },
    requestedDate: { type: Date, default: Date.now },
    hcthOpinion: { type: String, trim: true },
    reviewedBy: { type: String, trim: true },
    reviewedDate: { type: Date },
    quotations: [quotationSchema],
    selectedSupplier: { type: String, trim: true },
    contractNumber: { type: String, trim: true },
    contractAttachment: { type: String, trim: true },
    requiresContract: { type: Boolean, default: false },
    dueDate: { type: Date },
    approvedBy: { type: String, trim: true },
    approvedDate: { type: Date },
    attachment: { type: String, trim: true },
    handover: {
        receiverName: { type: String, trim: true },
        supplier: { type: String, trim: true },
        accessories: { type: String, trim: true },
        warrantyUntil: { type: Date },
        acceptanceNote: { type: String, trim: true },
        handoverDate: { type: Date },
        createdBy: { type: String, trim: true },
        createdAt: { type: Date }
    }
}, { timestamps: true });

export default mongoose.model('ProcurementRequest', procurementRequestSchema);
