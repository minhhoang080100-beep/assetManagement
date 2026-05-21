import jwt from 'jsonwebtoken';

/**
 * Middleware xác thực JWT Token.
 * Kiểm tra header Authorization: Bearer <token>
 * Nếu hợp lệ → gắn req.user, cho đi tiếp.
 * Nếu không → trả lỗi 401.
 */
const authMiddleware = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không có quyền truy cập. Vui lòng đăng nhập.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, department }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    return res.status(401).json({ message: 'Token không hợp lệ.' });
  }
};

/**
 * Middleware phân quyền (RBAC).
 * Kiểm tra xem req.user.role có nằm trong danh sách roles cho phép không.
 * Yêu cầu: Phải dùng sau authMiddleware.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Lỗi 403: Bạn không có quyền thực hiện thao tác này.' });
    }
    next();
  };
};

export { authMiddleware, authorizeRoles };
export default authMiddleware;
