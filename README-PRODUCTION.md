# Smart QR Attendance & Class Monitoring System

## Local Development

```bash
cp .env.example .env.local
docker compose up -d mongo redis
npm install
npm run dev
```

Open `http://localhost:3000`.

Seed demo admin:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Production Docker

Create `.env.production` from `.env.example`, then:

```bash
docker compose up -d --build
```

## Important Routes

- `/login`
- `/admin`
- `/admin/students`
- `/admin/attendance`
- `/admin/qr`
- `/api/attendance/scan`
- `/api/reports/attendance/export?date=YYYY-MM-DD&type=xlsx`

## Security Checklist

- Set strong `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `QR_ENCRYPTION_SECRET`.
- Use HTTPS in production for camera access and PWA installability.
- Disable public seed route after first setup.
- Configure SMS/email providers before enabling notifications.
- Use institution scoping for all production tenants.
