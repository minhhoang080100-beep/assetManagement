import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../helpers/schemas.js';

const router = Router();

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    // So sánh mật khẩu đã hash bằng bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
