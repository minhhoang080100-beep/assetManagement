import { Router } from 'express';
import ProcurementRequest from '../models/ProcurementRequest.js';
import Equipment from '../models/Equipment.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.js';
import logAudit from '../helpers/logAudit.js';
import { validateBody } from '../middleware/validate.js';
import { createProcurementSchema, importProcurementSchema, updateProcurementSchema } from '../helpers/schemas.js';
import { canAccessDepartment, departmentScopedQuery, forbid } from '../helpers/accessControl.js';
import { generateSequentialCode } from '../helpers/codeGenerator.js';
import { getAnnualProcurementDeadlines, isAnnualProcurement, normalizeProcurementYear } from '../helpers/procurementTimeline.js';

const router = Router();

const PROCUREMENT_TRANSITIONS = {
  ADMIN: {
    'Chờ duyệt': ['Đã lập kế hoạch'],
    'TGĐ phê duyệt': ['Đang thực hiện'],
    'Đang thực hiện': ['Hoàn tất'],
  },
  DIRECTOR: {
    'Đã lập kế hoạch': ['TGĐ phê duyệt', 'Từ chối'],
  },
  DEPUTY_DIRECTOR: {
    'Đã lập kế hoạch': ['TGĐ phê duyệt', 'Từ chối'],
  },
};

function canTransition(role, from, to) {
  return PROCUREMENT_TRANSITIONS[role]?.[from]?.includes(to) || false;
}

// GET /api/procurements
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const procurements = await ProcurementRequest.find(departmentScopedQuery(req.user)).sort({ createdAt: -1 });
    res.json(procurements);
  } catch (error) {
    next(error);
  }
});

// POST /api/procurements
router.post('/', authMiddleware, validateBody(createProcurementSchema), async (req, res, next) => {
  try {
    const procurementType = req.body.procurementType || 'Đột xuất';
    const targetYear = normalizeProcurementYear(req.body.targetYear);
    const annualDeadlines = getAnnualProcurementDeadlines(targetYear);
    const procurement = new ProcurementRequest({
      ...req.body,
      procurementType,
      targetYear,
      submissionDeadline: isAnnualProcurement(procurementType) ? annualDeadlines.requestDeadline : undefined,
      department: req.user.department,
      requestedBy: req.user.username,
      status: 'Chờ duyệt',
    });
    await procurement.save();
    await logAudit('TẠO MỚI', 'Phiếu mua sắm', procurement._id.toString(), req.user.username, `Lập phiếu mua sắm mới: ${procurement.title}`);
    res.status(201).json(procurement);
  } catch (error) {
    next(error);
  }
});

// PUT /api/procurements/:id
router.put('/:id', authMiddleware, validateBody(updateProcurementSchema), async (req, res, next) => {
  try {
    const existing = await ProcurementRequest.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy phiếu' });
    if (!canAccessDepartment(req.user, existing.department)) return forbid(res);
    if (!canTransition(req.user.role, existing.status, req.body.status)) {
      return forbid(res, `Không được chuyển trạng thái từ "${existing.status}" sang "${req.body.status}".`);
    }

    const update = { status: req.body.status };
    if (req.user.role === 'ADMIN' && req.body.status === 'Đã lập kế hoạch') {
      const totalQuotes = req.body.quotations?.length || 0;
      if (existing.estimatedCost < 20000000 && totalQuotes < 3) {
        return res.status(400).json({ message: 'Phiếu dưới 20 triệu cần tối thiểu 03 báo giá theo SOP.' });
      }
      if (existing.estimatedCost >= 20000000 && !req.body.contractAttachment && !req.body.contractNumber) {
        return res.status(400).json({ message: 'Phiếu từ 20 triệu trở lên cần thông tin hợp đồng hoặc file hợp đồng.' });
      }
      update.hcthOpinion = req.body.hcthOpinion;
      update.quotations = req.body.quotations || [];
      update.selectedSupplier = req.body.selectedSupplier;
      update.contractNumber = req.body.contractNumber;
      update.contractAttachment = req.body.contractAttachment;
      update.requiresContract = existing.estimatedCost >= 20000000;
      update.reviewedBy = req.user.username;
      update.reviewedDate = new Date();
      update.dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }
    if (['DIRECTOR', 'DEPUTY_DIRECTOR'].includes(req.user.role) && req.body.status === 'TGĐ phê duyệt') {
      update.approvedBy = req.user.username;
      update.approvedDate = new Date();
    }

    const procurement = await ProcurementRequest.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });
    if (!procurement) return res.status(404).json({ message: 'Không tìm thấy phiếu' });
    await logAudit('CẬP NHẬT', 'Phiếu mua sắm', procurement._id.toString(), req.user.username, `Cập nhật trạng thái phiếu mua sắm: ${procurement.status}`);
    res.json(procurement);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/procurements/:id
router.delete('/:id', authMiddleware, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const result = await ProcurementRequest.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'Không tìm thấy phiếu mua sắm' });
    await logAudit('XÓA', 'Phiếu mua sắm', result._id.toString(), req.user.username, `Xóa phiếu mua sắm: ${result.title}`);
    res.json({ message: 'Đã xóa phiếu mua sắm thành công' });
  } catch (error) {
    next(error);
  }
});

