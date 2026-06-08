# Smart QR Attendance & Class Monitoring System - Production Blueprint

This repository is a fixed and hardened foundation for a QR-based attendance system.

## Implemented Foundation

- Next.js full-stack App Router structure
- MongoDB/Prisma schemas for Institution, User, Student, Teacher, Class, Section, Subject, Period, Routine, Attendance, TeacherClassLog, AuditLog, Notification, AttendanceCorrection
- Optional Prisma MongoDB schema in `prisma/schema.prisma`
- JWT access token and refresh token support
- Role-based access helpers in `lib/rbac.ts`
- Secure QR token helper in `lib/qr-token.ts`
- Teacher camera scanner flow using `html5-qrcode`
- Per-period duplicate scan prevention
- Wrong class/section detection
- Attendance export as CSV/XLSX
- Student Excel upload endpoint alias `/api/students/upload`
- PWA support with manifest and service worker
- Docker, docker-compose and Nginx sample config

## Role Dashboard Direction

Current dashboard path `/admin` supports the existing admin/teacher layout. Expand with these route groups:

- `/super-admin` for institutions and subscriptions
- `/admin` for institution admin
- `/teacher` for teacher scanner and reports
- `/student` for student attendance and ID card
- `/parent` for parent view and notifications

## Multi-Tenant SaaS Upgrade

Most new schemas include `institutionId`. To enable strict multi-tenancy:

1. Add `institutionId` to every created user/student/teacher record.
2. Enforce `auth.institutionId` in all queries.
3. Allow `super_admin` to bypass institution filtering only for system-level pages.
4. Add subscription and plan models before billing.

## QR Security

Recommended QR content:

```json
{ "token": "encrypted_token" }
```

Never include name, phone, address or personal information in production QR codes. For legacy compatibility, existing QR pages may still generate richer payloads for demo use; switch to token-only before deployment.

## Important Migration Note

The original project used daily duplicate prevention. This fixed version changes attendance uniqueness to per student + date + class + section + subject + period. If your MongoDB already has the old index, drop it once:

```js
db.attendances.dropIndex("studentId_1_date_1")
```

Then restart the app so Prisma can push the new per-period index with `npx prisma db push`.
