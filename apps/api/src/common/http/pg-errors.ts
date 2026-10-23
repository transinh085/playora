/** Postgres SQLSTATE of an error thrown by postgres.js, also when wrapped by Drizzle. */
export function pgErrorCode(err: unknown): string | undefined {
  for (let e: unknown = err; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = '23505';
