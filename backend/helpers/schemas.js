import { z } from 'zod';
import { VALID_EQUIPMENT_TYPES } from './constants.js';

const nonEmptyString = z.string().trim().min(1);
const optionalString = z.string().trim().optional().or(z.literal(''));
const mongoId = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'ID không hợp lệ');

export const equipmentStatusSchema = z.enum(['Tốt', 'Đang sửa chữa', 'Kém phẩm chất', 'Thanh lý']);
export const repairStatusSchema = z.enum(['Chờ duyệt', 'Đã tiếp nhận', 'TGĐ phê duyệt', 'Từ chối', 'Đang sửa chữa', 'Đã hoàn thành']);
export const procurementStatusSchema = z.enum(['Chờ duyệt', 'Đã lập kế hoạch', 'TGĐ phê duyệt', 'Từ chối', 'Đang thực hiện', 'Hoàn tất', 'Đã nhập kho']);
export const procurementPlanStatusSchema = z.enum(['Đang lập', 'Chờ duyệt', 'TGĐ phê duyệt', 'Từ chối']);
export const maintenancePlanStatusSchema = z.enum(['Đang lập', 'Chờ duyệt', 'TGĐ phê duyệt', 'Từ chối', 'Đã thực hiện']);
export const procurementTypeSchema = z.enum(['Định kỳ', 'Đột xuất']);
const targetYearSchema = z.coerce.number().int().min(2020).max(2100).optional();

export const idParamSchema = z.object({ id: mongoId });

export const createEquipmentSchema = z.object({
  code: z.string().trim().optional(),
  name: nonEmptyString,
  specs: optionalString,
  department: nonEmptyString,
  status: equipmentStatusSchema.optional(),
  condition: z.coerce.number().min(0).max(100).optional(),
  purchaseYear: z.coerce.number().int().min(1990).max(2100).optional(),
  price: z.coerce.number().min(0).optional(),
  typeCode: z.enum(VALID_EQUIPMENT_TYPES).optional(),
  images: z.array(z.string().trim()).optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.pick({
  name: true,
  specs: true,
  department: true,
  status: true,
  condition: true,
  purchaseYear: true,
  price: true,
  images: true,
}).partial();

export const bulkEquipmentSchema = z.array(createEquipmentSchema.extend({
  code: nonEmptyString,
}).omit({ typeCode: true })).min(1).max(1000);

export const equipmentMaintenanceSchema = z.object({
  type: z.enum(['Bảo dưỡng', 'Sửa chữa', 'Thay thế linh kiện', 'Nghiệm thu mới', 'Nhập kho', 'Kiểm kê', 'Thanh lý']).default('Bảo dưỡng'),
  description: nonEmptyString.max(2000),
});

export const createRepairSchema = z.object({
  equipmentId: mongoId.optional(),
  equipmentCode: nonEmptyString,
  equipmentName: nonEmptyString,
  issue: nonEmptyString.max(3000),
  requestType: z.enum(['Sửa chữa', 'Thay thế linh kiện']).default('Sửa chữa'),
  requesterName: nonEmptyString.max(200),
  attachment: optionalString,
});

export const updateRepairSchema = z.object({
  status: repairStatusSchema,
  hcthAssessment: z.enum(['Đúng thực tế', 'Khác']).optional(),
  hcthAssessmentNote: optionalString,
  hcthProposal: optionalString,
  solution: optionalString,
  cost: z.coerce.number().min(0).optional(),
  performedBy: optionalString,
  completedDate: z.string().datetime().optional(),
});

const procurementItemSchema = z.object({
  name: nonEmptyString.max(500),
  unit: optionalString.default('Cái'),
  quantity: z.coerce.number().int().min(1).max(1000),
  specs: optionalString,
  estimatedPrice: z.coerce.number().min(0),
});

const quotationSchema = z.object({
  supplier: nonEmptyString.max(300),
  price: z.coerce.number().min(0),
  attachment: optionalString,
  note: optionalString,
});

export const createProcurementSchema = z.object({
  title: nonEmptyString.max(500),
  reason: nonEmptyString.max(3000),
  requesterName: nonEmptyString.max(200),
  estimatedCost: z.coerce.number().min(0),
  items: z.array(procurementItemSchema).min(1).max(200),
  procurementType: procurementTypeSchema.default('Đột xuất'),
  targetYear: targetYearSchema,
  attachment: optionalString,
});

export const updateProcurementSchema = z.object({
  status: procurementStatusSchema,
  hcthOpinion: optionalString,
  quotations: z.array(quotationSchema).max(10).optional(),
  selectedSupplier: optionalString,
  contractNumber: optionalString,
  contractAttachment: optionalString,
});

export const importProcurementSchema = z.object({
  receiverName: optionalString,
  supplier: optionalString,
  accessories: optionalString,
  warrantyUntil: z.string().datetime().optional().or(z.literal('')),
  acceptanceNote: optionalString,
  handoverDate: z.string().datetime().optional().or(z.literal('')),
}).default({});

export const createProcurementPlanSchema = z.object({
  title: nonEmptyString.max(500),
  period: nonEmptyString.max(100),
  planType: procurementTypeSchema.default('Đột xuất'),
  targetYear: targetYearSchema,
  sourceProcurements: z.array(mongoId).min(1).max(100),
  note: optionalString,
});

export const updateProcurementPlanSchema = z.object({
  status: procurementPlanStatusSchema,
});

const maintenanceItemSchema = z.object({
  equipmentCode: nonEmptyString,
  equipmentName: nonEmptyString,
  department: optionalString,
  content: nonEmptyString.max(2000),
  scheduledDate: optionalString,
  status: z.enum(['Chưa thực hiện', 'Đã thực hiện']).optional(),
  result: optionalString,
  performedBy: optionalString,
  note: optionalString,
});

export const createMaintenancePlanSchema = z.object({
  title: nonEmptyString.max(500),
  period: nonEmptyString.max(100),
  items: z.array(maintenanceItemSchema).min(1).max(500),
});

export const updateMaintenancePlanSchema = z.object({
  status: maintenancePlanStatusSchema,
});

const inventoryItemSchema = z.object({
  equipmentCode: nonEmptyString,
  equipmentName: nonEmptyString,
  department: nonEmptyString,
  actualStatus: equipmentStatusSchema,
  condition: z.coerce.number().min(0).max(100).optional(),
  note: optionalString,
  recommendation: z.enum(['Không', 'Sửa chữa', 'Thanh lý']).default('Không'),
});

export const createInventoryAuditSchema = z.object({
  title: nonEmptyString.max(500),
  period: nonEmptyString.max(100),
  department: optionalString,
  items: z.array(inventoryItemSchema).min(1).max(1000),
});

export const updateInventoryAuditSchema = z.object({
  status: z.enum(['Đang kiểm kê', 'Hoàn tất']),
});

export const createDisposalRequestSchema = z.object({
  equipmentCode: nonEmptyString,
  equipmentName: nonEmptyString,
  department: nonEmptyString,
  reason: nonEmptyString.max(3000),
  note: optionalString,
});

export const updateDisposalRequestSchema = z.object({
  status: z.enum(['TGĐ phê duyệt', 'Từ chối', 'Đã thanh lý']),
  note: optionalString,
});

export const loginSchema = z.object({
  username: nonEmptyString.max(100),
  password: nonEmptyString.max(200),
});
