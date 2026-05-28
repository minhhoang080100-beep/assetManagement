export const DEPARTMENTS = [
  {
    group: 'Cửa Lò',
    items: [
      'Bộ phận kinh doanh',
      'Phòng An toàn',
      'Phòng Giám đốc',
      'Phòng Giám đốc khai thác',
      'Phòng Giám đốc kỹ thuật',
      'Phòng Giám đốc thương vụ',
      'Phòng Kế toán tổng hợp',
      'Phòng Kỹ thuật',
      'Phòng Quỹ',
      'Phòng Y tế',
      'Phòng giao ban, Hội trường',
      'Phòng Điều độ hiện trường',
      'Trung tâm khai thác',
    ],
  },
  {
    group: 'Bến Thủy',
    items: [
      'Hội trường',
      'Ngoài văn phòng',
      'Phòng Giám đốc',
      'Phòng Kế toán nghiệp vụ',
      'Phòng Kỹ thuật',
      'Phòng Phó Giám đốc',
      'Phòng Điều độ',
    ],
  },
  {
    group: 'Văn phòng Cảng',
    items: [
      'Hội trường tầng 5',
      'Phòng Bảo vệ',
      'Phòng Chủ tịch Hội đồng quản trị',
      'Phòng Công đoàn',
      'Phòng Giám đốc nội chính',
      'Phòng Hành chính tổng hợp',
      'Phòng Kế hoạch Kinh doanh',
      'Phòng Kỹ thuật',
      'Phòng Lái xe',
      'Phòng Phó Tổng Giám đốc Kinh doanh',
      'Phòng Quản trị',
      'Phòng Quỹ',
      'Phòng Tài chính kế toán',
      'Phòng Tạp vụ',
      'Phòng Tổ chức Cán bộ - Lao động',
      'Phòng Tổng Giám đốc',
      'Phòng Vệ sinh',
      'Phòng Y tế',
      'Phòng họp giao ban',
      'Phòng truyền thống',
      'Trạm biến áp',
    ],
  },
];

export const UNIT_CODE_MAP = {
  'Cửa Lò': 'CL',
  'Bến Thủy': 'BT',
  'Văn phòng Cảng': 'VPC',
};

export const DEPT_CODE_MAP = {
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
  'Phòng Điều độ hiện trường': 'DDHT',
  'Trung tâm khai thác': 'TTKT',
  'Hội trường': 'HT',
  'Ngoài văn phòng': 'NVP',
  'Phòng Kế toán nghiệp vụ': 'KTNV',
  'Phòng Phó Giám đốc': 'PGD',
  'Phòng Điều độ': 'DD',
  'Hội trường tầng 5': 'HT5',
  'Phòng Bảo vệ': 'BV',
  'Phòng Chủ tịch Hội đồng quản trị': 'HDQT',
  'Phòng Công đoàn': 'CD',
  'Phòng Giám đốc nội chính': 'GDNC',
  'Phòng Hành chính tổng hợp': 'HCTH',
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

export const RAW_DEPARTMENT_ALIASES = {
  'P.CĐ -> P.An toàn)': 'Phòng An toàn',
  'P. Giám đốc khai thác': 'Phòng Giám đốc khai thác',
  'Kế toán tổng hợp': 'Phòng Kế toán tổng hợp',
  'P.Giám đốc': 'Phòng Giám đốc',
  'P.Giám đốc kỹ thuật': 'Phòng Giám đốc kỹ thuật',
  'P.Giám đốc thương vụ': 'Phòng Giám đốc thương vụ',
  'P.giao ban, Hội trường': 'Phòng giao ban, Hội trường',
  'P.Điều độ hiện trường': 'Phòng Điều độ hiện trường',
  'Phòng  Giám đốc': 'Phòng Giám đốc',
  'Phòng P.Giám Đốc': 'Phòng Phó Giám đốc',
  'Phòng Chủ Tịch Hội đồng quản trị': 'Phòng Chủ tịch Hội đồng quản trị',
  'Phòng Công Đoàn': 'Phòng Công đoàn',
  'Phòng Giám Đốc nội chính': 'Phòng Giám đốc nội chính',
  'Phòng KHKD': 'Phòng Kế hoạch Kinh doanh',
  'Phòng Kỹ Thuật': 'Phòng Kỹ thuật',
  'Phòng Phó Tổng Giám đốc Kinh Doanh': 'Phòng Phó Tổng Giám đốc Kinh doanh',
  'Phòng Quỷ': 'Phòng Quỹ',
  'Phòng Tổ chức cán bộ - Lao động': 'Phòng Tổ chức Cán bộ - Lao động',
};

export const FLAT_DEPARTMENTS = DEPARTMENTS.flatMap(({ group, items }) =>
  items.map((item) => `${group} - ${item}`),
);

export function cleanDepartmentName(value) {
  const trimmed = String(value || '').trim();
  return RAW_DEPARTMENT_ALIASES[trimmed] || trimmed;
}

export function getDepartmentCode(unit, department) {
  const unitCode = UNIT_CODE_MAP[unit] || 'CNT';
  const deptCode = DEPT_CODE_MAP[department] || 'KH';
  return `${unitCode}.${deptCode}`;
}
