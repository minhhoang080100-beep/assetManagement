import { Router } from 'express';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// GET /api/auditlogs
router.get('/', authMiddleware, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(500);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
