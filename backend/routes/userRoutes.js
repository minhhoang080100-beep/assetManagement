import { Router } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createUserSchema, resetUserPasswordSchema, updateUserSchema } from '../helpers/schemas.js';
import logAudit from '../helpers/logAudit.js';

const router = Router();
const SALT_ROUNDS = 10;

function publicUserQuery() {
  return User.find().select('-password').sort({ role: 1, department: 1, username: 1 });
}

async function wouldRemoveLastActiveAdmin(user, nextRole, nextIsActive) {
  const remainsAdmin = (nextRole || user.role) === 'ADMIN';
  const remainsActive = nextIsActive ?? user.isActive ?? true;
  if (remainsAdmin && remainsActive) return false;

  if (user.role !== 'ADMIN' || user.isActive === false) return false;
  const activeAdminCount = await User.countDocuments({ role: 'ADMIN', isActive: { $ne: false } });
  return activeAdminCount <= 1;
}

function isSelf(req, user) {
  return String(req.user.id) === String(user._id);
}

router.get('/', authMiddleware, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const users = await publicUserQuery();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, authorizeRoles('ADMIN'), validateBody(createUserSchema), async (req, res, next) => {
  try {
    const username = req.body.username.toLowerCase();
    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });

    const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    const user = await User.create({
      username,
      password: passwordHash,
      fullName: req.body.fullName,
      role: req.body.role,
      department: req.body.department,
      isActive: req.body.isActive ?? true,
    });

    await logAudit('TẠO MỚI', 'Tài khoản', user.username, req.user.username, `Tạo tài khoản ${user.username} (${user.role})`);
    const created = await User.findById(user._id).select('-password');
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authMiddleware, authorizeRoles('ADMIN'), validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

    if (isSelf(req, user) && req.body.isActive === false) {
      return res.status(400).json({ message: 'Không được tự khóa tài khoản đang đăng nhập.' });
    }
    if (isSelf(req, user) && req.body.role && req.body.role !== 'ADMIN') {
      return res.status(400).json({ message: 'Không được tự hạ quyền ADMIN của tài khoản đang đăng nhập.' });
    }
    if (await wouldRemoveLastActiveAdmin(user, req.body.role, req.body.isActive)) {
      return res.status(400).json({ message: 'Phải giữ lại ít nhất một tài khoản ADMIN đang hoạt động.' });
    }

    if (req.body.fullName !== undefined) user.fullName = req.body.fullName;
    if (req.body.role !== undefined) user.role = req.body.role;
    if (req.body.department !== undefined) user.department = req.body.department;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    await user.save();

    await logAudit('CẬP NHẬT', 'Tài khoản', user.username, req.user.username, `Cập nhật tài khoản ${user.username}`);
    const updated = await User.findById(user._id).select('-password');
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/password', authMiddleware, authorizeRoles('ADMIN'), validateBody(resetUserPasswordSchema), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

    user.password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    await user.save();

    await logAudit('CẬP NHẬT', 'Tài khoản', user.username, req.user.username, `Đặt lại mật khẩu tài khoản ${user.username}`);
    res.json({ message: 'Đã đặt lại mật khẩu.' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    if (isSelf(req, user)) {
      return res.status(400).json({ message: 'Không được tự xóa tài khoản đang đăng nhập.' });
    }
    if (await wouldRemoveLastActiveAdmin(user, undefined, false)) {
      return res.status(400).json({ message: 'Phải giữ lại ít nhất một tài khoản ADMIN đang hoạt động.' });
    }

    await User.deleteOne({ _id: user._id });
    await logAudit('XÓA', 'Tài khoản', user.username, req.user.username, `Xóa tài khoản ${user.username}`);
    res.json({ message: 'Đã xóa tài khoản.' });
  } catch (error) {
    next(error);
  }
});

export default router;
