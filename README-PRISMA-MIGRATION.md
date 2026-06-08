# Prisma Runtime Migration

This package has been migrated from Mongoose runtime calls to Prisma Client.

## Important changes

- Runtime database access now uses `@/lib/prisma`.
- API route handlers use Prisma Client delegates such as `prisma.student`, `prisma.attendance`, `prisma.user`, etc.
- `models/` and `lib/mongodb.ts` were removed from the runtime.
- `MONGODB_URI` is no longer used by the application runtime.
- Use `DATABASE_URL` for Prisma MongoDB.

## Setup

```bash
cp .env.example .env.local
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Seed demo data:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Docker

The Dockerfile now runs `npm install`, `npx prisma generate`, and `npm run build`.

```bash
docker compose up -d --build
```

## MongoDB note

Prisma is configured with the MongoDB connector:

```env
DATABASE_URL="mongodb://localhost:27017/smart_qr_attendance"
```

For production, use a secure MongoDB connection string and enable backups.
