import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

declare global {
  var redis: Redis | undefined;
}

const redis: Redis = global.redis || new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableOfflineQueue: true,
});

if (process.env.NODE_ENV !== 'production') {
  global.redis = redis;
}

export default redis;

export const REDIS_KEYS = {
  qrSession: (token: string) => `qr:session:${token}`,
  attendanceRateLimit: (studentId: string, date = 'today') => `attendance:ratelimit:${date}:${studentId}`,
  dashboardCache: (key: string) => `dashboard:cache:${key}`,
  activeQR: (classId: string) => `qr:active:${classId}`,
  reportCache: (key: string) => `report:cache:${key}`,
};

export const QR_EXPIRY = parseInt(process.env.QR_CODE_EXPIRY || '30');
export const RATE_LIMIT_WINDOW = parseInt(process.env.ATTENDANCE_RATE_LIMIT_SECONDS || '10');
