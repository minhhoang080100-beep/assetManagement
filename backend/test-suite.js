/**
 * Comprehensive API Test Suite
 * Kiểm tra toàn bộ nghiệp vụ hệ thống QLTS
 */

const BASE = 'http://localhost:5000';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || process.env.SEED_USER_PASSWORD;
const WRONG_PASSWORD = `${TEST_USER_PASSWORD || 'missing'}-wrong`;
let TOKEN = '';
let testRepairId = '';
let testProcId = '';
let testPlanId = '';

const results = [];
let passed = 0;
let failed = 0;

function log(testName, status, detail = '') {
  const icon = status ? '✅' : '❌';
  console.log(`${icon} ${testName} ${detail ? '— ' + detail : ''}`);
  results.push({ testName, status, detail });
  if (status) passed++; else failed++;
}

async function apiCall(method, endpoint, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE}${endpoint}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  if (!TEST_USER_PASSWORD) {
    console.error('Vui lòng đặt TEST_USER_PASSWORD hoặc SEED_USER_PASSWORD trước khi chạy test-suite.js');
    process.exit(1);
  }

  console.log('\n====================================');
  console.log('  HỆ THỐNG KIỂM THỬ QLTS VER 2');
  console.log('====================================\n');

  // ===================================
  // MODULE 1: AUTHENTICATION
  // ===================================
  console.log('--- MODULE 1: XÁC THỰC ---');
  
  // Test 1.1: Login thành công (ADMIN)
  const loginOk = await apiCall('POST', '/api/auth/login', { username: 'admin_hcth', password: TEST_USER_PASSWORD });
  log('1.1 Login ADMIN', loginOk.ok && !!loginOk.data?.token, `Token: ${loginOk.data?.token?.substring(0, 20)}...`);
  TOKEN = loginOk.data?.token || '';

  // Test 1.2: Login sai mật khẩu
  const loginBad = await apiCall('POST', '/api/auth/login', { username: 'admin_hcth', password: WRONG_PASSWORD });
  log('1.2 Login sai mật khẩu', loginBad.status === 401, `Status: ${loginBad.status}`);

  // Test 1.3: Login user không tồn tại
  const loginNoUser = await apiCall('POST', '/api/auth/login', { username: 'nonexistent', password: TEST_USER_PASSWORD });
  log('1.3 Login user không tồn tại', loginNoUser.status === 401, `Status: ${loginNoUser.status}`);

  // Test 1.4: API call không có token
  const noToken = await fetch(`${BASE}/api/equipments`);
  log('1.4 API không có token → 401', noToken.status === 401, `Status: ${noToken.status}`);

  // Test 1.5: Login MANAGER
  const loginManager = await apiCall('POST', '/api/auth/login', { username: 'ketoan_cl', password: TEST_USER_PASSWORD });
  log('1.5 Login MANAGER', loginManager.ok && loginManager.data?.user?.role === 'MANAGER', `Role: ${loginManager.data?.user?.role}`);

  // Test 1.6: Login USER
  const loginUser = await apiCall('POST', '/api/auth/login', { username: 'kythuat_bt', password: TEST_USER_PASSWORD });
  log('1.6 Login USER', loginUser.ok && loginUser.data?.user?.role === 'USER', `Role: ${loginUser.data?.user?.role}`);

  // ===================================
  // MODULE 2: QUẢN LÝ THIẾT BỊ
  // ===================================
  console.log('\n--- MODULE 2: QUẢN LÝ THIẾT BỊ ---');

  // Test 2.1: Lấy danh sách thiết bị
  const eqList = await apiCall('GET', '/api/equipments');
  log('2.1 GET danh sách thiết bị', eqList.ok && Array.isArray(eqList.data), `Số lượng: ${eqList.data?.length}`);

  // Test 2.2: Tạo thiết bị mới
  const newEq = await apiCall('POST', '/api/equipments', {
    code: 'TEST-API-001',
    name: 'Máy tính Test API',
    specs: 'Intel i7, 16GB RAM',
    department: 'Phòng Test',
    status: 'Tốt',
    condition: 100,
    purchaseYear: 2026
  });
  log('2.2 Tạo thiết bị mới', newEq.status === 201, `Code: ${newEq.data?.code}`);

  // Test 2.3: Lấy chi tiết thiết bị
  const eqDetail = await apiCall('GET', '/api/equipments/TEST-API-001');
  log('2.3 GET chi tiết thiết bị', eqDetail.ok && eqDetail.data?.code === 'TEST-API-001', `Name: ${eqDetail.data?.name}`);

  // Test 2.4: Cập nhật thiết bị
  const eqUpdate = await apiCall('PUT', '/api/equipments/TEST-API-001', { name: 'Máy tính Test UPDATED', specs: 'Intel i9, 32GB RAM' });
  log('2.4 Cập nhật thiết bị', eqUpdate.ok && eqUpdate.data?.name === 'Máy tính Test UPDATED', `New name: ${eqUpdate.data?.name}`);

  // Test 2.5: Ghi nhận bảo dưỡng
  const maint = await apiCall('POST', '/api/equipments/TEST-API-001/maintenance', {
    type: 'Bảo dưỡng',
    description: 'Vệ sinh bụi, thay keo tản nhiệt CPU'
  });
  log('2.5 Ghi nhận bảo dưỡng', maint.ok && maint.data?.history?.length > 0, `History entries: ${maint.data?.history?.length}`);

  // Test 2.6: Bulk import
  const bulkData = [
    { code: 'BULK-001', name: 'Máy in Bulk 1', department: 'Test', status: 'Tốt', condition: 100, purchaseYear: 2026 },
    { code: 'BULK-002', name: 'Máy in Bulk 2', department: 'Test', status: 'Tốt', condition: 100, purchaseYear: 2026 }
  ];
  const bulk = await apiCall('POST', '/api/equipments/bulk', bulkData);
  log('2.6 Bulk import', bulk.status === 201, `Message: ${bulk.data?.message}`);

  // Test 2.7: Thiết bị không tồn tại → 404
  const eq404 = await apiCall('GET', '/api/equipments/NON-EXIST-999');
  log('2.7 Thiết bị không tồn tại → 404', eq404.status === 404, `Status: ${eq404.status}`);

  // Test 2.8: Xóa thiết bị test
  const eqDel = await apiCall('DELETE', '/api/equipments/TEST-API-001');
  log('2.8 Xóa thiết bị', eqDel.ok, `Message: ${eqDel.data?.message}`);
  await apiCall('DELETE', '/api/equipments/BULK-001');
  await apiCall('DELETE', '/api/equipments/BULK-002');

  // ===================================
  // MODULE 3: PHIẾU SỬA CHỮA (BM.05.05)
  // ===================================
  console.log('\n--- MODULE 3: PHIẾU SỬA CHỮA ---');

  // Test 3.1: Tạo phiếu sửa chữa
  const newRepair = await apiCall('POST', '/api/repairs', {
    reqCode: 'SC-TEST-API',
    equipmentCode: 'CL.KT-MT-001',
    equipmentName: 'Máy tính Dell',
    department: 'Kế toán tổng hợp',
    issue: 'Màn hình bị nhòe, không hiển thị',
    requestedBy: 'admin_hcth',
    status: 'Chờ duyệt'
  });
  log('3.1 Tạo phiếu sửa chữa', newRepair.status === 201, `Code: ${newRepair.data?.reqCode}`);
  testRepairId = newRepair.data?._id || '';

  // Test 3.2: Chuyển trạng thái
  if (testRepairId) {
    const toReceived = await apiCall('PUT', `/api/repairs/${testRepairId}`, { status: 'Đã tiếp nhận' });
    const toApproved = await apiCall('PUT', `/api/repairs/${testRepairId}`, { status: 'TGĐ phê duyệt' });
    const toRepairing = await apiCall('PUT', `/api/repairs/${testRepairId}`, { status: 'Đang sửa chữa' });
    log('3.2 Chuyển → Đang sửa chữa', toRepairing.ok && toRepairing.data?.status === 'Đang sửa chữa', `Status: ${toRepairing.data?.status}`);
  } else log('3.2 Chuyển → Đang sửa chữa', false, 'No ID');

  // Test 3.3: Hoàn thành sửa chữa (kiểm tra auto-update equipment)
  if (testRepairId) {
    const eqBefore = await apiCall('GET', '/api/equipments/CL.KT-MT-001');
    const histBefore = eqBefore.data?.history?.length || 0;

    const toCompleted = await apiCall('PUT', `/api/repairs/${testRepairId}`, {
      status: 'Đã hoàn thành',
      solution: 'Thay màn hình mới Samsung 24"',
      cost: 3500000
    });
    log('3.3 Hoàn thành sửa chữa', toCompleted.ok && toCompleted.data?.status === 'Đã hoàn thành', `Status: ${toCompleted.data?.status}`);

    // Test 3.4: Auto-update equipment status
    const eqAfter = await apiCall('GET', '/api/equipments/CL.KT-MT-001');
    log('3.4 Auto-update equipment → Tốt', eqAfter.data?.status === 'Tốt', `Equipment status: ${eqAfter.data?.status}`);
    log('3.5 Auto-add history entry', (eqAfter.data?.history?.length || 0) > histBefore, `History: ${histBefore} → ${eqAfter.data?.history?.length}`);
  } else {
    log('3.3 Hoàn thành sửa chữa', false, 'No ID');
    log('3.4 Auto-update equipment', false, 'No ID');
    log('3.5 Auto-add history', false, 'No ID');
  }

  // Test 3.6: Xóa phiếu sửa chữa
  if (testRepairId) {
    const delRepair = await apiCall('DELETE', `/api/repairs/${testRepairId}`);
    log('3.6 Xóa phiếu sửa chữa', delRepair.ok, `Message: ${delRepair.data?.message}`);
  } else log('3.6 Xóa phiếu sửa chữa', false, 'No ID');

  // ===================================
  // MODULE 4: MUA SẮM (BM.05.01)
  // ===================================
  console.log('\n--- MODULE 4: MUA SẮM ---');

  // Test 4.1: Tạo phiếu đề nghị
  const newProc = await apiCall('POST', '/api/procurements', {
    title: 'Đề nghị mua 3 laptop mới cho phòng Kế toán',
    department: 'Kế toán tổng hợp',
    reason: 'Thay thế máy tính cũ đã hết hạn sử dụng',
    estimatedCost: 45000000,
    items: [
      { name: 'Laptop Dell Vostro 3520', quantity: 2, estimatedPrice: 15000000 },
      { name: 'Laptop HP 245 G9', quantity: 1, estimatedPrice: 15000000 }
    ],
    status: 'Chờ duyệt'
  });
  log('4.1 Tạo phiếu mua sắm', newProc.status === 201, `Title: ${newProc.data?.title?.substring(0, 30)}...`);
  testProcId = newProc.data?._id || '';

  // Test 4.2: Lập kế hoạch và Phê duyệt
  if (testProcId) {
    const plan = await apiCall('PUT', `/api/procurements/${testProcId}`, {
      status: 'Đã lập kế hoạch',
      hcthOpinion: 'Đã rà soát nhu cầu và tổng hợp báo giá theo SOP',
      quotations: [
        { supplier: 'NCC A', price: 45000000 },
        { supplier: 'NCC B', price: 46000000 },
        { supplier: 'NCC C', price: 47000000 }
      ],
      selectedSupplier: 'NCC A',
      contractNumber: 'HD-TEST-001'
    });
    const approve = await apiCall('PUT', `/api/procurements/${testProcId}`, { status: 'TGĐ phê duyệt' });
    log('4.2 TGĐ Phê duyệt', approve.ok && approve.data?.status === 'TGĐ phê duyệt', `Status: ${approve.data?.status}`);
  } else log('4.2 TGĐ Phê duyệt', false, 'No ID');

  // Test 4.3: HCTH Tiếp nhận
  if (testProcId) {
    const take = await apiCall('PUT', `/api/procurements/${testProcId}`, { status: 'Đang thực hiện' });
    log('4.3 HCTH Tiếp nhận', take.ok && take.data?.status === 'Đang thực hiện', `Status: ${take.data?.status}`);
  } else log('4.3 HCTH Tiếp nhận', false, 'No ID');

  // Test 4.4: Hoàn tất mua sắm
  if (testProcId) {
    const done = await apiCall('PUT', `/api/procurements/${testProcId}`, { status: 'Hoàn tất' });
    log('4.4 Hoàn tất mua sắm', done.ok && done.data?.status === 'Hoàn tất', `Status: ${done.data?.status}`);
  } else log('4.4 Hoàn tất mua sắm', false, 'No ID');

  // Test 4.5: Nhập kho (auto-create equipments)
  if (testProcId) {
    const eqCountBefore = (await apiCall('GET', '/api/equipments')).data?.length || 0;
    const importResult = await apiCall('POST', `/api/procurements/${testProcId}/import`);
    log('4.5 Nhập kho', importResult.ok, `Message: ${importResult.data?.message}`);
    
    const eqCountAfter = (await apiCall('GET', '/api/equipments')).data?.length || 0;
    log('4.6 Auto-create 3 thiết bị', eqCountAfter === eqCountBefore + 3, `Before: ${eqCountBefore}, After: ${eqCountAfter}`);
  } else {
    log('4.5 Nhập kho', false, 'No ID');
    log('4.6 Auto-create thiết bị', false, 'No ID');
  }

  // Test 4.7: Xóa phiếu
  if (testProcId) {
    const delProc = await apiCall('DELETE', `/api/procurements/${testProcId}`);
    log('4.7 Xóa phiếu mua sắm', delProc.ok, `Message: ${delProc.data?.message}`);
  } else log('4.7 Xóa phiếu mua sắm', false, 'No ID');

  // ===================================
  // MODULE 5: KẾ HOẠCH BẢO DƯỠNG (BM.05.07)
  // ===================================
  console.log('\n--- MODULE 5: KẾ HOẠCH BẢO DƯỠNG ---');

  // Test 5.1: Tạo kế hoạch
  const newPlan = await apiCall('POST', '/api/maintenance-plans', {
    title: 'KH Bảo dưỡng Quý 2/2026',
    period: 'Q2-2026',
    items: [
      { equipmentCode: 'CL.KT-MT-001', equipmentName: 'Máy tính Dell', department: 'Kế toán tổng hợp', content: 'Vệ sinh bụi, kiểm tra ổ cứng', scheduledDate: '2026-06-15' },
      { equipmentCode: 'CL.KT-MT-002', equipmentName: 'Máy tính HP', department: 'Kế toán tổng hợp', content: 'Thay keo tản nhiệt', scheduledDate: '2026-06-20' }
    ]
  });
  log('5.1 Tạo kế hoạch bảo dưỡng', newPlan.status === 201, `Title: ${newPlan.data?.title}`);
  testPlanId = newPlan.data?._id || '';

  // Test 5.2: Cập nhật kế hoạch
  if (testPlanId) {
    const wait = await apiCall('PUT', `/api/maintenance-plans/${testPlanId}`, { status: 'Chờ duyệt' });
    const updatePlan = await apiCall('PUT', `/api/maintenance-plans/${testPlanId}`, { status: 'TGĐ phê duyệt' });
    log('5.2 Cập nhật trạng thái → TGĐ phê duyệt', updatePlan.ok, `Status: ${updatePlan.data?.status}`);
  } else log('5.2 Cập nhật trạng thái', false, 'No ID');

  // Test 5.3: Xóa kế hoạch
  if (testPlanId) {
    const delPlan = await apiCall('DELETE', `/api/maintenance-plans/${testPlanId}`);
    log('5.3 Xóa kế hoạch', delPlan.ok, `Message: ${delPlan.data?.message}`);
  } else log('5.3 Xóa kế hoạch', false, 'No ID');

  // ===================================
  // MODULE 6: AUDIT LOG
  // ===================================
  console.log('\n--- MODULE 6: AUDIT LOG ---');

  const auditLogs = await apiCall('GET', '/api/auditlogs');
  log('6.1 GET audit logs', auditLogs.ok && Array.isArray(auditLogs.data), `Entries: ${auditLogs.data?.length}`);
  
  // Kiểm tra audit log ghi nhận đúng hành động test vừa rồi
  const hasCreate = auditLogs.data?.some(l => l.action === 'TẠO MỚI');
  const hasUpdate = auditLogs.data?.some(l => l.action === 'CẬP NHẬT');
  const hasDelete = auditLogs.data?.some(l => l.action === 'XÓA');
  log('6.2 Audit log có TẠO MỚI', hasCreate);
  log('6.3 Audit log có CẬP NHẬT', hasUpdate);
  log('6.4 Audit log có XÓA', hasDelete);

  // ===================================
  // MODULE 7: PHÂN QUYỀN (RBAC)
  // ===================================
  console.log('\n--- MODULE 7: PHÂN QUYỀN RBAC ---');

  // Test 7.1: USER role không được tạo thiết bị
  const userLogin = await apiCall('POST', '/api/auth/login', { username: 'kythuat_bt', password: TEST_USER_PASSWORD });
  TOKEN = userLogin.data?.token || '';
  
  const userCreate = await apiCall('POST', '/api/equipments', {
    code: 'UNAUTH-001', name: 'Unauthorized', department: 'Test', status: 'Tốt', condition: 100, purchaseYear: 2026
  });
  log('7.1 USER không được tạo thiết bị', userCreate.status === 403, `Status: ${userCreate.status}`);

  // Test 7.2: USER không được xóa
  const userDelete = await apiCall('DELETE', '/api/equipments/CL.KT-MT-001');
  log('7.2 USER không được xóa thiết bị', userDelete.status === 403, `Status: ${userDelete.status}`);

  // Test 7.3: USER có thể xem danh sách
  const userView = await apiCall('GET', '/api/equipments');
  log('7.3 USER có thể xem danh sách', userView.ok, `Count: ${userView.data?.length}`);

  // Test 7.4: USER có thể tạo phiếu sửa chữa
  const userRepair = await apiCall('POST', '/api/repairs', {
    reqCode: 'SC-USER-001', equipmentCode: 'BT.KTH-MT-001', equipmentName: 'Máy tính test',
    department: 'Bến Thủy - Kỹ thuật', issue: 'Lỗi phần mềm', status: 'Chờ duyệt'
  });
  log('7.4 USER tạo phiếu sửa chữa', userRepair.status === 201, `Code: ${userRepair.data?.reqCode}`);
  
  // Cleanup: delete the test repair with admin
  TOKEN = loginOk.data?.token;
  if (userRepair.data?._id) await apiCall('DELETE', `/api/repairs/${userRepair.data._id}`);

  // Test 7.5: USER không xem được audit log (ADMIN only)
  TOKEN = userLogin.data?.token || '';
  const userAudit = await apiCall('GET', '/api/auditlogs');
  log('7.5 USER không xem audit log', userAudit.status === 403, `Status: ${userAudit.status}`);

  // ===================================
  // CLEANUP test data  
  // ===================================
  TOKEN = loginOk.data?.token;
  // Clean up auto-created equipments from procurement import
  const allEq = await apiCall('GET', '/api/equipments');
  const testEqs = allEq.data?.filter(e => e.code.startsWith('TB-MUA'));
  for (const eq of (testEqs || [])) {
    await apiCall('DELETE', `/api/equipments/${eq.code}`);
  }

  // ===================================
  // SUMMARY
  // ===================================
  console.log('\n====================================');
  console.log(`  KẾT QUẢ: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL`);
  console.log('====================================\n');

  if (failed > 0) {
    console.log('CÁC TEST THẤT BẠI:');
    results.filter(r => !r.status).forEach(r => console.log(`  ❌ ${r.testName}: ${r.detail}`));
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
