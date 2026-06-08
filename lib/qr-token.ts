import crypto from 'crypto';

const secret = process.env.QR_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'change-me-32-character-minimum-secret';

export function createOpaqueQrToken(rawToken: string) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(rawToken, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function readOpaqueQrToken(token: string) {
  try {
    const payload = Buffer.from(token, 'base64url');
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const key = crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function normalizeQrToken(tokenOrPayload: string) {
  try {
    const parsed = JSON.parse(tokenOrPayload);
    return parsed.token || parsed.qrToken || parsed.studentQrToken || null;
  } catch {
    return tokenOrPayload;
  }
}
