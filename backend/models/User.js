import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true, trim: true },
  role: { type: String, enum: ['ADMIN', 'MANAGER', 'USER', 'DIRECTOR'], default: 'USER' },
  department: { type: String, required: true, trim: true, index: true }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
