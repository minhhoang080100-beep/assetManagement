import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import repairRoutes from './routes/repairRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import procurementPlanRoutes from './routes/procurementPlanRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ==========================================
// Validate required environment variables
// ==========================================
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not defined in .env file');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('❌ FATAL: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// ==========================================
// Middleware
// ==========================================
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Nguồn truy cập không được CORS cho phép'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/procurements', procurementRoutes);
app.use('/api/procurement-plans', procurementPlanRoutes);
app.use('/api/maintenance-plans', maintenanceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/auditlogs', auditRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Không tìm thấy API endpoint' });
});

// ==========================================
// Global Error Handler (phải đặt sau tất cả routes)
// ==========================================
app.use(errorHandler);

// ==========================================
// Database connection & Server start
// ==========================================
export const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

export default app;
