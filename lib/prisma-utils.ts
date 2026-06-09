import type { JWTPayload } from '@/lib/auth';

export type PrismaRecord = Record<string, unknown> & { id?: string };

export function withMongoId<T extends PrismaRecord | null>(record: T): T extends null ? null : T & { _id?: string } {
  if (!record) return null as T extends null ? null : T & { _id?: string };
  return { ...record, _id: record.id } as T extends null ? null : T & { _id?: string };
}

export function withMongoIds<T extends PrismaRecord>(records: T[]) {
  return records.map((record) => withMongoId(record));
}

export function tenantWhere(auth?: JWTPayload | null) {
  return auth?.institutionId ? { institutionId: auth.institutionId } : {};
}

export function notDeletedWhere() {
  return { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };
}

export function deletedOnlyWhere() {
  return { deletedAt: { not: null } };
}

export function deletionScope(showDeleted: boolean) {
  return showDeleted ? deletedOnlyWhere() : notDeletedWhere();
}

export function safeDeleteData(auth?: JWTPayload | null, inactiveData: Record<string, unknown> = {}) {
  return {
    ...inactiveData,
    deletedAt: new Date(),
    deletedBy: auth?.userId || null,
  };
}

export function restoreData(activeData: Record<string, unknown> = {}) {
  return {
    ...activeData,
    deletedAt: null,
    deletedBy: null,
  };
}

export function duplicateError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}

export function toJsonValue(value: unknown) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}
