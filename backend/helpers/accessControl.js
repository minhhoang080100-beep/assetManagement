export function isPrivileged(user) {
  return user?.role === 'ADMIN' || user?.role === 'DIRECTOR';
}

export function departmentScopedQuery(user) {
  if (isPrivileged(user)) return {};
  return { department: user.department };
}

export function canAccessDepartment(user, department) {
  if (isPrivileged(user)) return true;
  return String(department || '') === String(user?.department || '');
}

export function forbid(res, message = 'Bạn không có quyền thực hiện thao tác này.') {
  return res.status(403).json({ message });
}
