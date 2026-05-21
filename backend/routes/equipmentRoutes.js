import { Router } from 'express';
import Equipment from '../models/Equipment.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.js';
import logAudit from '../helpers/logAudit.js';
import { validateBody } from '../middleware/validate.js';
import {
  bulkEquipmentSchema,
  createEquipmentSchema,
  equipmentMaintenanceSchema,
  updateEquipmentSchema,
} from '../helpers/schemas.js';
import { canAccessDepartment, departmentScopedQuery, forbid } from '../helpers/accessControl.js';
import { getDepartmentPrefix } from '../helpers/constants.js';
import { generateSequentialCode } from '../helpers/codeGenerator.js';

const router = Router();

// GET /api/equipments
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const equipments = await Equipment.find(departmentScopedQuery(req.user)).sort({ createdAt: -1 });
    res.json(equipments);
  } catch (error) {
    next(error);
  }
});

// GET /api/equipments/:code
router.get('/:code', authMiddleware, async (req, res, next) => {
  try {
    const equipment = await Equipment.findOne({ code: req.params.code });
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    if (!canAccessDepartment(req.user, equipment.department)) return forbid(res);
    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

// POST /api/equipments
router.post('/', authMiddleware, authorizeRoles('ADMIN'), validateBody(createEquipmentSchema), async (req, res, next) => {
  try {
    const { typeCode = 'TB', ...payload } = req.body;
    const purchaseYear = payload.purchaseYear || new Date().getFullYear();
    const year = String(purchaseYear).slice(-2);
    const code = payload.code || await generateSequentialCode({
      key: 'equipment',
      prefix: `${getDepartmentPrefix(payload.department)}-${typeCode}.${year}`,
      model: Equipment,
    });

    const equipment = new Equipment({
      ...payload,
      code,
      purchaseYear,
      status: payload.status || 'Tốt',
      condition: payload.condition ?? 100,
    });
    await equipment.save();
    await logAudit('TẠO MỚI', 'Thiết bị', equipment.code, req.user.username, `Tạo tài sản: ${equipment.name}`);
    res.status(201).json(equipment);
  } catch (error) {
    next(error);
  }
});

// POST /api/equipments/bulk
router.post('/bulk', authMiddleware, authorizeRoles('ADMIN'), validateBody(bulkEquipmentSchema), async (req, res, next) => {
  try {
    const items = req.body;

    const inserted = await Equipment.insertMany(items, { ordered: false });
    await logAudit('NHẬP KHO', 'Thiết bị', 'N/A', req.user.username, `Nhập hàng loạt ${inserted.length} thiết bị từ Excel`);
    res.status(201).json({ message: `Đã nhập thành công ${inserted.length} thiết bị`, count: inserted.length });
  } catch (error) {
    // If ordered: false, it will insert what it can and throw error for duplicates
    if (error.code === 11000) {
       return res.status(201).json({ 
         message: `Đã nhập thành công một số thiết bị, bỏ qua các mã trùng lặp.`,
         details: error.writeErrors?.length || 'N/A'
       });
    }
    next(error);
  }
});

// DELETE /api/equipments/:code
router.delete('/:code', authMiddleware, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const result = await Equipment.findOneAndDelete({ code: req.params.code });
    if (!result) return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
    await logAudit('XÓA', 'Thiết bị', req.params.code, req.user.username, `Xóa tài sản: ${result.name}`);
    res.json({ message: 'Đã xóa thành công' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/equipments/:code
router.put('/:code', authMiddleware, authorizeRoles('ADMIN'), validateBody(updateEquipmentSchema), async (req, res, next) => {
  try {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu cập nhật' });
    }
    const equipment = await Equipment.findOneAndUpdate(
      { code: req.params.code },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!equipment) return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
    await logAudit('CẬP NHẬT', 'Thiết bị', req.params.code, req.user.username, `Cập nhật thông tin tài sản: ${equipment.name}`);
    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

// POST /api/equipments/:code/maintenance — Ghi nhận bảo dưỡng (BM.05.06)
router.post('/:code/maintenance', authMiddleware, authorizeRoles('ADMIN'), validateBody(equipmentMaintenanceSchema), async (req, res, next) => {
  try {
    const { type, description } = req.body;
    const equipment = await Equipment.findOneAndUpdate(
      { code: req.params.code },
      { $push: { history: { date: new Date(), type: type || 'Bảo dưỡng', description } } },
      { returnDocument: 'after' }
    );
    if (!equipment) return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
    await logAudit('BẢO DƯỠNG', 'Thiết bị', req.params.code, req.user.username, `Ghi nhận bảo dưỡng: ${description}`);
    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

export default router;
