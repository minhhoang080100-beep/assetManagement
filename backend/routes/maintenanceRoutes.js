import { Router } from 'express';
import MaintenancePlan from '../models/MaintenancePlan.js';
import Equipment from '../models/Equipment.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.js';
import logAudit from '../helpers/logAudit.js';
import { validateBody } from '../middleware/validate.js';
import { createMaintenancePlanSchema, updateMaintenancePlanSchema } from '../helpers/schemas.js';
import { canAccessDepartment, departmentScopedQuery, forbid } from '../helpers/accessControl.js';

const router = Router();

const MAINTENANCE_TRANSITIONS = {
  ADMIN: {
    'Đang lập': ['Chờ duyệt'],
    'TGĐ phê duyệt': ['Đã thực hiện'],
  },
  DIRECTOR: {
    'Chờ duyệt': ['TGĐ phê duyệt', 'Từ chối'],
  },
  DEPUTY_DIRECTOR: {
    'Chờ duyệt': ['TGĐ phê duyệt', 'Từ chối'],
  },
};

function canTransition(role, from, to) {
  return MAINTENANCE_TRANSITIONS[role]?.[from]?.includes(to) || false;
}

// GET /api/maintenance-plans
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const plans = await MaintenancePlan.find(departmentScopedQuery(req.user)).sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

// POST /api/maintenance-plans
router.post('/', authMiddleware, authorizeRoles('ADMIN'), validateBody(createMaintenancePlanSchema), async (req, res, next) => {
  try {
    const plan = new MaintenancePlan({
      ...req.body,
      department: req.user.department,
      createdBy: req.user.username,
      items: req.body.items.map((item) => ({ ...item, department: item.department || req.user.department })),
      status: 'Đang lập',
    });
    await plan.save();
    await logAudit('TẠO MỚI', 'Kế hoạch bảo dưỡng', plan._id.toString(), req.user.username, `Lập kế hoạch bảo dưỡng: ${plan.title}`);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
});

// PUT /api/maintenance-plans/:id
router.put('/:id', authMiddleware, validateBody(updateMaintenancePlanSchema), async (req, res, next) => {
  try {
    const plan = await MaintenancePlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Không tìm thấy kế hoạch' });
    if (!canAccessDepartment(req.user, plan.department)) return forbid(res);
    if (!canTransition(req.user.role, plan.status, req.body.status)) {
      return forbid(res, `Không được chuyển trạng thái từ "${plan.status}" sang "${req.body.status}".`);
    }

    const wasCompleted = plan.status === 'Đã thực hiện';
    plan.status = req.body.status;

    if (req.user.role === 'ADMIN' && req.body.status === 'Chờ duyệt') {
      plan.dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }

    if (req.body.status === 'Đã thực hiện') {
      for (const item of plan.items) {
        item.status = 'Đã thực hiện';
        if (!item.result) item.result = 'Hoàn thành';
        if (!wasCompleted && item.equipmentCode) {
          await Equipment.findOneAndUpdate(
            { code: item.equipmentCode },
            { $push: { history: { date: new Date(), type: 'Bảo dưỡng', description: `${item.content}. Kết quả: ${item.result}. KH: ${plan.title}` } } }
          );
        }
      }
    }

    await plan.save();
    await logAudit('CẬP NHẬT', 'Kế hoạch bảo dưỡng', plan._id.toString(), req.user.username, `Cập nhật kế hoạch: ${plan.title}`);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/maintenance-plans/:id
router.delete('/:id', authMiddleware, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const result = await MaintenancePlan.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'Không tìm thấy kế hoạch' });
    await logAudit('XÓA', 'Kế hoạch bảo dưỡng', result._id.toString(), req.user.username, `Xóa kế hoạch: ${result.title}`);
    res.json({ message: 'Đã xóa kế hoạch thành công' });
  } catch (error) {
    next(error);
  }
});

export default router;
