import assert from 'node:assert/strict';
import { URL } from 'node:url';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const runId = `codex_e2e_${Date.now()}`;
const password = 'Passw0rd!2026';
const deptA = 'Văn phòng Cảng - Phòng Hành chính tổng hợp';
const deptB = 'Văn phòng Cảng - Phòng Tài chính kế toán';

const S = {
  pending: 'Chờ duyệt',
  planned: 'Đã lập kế hoạch',
  directorApproved: 'TGĐ phê duyệt',
  rejected: 'Từ chối',
  inProgress: 'Đang thực hiện',
  completed: 'Hoàn tất',
  imported: 'Đã nhập kho',
  draft: 'Đang lập',
  waitingApproval: 'Chờ duyệt',
  accepted: 'Đã tiếp nhận',
  repairing: 'Đang sửa chữa',
  repaired: 'Đã hoàn thành',
  maintenanceDone: 'Đã thực hiện',
  inventoryOpen: 'Đang kiểm kê',
  disposed: 'Đã thanh lý',
  good: 'Tốt',
  poor: 'Kém phẩm chất',
  liquidated: 'Thanh lý',
  no: 'Không',
  repair: 'Sửa chữa',
};

function buildTestMongoUri() {
  if (process.env.TEST_MONGODB_URI) {
    const configured = new URL(process.env.TEST_MONGODB_URI);
    const dbName = decodeURIComponent(configured.pathname.replace(/^\//, ''));
    if (!/test|e2e|codex/i.test(dbName)) {
      throw new Error('TEST_MONGODB_URI phải trỏ tới database test/e2e để tránh đụng dữ liệu thật.');
    }
    return { uri: process.env.TEST_MONGODB_URI, dbName };
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('Thiếu MONGODB_URI trong .env');
  }

  const url = new URL(process.env.MONGODB_URI);
  const dbName = `codex_e2e_${Date.now().toString(36)}`;
  url.pathname = `/${dbName}`;

  return { uri: url.toString(), dbName };
}

const { uri: testMongoUri, dbName } = buildTestMongoUri();
if (!/codex_e2e|test|e2e/i.test(dbName)) {
  throw new Error(`Tên database test không an toàn: ${dbName}`);
}

process.env.MONGODB_URI = testMongoUri;
process.env.JWT_SECRET ||= 'codex-e2e-secret';
process.env.PORT = '0';

const [{ default: app }, { default: User }, { default: Equipment }, { default: ProcurementRequest }] = await Promise.all([
  import('./server.js'),
  import('./models/User.js'),
  import('./models/Equipment.js'),
  import('./models/ProcurementRequest.js'),
]);

const server = app.listen(0);
let baseUrl;

async function request(method, path, { token, body, headers } = {}) {
  const requestHeaders = { ...(headers || {}) };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  const options = { method, headers: requestHeaders };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { status: response.status, data, text };
}

function expectStatus(response, status, label) {
  assert.equal(
    response.status,
    status,
    `${label}: expected HTTP ${status}, received ${response.status}. Body: ${response.text}`,
  );
  return response.data;
}

async function login(username) {
  const response = await request('POST', '/api/auth/login', { body: { username, password } });
  const data = expectStatus(response, 200, `login ${username}`);
  assert.ok(data.token, `login ${username} did not return a token`);
  return data.token;
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(password, 10);
  await User.insertMany([
    { username: `${runId}_admin`, password: passwordHash, fullName: 'E2E Admin', role: 'ADMIN', department: deptA },
    { username: `${runId}_director`, password: passwordHash, fullName: 'E2E Director', role: 'DIRECTOR', department: deptA },
    { username: `${runId}_manager`, password: passwordHash, fullName: 'E2E Manager', role: 'MANAGER', department: deptA },
    { username: `${runId}_user`, password: passwordHash, fullName: 'E2E User', role: 'USER', department: deptA },
    { username: `${runId}_other`, password: passwordHash, fullName: 'E2E Other User', role: 'USER', department: deptB },
  ]);
}

function quotations() {
  return [
    { supplier: 'Nhà cung cấp A', price: 7300000, note: 'Đủ hồ sơ' },
    { supplier: 'Nhà cung cấp B', price: 7600000, note: 'So sánh giá' },
    { supplier: 'Nhà cung cấp C', price: 7500000, note: 'Đề xuất chọn' },
  ];
}

async function run() {
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  await mongoose.connect(testMongoUri);
  assert.match(mongoose.connection.db.databaseName, /codex_e2e|test|e2e/i);
  await mongoose.connection.dropDatabase();
  await seedUsers();

  const invalidLogin = await request('POST', '/api/auth/login', { body: { username: 'missing', password } });
  expectStatus(invalidLogin, 401, 'invalid login is rejected');

  const adminToken = await login(`${runId}_admin`);
  const directorToken = await login(`${runId}_director`);
  const managerToken = await login(`${runId}_manager`);
  const userToken = await login(`${runId}_user`);
  const otherToken = await login(`${runId}_other`);

  expectStatus(await request('GET', '/api/equipments'), 401, 'equipment list requires auth');
  expectStatus(
    await request('POST', '/api/equipments', {
      token: userToken,
      body: { name: 'Không được tạo', department: deptA },
    }),
    403,
    'USER cannot create equipment',
  );

  const equipment = expectStatus(
    await request('POST', '/api/equipments', {
      token: adminToken,
      body: {
        name: `Máy tính E2E ${runId}`,
        specs: 'Core i5, 16GB RAM',
        department: deptA,
        purchaseYear: 2026,
        price: 12000000,
        typeCode: 'MT',
      },
    }),
    201,
    'ADMIN creates equipment',
  );
  assert.ok(equipment.code, 'created equipment has generated code');

  const sameDeptEquipment = expectStatus(await request('GET', '/api/equipments', { token: userToken }), 200, 'USER lists own department equipment');
  assert.ok(sameDeptEquipment.some((item) => item.code === equipment.code), 'USER can see own department equipment');

  const otherDeptEquipment = expectStatus(await request('GET', '/api/equipments', { token: otherToken }), 200, 'other USER lists own department equipment');
  assert.ok(!otherDeptEquipment.some((item) => item.code === equipment.code), 'other department USER cannot see equipment');

  expectStatus(await request('GET', `/api/equipments/${equipment.code}`, { token: otherToken }), 403, 'department isolation blocks equipment detail');

  const maintainedEquipment = expectStatus(
    await request('POST', `/api/equipments/${equipment.code}/maintenance`, {
      token: adminToken,
      body: { type: 'Bảo dưỡng', description: 'Bảo dưỡng định kỳ E2E' },
    }),
    200,
    'ADMIN records direct maintenance history',
  );
  assert.ok(maintainedEquipment.history.some((event) => event.type === 'Bảo dưỡng'), 'equipment history includes maintenance');

  const repair = expectStatus(
    await request('POST', '/api/repairs', {
      token: userToken,
      body: {
        equipmentId: equipment._id,
        equipmentCode: equipment.code,
        equipmentName: equipment.name,
        issue: 'Không khởi động được',
        requestType: 'Sửa chữa',
        requesterName: 'Người dùng E2E',
      },
    }),
    201,
    'USER creates repair request',
  );

  expectStatus(
    await request('PUT', `/api/repairs/${repair._id}`, {
      token: managerToken,
      body: { status: S.accepted },
    }),
    403,
    'MANAGER cannot accept repair request',
  );

  expectStatus(
    await request('PUT', `/api/repairs/${repair._id}`, {
      token: adminToken,
      body: {
        status: S.accepted,
        hcthAssessment: 'Đúng thực tế',
        hcthProposal: 'Đề xuất sửa chữa',
      },
    }),
    200,
    'ADMIN accepts and assesses repair request',
  );
  expectStatus(
    await request('PUT', `/api/repairs/${repair._id}`, {
      token: directorToken,
      body: { status: S.directorApproved },
    }),
    200,
    'DIRECTOR approves repair request',
  );
  expectStatus(
    await request('PUT', `/api/repairs/${repair._id}`, {
      token: adminToken,
      body: { status: S.repairing },
    }),
    200,
    'ADMIN starts repair',
  );
  expectStatus(
    await request('PUT', `/api/repairs/${repair._id}`, {
      token: adminToken,
      body: {
        status: S.repaired,
        solution: 'Thay nguồn',
        cost: 450000,
        performedBy: 'Kỹ thuật E2E',
      },
    }),
    200,
    'ADMIN completes repair',
  );
  const equipmentAfterRepair = await Equipment.findOne({ code: equipment.code }).lean();
  assert.equal(equipmentAfterRepair.status, S.good, 'equipment returns to good status after repair');
  assert.ok(equipmentAfterRepair.history.some((event) => event.type === S.repair), 'equipment history includes repair event');

  const lowCostProcurement = expectStatus(
    await request('POST', '/api/procurements', {
      token: userToken,
      body: {
        title: `Đề nghị mua máy in E2E ${runId}`,
        reason: 'Phục vụ công việc văn phòng',
        requesterName: 'Người dùng E2E',
        estimatedCost: 15000000,
        items: [{ name: 'Máy in laser', quantity: 2, estimatedPrice: 7500000 }],
      },
    }),
    201,
    'USER creates procurement request',
  );

  expectStatus(
    await request('PUT', `/api/procurements/${lowCostProcurement._id}`, {
      token: adminToken,
      body: {
        status: S.planned,
        quotations: quotations().slice(0, 2),
        selectedSupplier: 'Nhà cung cấp A',
      },
    }),
    400,
    'low-cost procurement requires at least 3 quotations',
  );

  expectStatus(
    await request('PUT', `/api/procurements/${lowCostProcurement._id}`, {
      token: adminToken,
      body: {
        status: S.planned,
        hcthOpinion: 'Đủ điều kiện tổng hợp kế hoạch',
        quotations: quotations(),
        selectedSupplier: 'Nhà cung cấp A',
      },
    }),
    200,
    'ADMIN plans low-cost procurement with 3 quotations',
  );

  const highCostProcurement = expectStatus(
    await request('POST', '/api/procurements', {
      token: userToken,
      body: {
        title: `Đề nghị mua máy chủ E2E ${runId}`,
        reason: 'Nâng cấp hạ tầng',
        requesterName: 'Người dùng E2E',
        estimatedCost: 30000000,
        items: [{ name: 'Máy chủ', quantity: 1, estimatedPrice: 30000000 }],
      },
    }),
    201,
    'USER creates high-cost procurement request',
  );
  expectStatus(
    await request('PUT', `/api/procurements/${highCostProcurement._id}`, {
      token: adminToken,
      body: {
        status: S.planned,
        quotations: quotations(),
        selectedSupplier: 'Nhà cung cấp A',
      },
    }),
    400,
    'high-cost procurement requires contract information',
  );

  const pendingProcurement = expectStatus(
    await request('POST', '/api/procurements', {
      token: userToken,
      body: {
        title: `Đề nghị chưa thẩm định E2E ${runId}`,
        reason: 'Dùng để kiểm tra chặn lập kế hoạch sai trạng thái',
        requesterName: 'Người dùng E2E',
        estimatedCost: 5000000,
        items: [{ name: 'Thiết bị chờ', quantity: 1, estimatedPrice: 5000000 }],
      },
    }),
    201,
    'USER creates pending procurement request',
  );
  expectStatus(await request('GET', '/api/procurement-plans', { token: userToken }), 403, 'USER cannot read procurement plans');
  expectStatus(
    await request('POST', '/api/procurement-plans', {
      token: adminToken,
      body: {
        title: `Kế hoạch sai trạng thái E2E ${runId}`,
        period: '2026',
        sourceProcurements: [pendingProcurement._id],
      },
    }),
    400,
    'cannot create procurement plan from unplanned requests',
  );

  const procurementPlan = expectStatus(
    await request('POST', '/api/procurement-plans', {
      token: adminToken,
      body: {
        title: `Kế hoạch mua sắm E2E ${runId}`,
        period: '2026',
        sourceProcurements: [lowCostProcurement._id],
        note: 'Kế hoạch kiểm thử tự động',
      },
    }),
    201,
    'ADMIN creates procurement plan',
  );
  assert.equal(procurementPlan.status, S.draft);

  expectStatus(
    await request('PUT', `/api/procurement-plans/${procurementPlan._id}`, {
      token: managerToken,
      body: { status: S.waitingApproval },
    }),
    403,
    'MANAGER cannot update procurement plan status',
  );
  expectStatus(
    await request('PUT', `/api/procurement-plans/${procurementPlan._id}`, {
      token: adminToken,
      body: { status: S.waitingApproval },
    }),
    200,
    'ADMIN submits procurement plan',
  );
  expectStatus(
    await request('PUT', `/api/procurement-plans/${procurementPlan._id}`, {
      token: directorToken,
      body: { status: S.directorApproved },
    }),
    200,
    'DIRECTOR approves procurement plan',
  );
  const procurementAfterPlan = await ProcurementRequest.findById(lowCostProcurement._id).lean();
  assert.equal(procurementAfterPlan.status, S.directorApproved, 'procurement request follows approved plan status');

  expectStatus(
    await request('PUT', `/api/procurements/${lowCostProcurement._id}`, {
      token: adminToken,
      body: { status: S.inProgress },
    }),
    200,
    'ADMIN starts approved procurement',
  );
  expectStatus(
    await request('PUT', `/api/procurements/${lowCostProcurement._id}`, {
      token: adminToken,
      body: { status: S.completed },
    }),
    200,
    'ADMIN completes procurement',
  );
  expectStatus(
    await request('POST', `/api/procurements/${lowCostProcurement._id}/import`, {
      token: adminToken,
    }),
    200,
    'ADMIN imports completed procurement into equipment inventory',
  );
  const importedEquipments = await Equipment.find({ name: 'Máy in laser' }).lean();
  assert.equal(importedEquipments.length, 2, 'procurement import creates one equipment per quantity');

  expectStatus(
    await request('POST', '/api/maintenance-plans', {
      token: userToken,
      body: {
        title: 'Không được tạo bảo dưỡng',
        period: '2026',
        items: [{ equipmentCode: equipment.code, equipmentName: equipment.name, content: 'Kiểm tra' }],
      },
    }),
    403,
    'USER cannot create maintenance plan',
  );

  const maintenancePlan = expectStatus(
    await request('POST', '/api/maintenance-plans', {
      token: adminToken,
      body: {
        title: `Kế hoạch bảo dưỡng E2E ${runId}`,
        period: 'Quý II/2026',
        items: [{ equipmentCode: equipment.code, equipmentName: equipment.name, content: 'Vệ sinh và kiểm tra nguồn' }],
      },
    }),
    201,
    'ADMIN creates maintenance plan',
  );
  expectStatus(
    await request('PUT', `/api/maintenance-plans/${maintenancePlan._id}`, {
      token: adminToken,
      body: { status: S.waitingApproval },
    }),
    200,
    'ADMIN submits maintenance plan',
  );
  expectStatus(
    await request('PUT', `/api/maintenance-plans/${maintenancePlan._id}`, {
      token: directorToken,
      body: { status: S.directorApproved },
    }),
    200,
    'DIRECTOR approves maintenance plan',
  );
  expectStatus(
    await request('PUT', `/api/maintenance-plans/${maintenancePlan._id}`, {
      token: adminToken,
      body: { status: S.maintenanceDone },
    }),
    200,
    'ADMIN completes maintenance plan',
  );

  const inventoryAudit = expectStatus(
    await request('POST', '/api/inventory/audits', {
      token: adminToken,
      body: {
        title: `Kiểm kê E2E ${runId}`,
        period: '2026',
        department: deptA,
        items: [{
          equipmentCode: equipment.code,
          equipmentName: equipment.name,
          department: deptA,
          actualStatus: S.poor,
          condition: 35,
          note: 'Thiết bị xuống cấp',
          recommendation: 'Thanh lý',
        }],
      },
    }),
    201,
    'ADMIN creates inventory audit',
  );
  expectStatus(
    await request('PUT', `/api/inventory/audits/${inventoryAudit._id}`, {
      token: adminToken,
      body: { status: S.completed },
    }),
    200,
    'ADMIN completes inventory audit',
  );
  expectStatus(
    await request('PUT', `/api/inventory/audits/${inventoryAudit._id}`, {
      token: adminToken,
      body: { status: S.completed },
    }),
    400,
    'completed inventory audit cannot be completed twice',
  );

  const equipmentAfterAudit = await Equipment.findOne({ code: equipment.code }).lean();
  assert.equal(equipmentAfterAudit.status, S.poor, 'inventory audit updates equipment status');
  assert.equal(equipmentAfterAudit.condition, 35, 'inventory audit updates equipment condition');
  assert.ok(equipmentAfterAudit.history.some((event) => event.type === 'Kiểm kê'), 'equipment history includes inventory event');

  const disposal = expectStatus(
    await request('POST', '/api/inventory/disposals', {
      token: adminToken,
      body: {
        equipmentCode: equipment.code,
        equipmentName: equipment.name,
        department: deptA,
        reason: 'Thanh lý sau kiểm kê E2E',
      },
    }),
    201,
    'ADMIN creates disposal request',
  );
  expectStatus(
    await request('PUT', `/api/inventory/disposals/${disposal._id}`, {
      token: userToken,
      body: { status: S.directorApproved },
    }),
    403,
    'USER cannot update disposal request',
  );
  expectStatus(
    await request('PUT', `/api/inventory/disposals/${disposal._id}`, {
      token: directorToken,
      body: { status: S.directorApproved },
    }),
    200,
    'DIRECTOR approves disposal request',
  );
  expectStatus(
    await request('PUT', `/api/inventory/disposals/${disposal._id}`, {
      token: directorToken,
      body: { status: S.disposed },
    }),
    400,
    'DIRECTOR cannot complete disposal after approval',
  );
  expectStatus(
    await request('PUT', `/api/inventory/disposals/${disposal._id}`, {
      token: adminToken,
      body: { status: S.disposed },
    }),
    200,
    'ADMIN completes approved disposal request',
  );

  const equipmentAfterDisposal = await Equipment.findOne({ code: equipment.code }).lean();
  assert.equal(equipmentAfterDisposal.status, S.liquidated, 'disposal marks equipment as liquidated');
  assert.ok(equipmentAfterDisposal.history.some((event) => event.type === S.liquidated), 'equipment history includes disposal event');

  expectStatus(await request('GET', '/api/auditlogs', { token: userToken }), 403, 'USER cannot read audit logs');
  const auditLogs = expectStatus(await request('GET', '/api/auditlogs', { token: adminToken }), 200, 'ADMIN reads audit logs');
  assert.ok(auditLogs.length > 0, 'audit logs are written during workflow');

  expectStatus(await request('POST', '/api/upload'), 401, 'upload requires auth');
  expectStatus(await request('POST', '/api/upload', { token: adminToken }), 400, 'upload without file is rejected');
}

try {
  await run();
  console.log(`E2E PASS: ${dbName}`);
} catch (error) {
  console.error('E2E FAIL:', error);
  process.exitCode = 1;
} finally {
  try {
    if (mongoose.connection.readyState === 1 && /codex_e2e|test|e2e/i.test(mongoose.connection.db.databaseName)) {
      await mongoose.connection.dropDatabase().catch((error) => {
        console.error('E2E cleanup warning:', error.message);
      });
    }
  } finally {
    await mongoose.disconnect().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}
