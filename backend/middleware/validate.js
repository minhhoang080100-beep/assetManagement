import { ZodError } from 'zod';

const formatZodError = (error) => {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
};

export const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dữ liệu gửi lên không hợp lệ',
      errors: formatZodError(parsed.error),
    });
  }
  req.body = parsed.data;
  next();
};

export const isZodError = (error) => error instanceof ZodError;
