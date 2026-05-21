import { isZodError } from './validate.js';

/**
 * Global Error Handler Middleware.
 * Đặt cuối pipeline Express, sau tất cả routes.
 * Bắt mọi lỗi được throw hoặc next(err) từ routes.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  if (isZodError(err)) {
    return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ' });
  }

  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {}).join(', ');
    return res.status(409).json({ message: `Dữ liệu bị trùng${fields ? `: ${fields}` : ''}` });
  }

  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || 'Lỗi máy chủ nội bộ',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export default errorHandler;
