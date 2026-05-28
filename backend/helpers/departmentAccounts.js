import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { DEPARTMENTS, DEPT_CODE_MAP, UNIT_CODE_MAP } from './departments.js';

const SALT_ROUNDS = 10;
const MIN_SEED_PASSWORD_LENGTH = 6;

export const DEPRECATED_SEED_USERNAMES = ['ketoan_cl', 'kythuat_bt'];

export const PERSONAL_APPROVER_ACCOUNTS = [
  {
    username: 'tgd',
    fullName: 'Tổng Giám đốc',
    role: 'DIRECTOR',
    department: 'Văn phòng Cảng - Phòng Tổng Giám đốc',
  },
  {
    username: 'ptgd',
    fullName: 'Phó Tổng Giám đốc Kinh doanh',
    role: 'DEPUTY_DIRECTOR',
    department: 'Văn phòng Cảng - Phòng Phó Tổng Giám đốc Kinh doanh',
  },
];

function toUsernamePart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}

export function getDepartmentAccountUsername(unit, department) {
  if (unit === 'Văn phòng Cảng' && department === 'Phòng Hành chính tổng hợp') {
    return 'admin_hcth';
  }

  const unitCode = UNIT_CODE_MAP[unit] || unit;
  const deptCode = DEPT_CODE_MAP[department] || department;
  return `${toUsernamePart(unitCode)}_${toUsernamePart(deptCode)}`;
}

function getDepartmentAccountRole(unit, department) {
  if (unit === 'Văn phòng Cảng' && department === 'Phòng Hành chính tổng hợp') {
    return 'ADMIN';
  }
  return 'USER';
}

export function buildDepartmentAccounts(passwordHash) {
  const departmentAccounts = DEPARTMENTS.flatMap(({ group, items }) =>
    items.map((department) => {
      const fullDepartment = `${group} - ${department}`;
      return {
        username: getDepartmentAccountUsername(group, department),
        password: passwordHash,
        fullName: `Tài khoản ${fullDepartment}`,
        role: getDepartmentAccountRole(group, department),
        department: fullDepartment,
        isActive: true,
      };
    }),
  );

  const personalAccounts = PERSONAL_APPROVER_ACCOUNTS.map((account) => ({
    ...account,
    password: passwordHash,
    isActive: true,
  }));

  return [...departmentAccounts, ...personalAccounts];
}

export async function seedDepartmentAccounts(password, { pruneDeprecated = true } = {}) {
  if (!password || password.length < MIN_SEED_PASSWORD_LENGTH) {
    throw new Error(`Vui lòng đặt SEED_USER_PASSWORD tối thiểu ${MIN_SEED_PASSWORD_LENGTH} ký tự trước khi tạo tài khoản.`);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const accounts = buildDepartmentAccounts(passwordHash);

  await Promise.all(accounts.map((user) => User.updateOne(
    { username: user.username },
    { $set: user },
    { upsert: true },
  )));

  let removedDeprecated = 0;
  if (pruneDeprecated) {
    const result = await User.deleteMany({ username: { $in: DEPRECATED_SEED_USERNAMES } });
    removedDeprecated = result.deletedCount || 0;
  }

  return {
    accountCount: accounts.length,
    departmentAccountCount: accounts.length - PERSONAL_APPROVER_ACCOUNTS.length,
    approverAccountCount: PERSONAL_APPROVER_ACCOUNTS.length,
    removedDeprecated,
    accounts: accounts.map(({ password: _password, ...account }) => account),
  };
}
