const UNIT_CODE_MAP = {
  'Cửa Lò': 'CL',
  'Bến Thủy': 'BT',
  'Văn phòng Cảng': 'VPC',
};

const DEPT_CODE_MAP = {
  'Bộ phận kinh doanh': 'KD',
  'Phòng An toàn': 'AT',
  'Phòng Giám đốc': 'GD',
  'Phòng Giám đốc khai thác': 'GDKH',
  'Phòng Giám đốc kỹ thuật': 'GDKT',
  'Phòng Giám đốc thương vụ': 'GDTV',
  'Phòng Kế toán tổng hợp': 'KT',
  'Phòng Kỹ thuật': 'KTH',
  'Phòng Quỹ': 'Q',
  'Phòng Y tế': 'YT',
  'Phòng giao ban, Hội trường': 'HT',
  'Phòng Điều độ hiện trường': 'DĐHT',
  'Trung tâm khai thác': 'TTKT',
  'Hội trường': 'HT',
  'Ngoài văn phòng': 'NVP',
  'Phòng Kế toán nghiệp vụ': 'KTNV',
  'Phòng Phó Giám đốc': 'PGD',
  'Phòng Điều độ': 'DĐ',
  'Hội trường tầng 5': 'HT5',
  'Phòng Bảo vệ': 'BV',
  'Phòng Chủ tịch Hội đồng quản trị': 'HDQT',
  'Phòng Công đoàn': 'CD',
  'Phòng Giám đốc nội chính': 'GDNC',
  'Phòng Hành chính tổng hợp': 'HC',
  'Phòng Kế hoạch Kinh doanh': 'KHKD',
  'Phòng Lái xe': 'LX',
  'Phòng Phó Tổng Giám đốc Kinh doanh': 'PTGDKD',
  'Phòng Quản trị': 'QT',
  'Phòng Tài chính kế toán': 'TCKT',
  'Phòng Tạp vụ': 'TV',
  'Phòng Tổ chức Cán bộ - Lao động': 'TCCB',
  'Phòng Tổng Giám đốc': 'TGD',
  'Phòng Vệ sinh': 'VS',
  'Phòng họp giao ban': 'PHGB',
  'Phòng truyền thống': 'PTT',
  'Trạm biến áp': 'TBA',
};

export const VALID_EQUIPMENT_TYPES = ['MT', 'MI', 'DH', 'MP', 'NT', 'MF', 'MS', 'MC', 'ĐT', 'CM', 'MĐ', 'OT', 'TB'];

export function getDepartmentPrefix(department) {
  const [unitName = '', deptName = ''] = String(department || '').split(' - ');
  const unitCode = UNIT_CODE_MAP[unitName.trim()] || 'CNT';
  const deptCode = DEPT_CODE_MAP[deptName.trim()] || 'KH';
  return `${unitCode}.${deptCode}`;
}
