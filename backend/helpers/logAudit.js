import AuditLog from '../models/AuditLog.js';

/**
 * Ghi nhận hành động vào Audit Log.
 * @param {string} action - VD: 'TẠO MỚI', 'CẬP NHẬT', 'XÓA', 'NHẬP KHO', 'BẢO DƯỠNG'
 * @param {string} entity - VD: 'Thiết bị', 'Phiếu sửa chữa'
 * @param {string} entityId - Mã hoặc ID của document
 * @param {string} user - Username của người thực hiện
 * @param {string} details - Mô tả chi tiết
 */
const logAudit = async (action, entity, entityId, user, details) => {
  try {
    await AuditLog.create({ action, entity, entityId, user, details });
  } catch (err) {
    console.error('Lỗi ghi AuditLog:', err);
  }
};

export default logAudit;
