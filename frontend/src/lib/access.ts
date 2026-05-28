import type { UserRole } from './types';

export function isApproverRole(role?: UserRole | string): boolean {
  return role === 'DIRECTOR' || role === 'DEPUTY_DIRECTOR';
}

export function getRoleName(role: UserRole | string): string {
  switch (role) {
    case 'ADMIN': return 'Quản trị viên';
    case 'MANAGER': return 'Quản lý';
    case 'USER': return 'Nhân viên';
    case 'DIRECTOR': return 'Tổng Giám Đốc';
    case 'DEPUTY_DIRECTOR': return 'Phó Tổng Giám Đốc';
    default: return role;
  }
}