// POST /api/procurements/:id/import — Nghiệm thu, bàn giao và nhập kho từ phiếu hoàn tất
router.post('/:id/import', authMiddleware, authorizeRoles('ADMIN'), validateBody(importProcurementSchema), async (req, res, next) => {
  try {
    const proc = await ProcurementRequest.findById(req.params.id);
    if (!proc) return res.status(404).json({ message: 'Không tìm thấy phiếu' });
    if (proc.status !== 'Hoàn tất') return res.status(400).json({ message: 'Phiếu chưa hoàn tất' });

    let importedCount = 0;
    const handoverDate = req.body.handoverDate ? new Date(req.body.handoverDate) : new Date();
    const warrantyUntil = req.body.warrantyUntil ? new Date(req.body.warrantyUntil) : undefined;
    const supplier = req.body.supplier || proc.selectedSupplier || '';
    const receiverName = req.body.receiverName || proc.requesterName || proc.department;
    const accessories = req.body.accessories || '';
    const acceptanceNote = req.body.acceptanceNote || 'Đã nghiệm thu, bàn giao và hướng dẫn sử dụng theo BM.HCTH.05.03.';

    for (const item of proc.items) {
      for (let i = 0; i < item.quantity; i++) {
        const code = await generateSequentialCode({
          key: 'equipment',
          prefix: 'TB-MUA',
          model: Equipment,
        });

        const newEq = new Equipment({
          code,
          name: item.name,
          specs: item.specs || `Theo phiếu ĐNMS ${proc._id.toString().slice(-6)}`,
          department: proc.department,
          status: 'Tốt',
          condition: 100,
          purchaseYear: new Date().getFullYear(),
          history: [{
            date: handoverDate,
            type: 'Nghiệm thu mới',
            description: [
              `Nghiệm thu, bàn giao từ phiếu mua sắm ${proc.title}.`,
              supplier ? `Nhà cung cấp: ${supplier}.` : '',
              receiverName ? `Người/đơn vị nhận: ${receiverName}.` : '',
              accessories ? `Phụ kiện kèm theo: ${accessories}.` : '',
              warrantyUntil ? `Bảo hành đến: ${warrantyUntil.toLocaleDateString('vi-VN')}.` : '',
              acceptanceNote,
            ].filter(Boolean).join(' ')
          }]
        });
        await newEq.save();
        importedCount++;
      }
    }

    proc.status = 'Đã nhập kho';
    proc.handover = {
      receiverName,
      supplier,
      accessories,
      warrantyUntil,
      acceptanceNote,
      handoverDate,
      createdBy: req.user.username,
      createdAt: new Date(),
    };
    await proc.save();
    await logAudit('NHẬP KHO', 'Phiếu mua sắm', proc._id.toString(), req.user.username, `Nhập kho thành công ${importedCount} thiết bị từ phiếu mua sắm: ${proc.title}`);

    res.json({ message: `Đã nhập kho thành công ${importedCount} thiết bị!` });
  } catch (error) {
    next(error);
  }
});

export default router;
