# Asset Management

Ứng dụng quản lý tài sản, sửa chữa, mua sắm, bảo dưỡng, kiểm kê và thanh lý thiết bị.

## Cấu trúc

- `backend`: Express, MongoDB/Mongoose, JWT auth.
- `frontend`: React, TypeScript, Vite.

## Chạy local

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Biến môi trường backend

Tạo `backend/.env` từ `backend/.env.example` và cấu hình:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `SEED_USER_PASSWORD`

## Kiểm thử

Backend E2E an toàn, tự tạo database test riêng và xóa sau khi chạy:

```bash
cd backend
npm run test:e2e
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```
