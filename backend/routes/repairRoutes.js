import { Router } from 'express';
import RepairRequest from '../models/RepairRequest.js';
import Equipment from '../models/Equipment.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.js';
import logAudit from '../helpers/logAudit.js';
import { validateBody } from '../middleware/validate.js';
import { createRepairSchema, updateRepairSchema } from '../helpers/schemas.js';
import { canAccessDepartment, departmentScopedQuery, forbid } from '../helpers/accessControl.js';
import { generateSequentialCode } from '../helpers/codeGenerator.js';

const router = Router();

const REPAIR_TRANSITIONS = {
  ADMIN: {
    'Chờ duyệt': ['Đã tiếp nhận'],
    'TGĐ phê duyệt': ['Đang sửa chữa'],
    'Đang sửa chữa': ['Đã hoàn thành'],
  },
  DIRECTOR: {
    'Đã tiếp nhận': ['TGĐ phê duyệt', 'Từ chối'],
  },
  DEPUTY_DIRECTOR: {
    'Đã tiếp nhận': ['TGĐ phê duyệt', 'Từ chối'],
  },
};

function canTransition(role, from, to) {
  return REPAIR_TRANSITIONS[role]?.[from]?.includes(to) || false;
}

// GET /api/repairs
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const repairs = await RepairRequest.find(departmentScopedQuery(req.user)).sort({ createdAt: -1 });
    res.json(repairs);
  } catch (error) {
    next(error);
  }
});

// POST /api/repairs
router.post('/', authMiddleware, validateBody(createRepairSchema), async (req, res, next) => {
  try {
    const year = String(new Date().getFullYear()).slice(-2);
    const reqCode = await generateSequentialCode({
      key: 'repair',
      prefix: `SC-${year}`,
      model: RepairRequest,
      field: 'reqCode',
    });

    const repair = new RepairRequest({
      ...req.body,
      reqCode,
      department: req.user.department,
      requestedBy: req.user.username,
      status: 'Chờ duyệt',
    });
    await repair.save();
    await logAudit('TẠO MỚI', 'Phiếu sửa chữa', repair.reqCode, req.user.username, `Tạo phiếu báo hỏng thiết bị: ${repair.equipmentCode}`);
    res.status(201).json(repair);
  } catch (error) {
    next(error);
  }
});

// PUT /api/repairs/:id
router.put('/:id', authMiddleware, validateBody(updateRepairSchema), async (req, res, next) => {
  try {
    const existing = await RepairRequest.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy phiếu' });
    if (!canAccessDepartment(req.user, existing.department)) return forbid(res);
    if (!canTransition(req.user.role, existing.status, req.body.status)) {
      return forbid(res, `Không được chuyển trạng thái từ "${existing.status}" sang "${req.body.status}".`);
    }

    const update = { status: req.body.status };
    if (req.body.status === 'Đã tiếp nhận') {
      update.hcthAssessment = req.body.hcthAssessment || 'Đúng thực tế';
      update.hcthAssessmentNote = req.body.hcthAssessmentNote;
      update.hcthProposal = req.body.hcthProposal || existing.hcthProposal;
      update.assessedBy = req.user.username;
      update.assessedDate = new Date();
      update.dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    }
    if (req.body.status === 'Đã hoàn thành') {
      update.solution = req.body.solution || existing.solution;
      update.cost = req.body.cost ?? existing.cost;
      update.performedBy = req.body.performedBy || existing.performedBy;
      update.completedDate = req.body.completedDate || new Date();
    }

    const repair = await RepairRequest.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });
    if (!repair) return res.status(404).json({ message: 'Không tìm thấy phiếu' });

    if (req.body.status === 'Đang sửa chữa' && repair.equipmentCode) {
      await Equipment.findOneAndUpdate({ code: repair.equipmentCode }, { status: 'Đang sửa chữa' });
    }

    if (req.body.status === 'Đã hoàn thành' && repair.equipmentCode) {
      const costText = repair.cost ? ` Chi phí: ${repair.cost.toLocaleString('vi-VN')} VNĐ.` : '';
      await Equipment.findOneAndUpdate(
        { code: repair.equipmentCode },
        { 
          status: 'Tốt',
          $push: { 
            history: {
              date: new Date().toISOString(),
              type: 'Sửa chữa',
              description: `Khắc phục sự cố: ${repair.issue}. Giải pháp: ${repair.solution || 'Đã sửa chữa xong'}.${costText} Mã phiếu: ${repair.reqCode}`
            } 
          }
        }
      );
    }

    await logAudit('CẬP NHẬT', 'Phiếu sửa chữa', repair.reqCode, req.user.username, `Cập nhật trạng thái phiếu sửa chữa: ${repair.status}`);
    res.json(repair);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/repairs/:id
router.delete('/:id', authMiddleware, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const result = await RepairRequest.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'Không tìm thấy phiếu sửa chữa' });
    await logAudit('XÓA', 'Phiếu sửa chữa', result.reqCode, req.user.username, `Xóa phiếu báo hỏng của thiết bị: ${result.equipmentCode}`);
    res.json({ message: 'Đã xóa phiếu sửa chữa thành công' });
  } catch (error) {
    next(error);
  }
});

export default router;
