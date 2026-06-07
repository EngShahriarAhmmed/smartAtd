import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

const redis: Redis = global.redis || new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

if (process.env.NODE_ENV !== 'production') {
  global.redis = redis;
}

export default redis;

// Key helpers
export const REDIS_KEYS = {
  qrSession: (token: string) => `qr:session:${token}`,
  attendanceRateLimit: (studentId: string) => `attendance:ratelimit:${studentId}`,
  dashboardCache: (date: string) => `dashboard:cache:${date}`,
  activeQR: (classId: string) => `qr:active:${classId}`,
};

export const QR_EXPIRY = parseInt(process.env.QR_CODE_EXPIRY || '30');
export const RATE_LIMIT_WINDOW = 60; // 60 seconds between marks
