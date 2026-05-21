import { Router } from 'express';
import ProcurementPlan from '../models/ProcurementPlan.js';
import ProcurementRequest from '../models/ProcurementRequest.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createProcurementPlanSchema, updateProcurementPlanSchema } from '../helpers/schemas.js';
import logAudit from '../helpers/logAudit.js';

const router = Router();

const PLAN_TRANSITIONS = {
  ADMIN: {
    'Đang lập': ['Chờ duyệt'],
  },
  DIRECTOR: {
    'Chờ duyệt': ['TGĐ phê duyệt', 'Từ chối'],
  },
};

function canTransition(role, from, to) {
  return PLAN_TRANSITIONS[role]?.[from]?.includes(to) || false;
}

router.get('/', authMiddleware, authorizeRoles('ADMIN', 'DIRECTOR'), async (req, res, next) => {
  try {
    const plans = await ProcurementPlan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, authorizeRoles('ADMIN'), validateBody(createProcurementPlanSchema), async (req, res, next) => {
  try {
    const requests = await ProcurementRequest.find({ _id: { $in: req.body.sourceProcurements } });
    if (requests.length !== req.body.sourceProcurements.length) {
      return res.status(400).json({ message: 'Một số phiếu đề nghị không tồn tại.' });
    }
    const invalidRequests = requests.filter((request) => request.status !== 'Đã lập kế hoạch');
    if (invalidRequests.length > 0) {
      return res.status(400).json({ message: 'Chỉ được tổng hợp các phiếu đã được HCTH thẩm định và lập kế hoạch.' });
    }

    const items = requests.flatMap((request) => request.items.map((item) => ({
      sourceProcurementId: request._id,
      name: item.name,
      quantity: item.quantity,
      specs: '',
      department: request.department,
      estimatedPrice: item.estimatedPrice,
    })));

    const totalEstimatedCost = items.reduce((sum, item) => sum + item.quantity * item.estimatedPrice, 0);
    const plan = await ProcurementPlan.create({
      title: req.body.title,
      period: req.body.period,
      sourceProcurements: req.body.sourceProcurements,
      items,
      totalEstimatedCost,
      note: req.body.note,
      createdBy: req.user.username,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'Đang lập',
    });

    await logAudit('TẠO MỚI', 'Kế hoạch mua sắm', plan._id.toString(), req.user.username, `Lập kế hoạch mua sắm: ${plan.title}`);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authMiddleware, authorizeRoles('ADMIN', 'DIRECTOR'), validateBody(updateProcurementPlanSchema), async (req, res, next) => {
  try {
    const plan = await ProcurementPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Không tìm thấy kế hoạch mua sắm' });
    if (!canTransition(req.user.role, plan.status, req.body.status)) {
      return res.status(403).json({ message: `Không được chuyển trạng thái từ "${plan.status}" sang "${req.body.status}".` });
    }

    plan.status = req.body.status;
    if (req.user.role === 'DIRECTOR' && req.body.status === 'TGĐ phê duyệt') {
      plan.approvedBy = req.user.username;
      plan.approvedDate = new Date();
      await ProcurementRequest.updateMany(
        { _id: { $in: plan.sourceProcurements }, status: 'Đã lập kế hoạch' },
        { status: 'TGĐ phê duyệt', approvedBy: req.user.username, approvedDate: new Date() }
      );
    }
    if (req.user.role === 'DIRECTOR' && req.body.status === 'Từ chối') {
      await ProcurementRequest.updateMany(
        { _id: { $in: plan.sourceProcurements }, status: 'Đã lập kế hoạch' },
        { status: 'Từ chối', approvedBy: req.user.username, approvedDate: new Date() }
      );
    }
    await plan.save();

    await logAudit('CẬP NHẬT', 'Kế hoạch mua sắm', plan._id.toString(), req.user.username, `Cập nhật kế hoạch mua sắm: ${plan.status}`);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const result = await ProcurementPlan.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'Không tìm thấy kế hoạch mua sắm' });
    await logAudit('XÓA', 'Kế hoạch mua sắm', result._id.toString(), req.user.username, `Xóa kế hoạch mua sắm: ${result.title}`);
    res.json({ message: 'Đã xóa kế hoạch mua sắm' });
  } catch (error) {
    next(error);
  }
});

export default router;
