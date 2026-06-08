# Role Menu and ID Card Update

This package updates the Prisma runtime build with the following changes:

## Role-based menus

Settings are now visible only for:

- Super Admin
- Institution Admin / Admin

Teacher, Student and Parent menus no longer show Settings. Direct visits to `/teacher/settings`, `/student/settings`, and `/parent/settings` redirect back to the role dashboard.

## Completed role menu pages

The placeholder menu pages have been replaced with usable screens for:

- Admin classes and sections
- Admin subjects
- Admin periods
- Admin teachers
- Admin class sessions
- Admin corrections
- Admin reports
- Super Admin institutions
- Super Admin users
- Super Admin subscriptions
- Super Admin analytics
- Teacher scanner
- Teacher classes
- Teacher attendance history
- Teacher reports
- Student attendance
- Student subject-wise report
- Student history
- Student ID card
- Parent attendance
- Parent alerts
- Parent reports

## Improved student ID card and QR

The student ID card module now generates front and back sides:

- Institution branding
- Student photo fallback
- Name, ID, roll, class, section
- Secure QR on back side
- Print ID Card button
- Download QR button

The QR payload follows the security requirement:

```json
{ "token": "encrypted_token" }
```

It no longer stores or exposes name, phone, address, or other personal information in the QR payload.

## New APIs

- `GET /api/students/id-cards`
- `GET /api/student/id-card`
- `GET /api/student/summary`
- `GET /api/parent/children`
- `GET /api/teacher/summary`
- `GET /api/super-admin/users`
- `POST /api/super-admin/users`
- `GET /api/super-admin/overview`
- `GET /api/admin/sessions`
- `GET /api/admin/corrections`
- `GET /api/admin/settings`

## Seed fix

The seed route now uses idempotent upsert logic for Classes and Sections to prevent:

```text
Unique constraint failed on: sections_institutionId_classId_name_key
```
