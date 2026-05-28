export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'DIRECTOR' | 'DEPUTY_DIRECTOR';
export type ProcurementType = 'Định kỳ' | 'Đột xuất';

export interface AuthUser {
  username: string;
  fullName: string;
  role: UserRole;
  department: string;
}

export interface UploadResponse {
  url: string;
}

export interface EquipmentHistoryEvent {
  _id?: string;
  date: string;
  type: 'Bảo dưỡng' | 'Sửa chữa' | 'Thay thế linh kiện' | 'Nghiệm thu mới' | 'Nhập kho' | 'Kiểm kê' | 'Thanh lý';
  description: string;
}

export interface Equipment {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  specs?: string;
  department: string;
  status: 'Tốt' | 'Đang sửa chữa' | 'Kém phẩm chất' | 'Thanh lý';
  condition?: number;
  purchaseYear?: number;
  price?: number;
  images?: string[];
  history?: EquipmentHistoryEvent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Repair {
  _id: string;
  reqCode: string;
  equipmentCode: string;
  equipmentName: string;
  department: string;
  issue: string;
  requestType: 'Sửa chữa' | 'Thay thế linh kiện';
  status: 'Chờ duyệt' | 'Đã tiếp nhận' | 'TGĐ phê duyệt' | 'Từ chối' | 'Đang sửa chữa' | 'Đã hoàn thành';
  requestedDate: string;
  requestedBy: string;
  requesterName?: string;
  hcthAssessment?: 'Đúng thực tế' | 'Khác';
  hcthAssessmentNote?: string;
  hcthProposal?: string;
  assessedBy?: string;
  assessedDate?: string;
  dueDate?: string;
  solution?: string;
  cost?: number;
  performedBy?: string;
  completedDate?: string;
  attachment?: string;
}

export interface ProcurementItem {
  name: string;
  unit?: string;
  quantity: number;
  specs?: string;
  estimatedPrice: number;
}

export interface ProcurementHandover {
  receiverName?: string;
  supplier?: string;
  accessories?: string;
  warrantyUntil?: string;
  acceptanceNote?: string;
  handoverDate?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface Procurement {
  _id: string;
  title: string;
  department: string;
  reason: string;
  estimatedCost: number;
  items: ProcurementItem[];
  procurementType?: ProcurementType;
  targetYear?: number;
  submissionDeadline?: string;
  status: 'Chờ duyệt' | 'Đã lập kế hoạch' | 'TGĐ phê duyệt' | 'Từ chối' | 'Đang thực hiện' | 'Hoàn tất' | 'Đã nhập kho';
  requestedDate: string;
  requestedBy?: string;
  requesterName?: string;
  hcthOpinion?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  quotations?: Quotation[];
  selectedSupplier?: string;
  contractNumber?: string;
  contractAttachment?: string;
  requiresContract?: boolean;
  dueDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  attachment?: string;
  handover?: ProcurementHandover;
}

export interface Quotation {
  supplier: string;
  price: number;
  attachment?: string;
  note?: string;
}

export interface ProcurementPlan {
  _id: string;
  title: string;
  period: string;
  planType?: ProcurementType;
  targetYear?: number;
  planningDeadline?: string;
  createdBy?: string;
  sourceProcurements: string[];
  items: Array<{
    sourceProcurementId?: string;
    name: string;
    unit?: string;
    quantity: number;
    specs?: string;
    department: string;
    estimatedPrice: number;
  }>;
  totalEstimatedCost: number;
  note?: string;
  dueDate?: string;
  status: 'Đang lập' | 'Chờ duyệt' | 'TGĐ phê duyệt' | 'Từ chối';
  approvedBy?: string;
  approvedDate?: string;
  createdAt: string;
}

export interface MaintenanceItem {
  equipmentCode: string;
  equipmentName: string;
  department?: string;
  content: string;
  scheduledDate?: string;
  status?: 'Chưa thực hiện' | 'Đã thực hiện';
  result?: string;
  performedBy?: string;
  note?: string;
}

export interface MaintenancePlan {
  _id: string;
  title: string;
  period: string;
  department: string;
  createdBy: string;
  items: MaintenanceItem[];
  dueDate?: string;
  status: 'Đang lập' | 'Chờ duyệt' | 'TGĐ phê duyệt' | 'Từ chối' | 'Đã thực hiện';
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  user: string;
  details?: string;
  createdAt: string;
}

export interface InventoryAudit {
  _id: string;
  title: string;
  period: string;
  department?: string;
  createdBy?: string;
  items: InventoryItem[];
  status: 'Đang kiểm kê' | 'Hoàn tất';
  completedDate?: string;
  createdAt: string;
}

export interface InventoryItem {
  equipmentCode: string;
  equipmentName: string;
  department: string;
  actualStatus: Equipment['status'];
  condition?: number;
  note?: string;
  recommendation: 'Không' | 'Sửa chữa' | 'Thanh lý';
}

export interface DisposalRequest {
  _id: string;
  equipmentCode: string;
  equipmentName: string;
  department: string;
  reason: string;
  requestedBy?: string;
  requestedDate: string;
  status: 'Chờ duyệt' | 'TGĐ phê duyệt' | 'Từ chối' | 'Đã thanh lý';
  approvedBy?: string;
  approvedDate?: string;
  completedBy?: string;
  completedDate?: string;
  note?: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  link: string;
}
