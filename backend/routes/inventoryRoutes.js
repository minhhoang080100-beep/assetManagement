import { Router } from 'express';
import InventoryAudit from '../models/InventoryAudit.js';
import DisposalRequest from '../models/DisposalRequest.js';
import Equipment from '../models/Equipment.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createDisposalRequestSchema, createInventoryAuditSchema, updateDisposalRequestSchema, updateInventoryAuditSchema } from '../helpers/schemas.js';
import { departmentScopedQuery, isApprover } from '../helpers/accessControl.js';
import logAudit from '../helpers/logAudit.js';

const router = Router();

router.get('/audits', authMiddleware, async (req, res, next) => {
  try {
    const audits = await InventoryAudit.find(departmentScopedQuery(req.user)).sort({ createdAt: -1 });
    res.json(audits);
  } catch (error) {
    next(error);
  }
});

router.post('/audits', authMiddleware, authorizeRoles('ADMIN'), validateBody(createInventoryAuditSchema), async (req, res, next) => {
  try {
    const audit = await InventoryAudit.create({
      ...req.body,
      department: req.body.department || req.user.department,
      createdBy: req.user.username,
      status: 'Đang kiểm kê',
    });
    await logAudit('TẠO MỚI', 'Biên bản kiểm kê', audit._id.toString(), req.user.username, `Lập kiểm kê: ${audit.title}`);
    res.status(201).json(audit);
  } catch (error) {
    next(error);
  }
});

router.put('/audits/:id', authMiddleware, authorizeRoles('ADMIN'), validateBody(updateInventoryAuditSchema), async (req, res, next) => {
  try {
    const audit = await InventoryAudit.findById(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Không tìm thấy kiểm kê' });
    if (audit.status === 'Hoàn tất') {
      return res.status(400).json({ message: 'Biên bản kiểm kê đã hoàn tất, không thể cập nhật lặp lại.' });
    }
    audit.status = req.body.status;
    if (req.body.status === 'Hoàn tất') {
      audit.completedDate = new Date();
      for (const item of audit.items) {
        await Equipment.findOneAndUpdate(
          { code: item.equipmentCode },
          {
            status: item.actualStatus,
            condition: item.condition,
            $push: {
              history: {
                date: new Date(),
                type: 'Kiểm kê',
                description: `Kiểm kê ${audit.period}: ${item.note || item.actualStatus}. Khuyến nghị: ${item.recommendation}`,
              },
            },
          }
        );
      }
    }
    await audit.save();
    await logAudit('CẬP NHẬT', 'Biên bản kiểm kê', audit._id.toString(), req.user.username, `Cập nhật kiểm kê: ${audit.status}`);
    res.json(audit);
  } catch (error) {
    next(error);
  }
});

router.get('/disposals', authMiddleware, async (req, res, next) => {
  try {
    const disposals = await DisposalRequest.find(departmentScopedQuery(req.user)).sort({ createdAt: -1 });
    res.json(disposals);
  } catch (error) {
    next(error);
  }
});

router.post('/disposals', authMiddleware, authorizeRoles('ADMIN'), validateBody(createDisposalRequestSchema), async (req, res, next) => {
  try {
    const disposal = await DisposalRequest.create({
      ...req.body,
      requestedBy: req.user.username,
      status: 'Chờ duyệt',
    });
    await logAudit('TẠO MỚI', 'Hồ sơ thanh lý', disposal.equipmentCode, req.user.username, `Lập đề nghị thanh lý: ${disposal.equipmentName}`);
    res.status(201).json(disposal);
  } catch (error) {
    next(error);
  }
});

router.put('/disposals/:id', authMiddleware, authorizeRoles('ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'), validateBody(updateDisposalRequestSchema), async (req, res, next) => {
  try {
    const disposal = await DisposalRequest.findById(req.params.id);
    if (!disposal) return res.status(404).json({ message: 'Không tìm thấy hồ sơ thanh lý' });
    if (isApprover(req.user) && disposal.status !== 'Chờ duyệt') {
      return res.status(400).json({ message: 'Hồ sơ này không còn ở trạng thái chờ duyệt.' });
    }
    if (isApprover(req.user) && !['TGĐ phê duyệt', 'Từ chối'].includes(req.body.status)) {
      return res.status(403).json({ message: 'Lãnh đạo chỉ được phê duyệt hoặc từ chối.' });
    }
    if (req.user.role === 'ADMIN' && req.body.status !== 'Đã thanh lý') {
      return res.status(403).json({ message: 'HCTH chỉ được xác nhận đã thanh lý.' });
    }
    if (req.body.status === 'Đã thanh lý' && disposal.status !== 'TGĐ phê duyệt') {
      return res.status(400).json({ message: 'Hồ sơ chưa được TGĐ phê duyệt.' });
    }

    disposal.status = req.body.status;
    disposal.note = req.body.note || disposal.note;
    if (isApprover(req.user)) {
      disposal.approvedBy = req.user.username;
      disposal.approvedDate = new Date();
    }
    if (req.body.status === 'Đã thanh lý') {
      disposal.completedBy = req.user.username;
      disposal.completedDate = new Date();
      await Equipment.findOneAndUpdate(
        { code: disposal.equipmentCode },
        {
          status: 'Thanh lý',
          $push: { history: { date: new Date(), type: 'Thanh lý', description: `Thanh lý theo hồ sơ: ${disposal.reason}` } },
        }
      );
    }
    await disposal.save();
    await logAudit('CẬP NHẬT', 'Hồ sơ thanh lý', disposal.equipmentCode, req.user.username, `Cập nhật thanh lý: ${disposal.status}`);
    res.json(disposal);
  } catch (error) {
    next(error);
  }
});

export default router;
