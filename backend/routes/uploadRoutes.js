import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Chỉ cho phép tải lên ảnh hoặc PDF, dung lượng tối đa 5MB.'));
    }
    cb(null, true);
  },
});

// POST /api/upload
router.post('/', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.message });
    next();
  });
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được tải lên' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

export default router;
