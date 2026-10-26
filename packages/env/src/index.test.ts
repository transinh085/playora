import { describe, expect, test } from 'bun:test';
import {
  apiEnvSchema,
  DEV_DEFAULT_PII_ENCRYPTION_KEY,
  DEV_DEFAULT_PII_HMAC_KEY,
  DEV_DEFAULT_S3_ACCESS_KEY,
  DEV_DEFAULT_S3_SECRET_KEY,
  parseEnv,
  workerEnvSchema,
} from './index';

const validBaseApiEnv = {
  DATABASE_URL: 'postgres://playora:playora@localhost:54329/playora',
  REDIS_URL: 'redis://localhost:63799',
  BETTER_AUTH_SECRET: '01234567890123456789012345678901',
  PLAYER_SESSION_SECRET: '01234567890123456789012345678901',
};

const prodPiiKeys = {
  PII_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  PII_HMAC_KEY: Buffer.alloc(32, 9).toString('base64'),
};

const validBaseWorkerEnv = {
  DATABASE_URL: 'postgres://playora:playora@localhost:54329/playora',
  REDIS_URL: 'redis://localhost:63799',
};

describe('apiEnvSchema', () => {
  test('accepts default dev S3 credentials in development and test', () => {
    const devParsed = apiEnvSchema.safeParse({
      ...validBaseApiEnv,
      NODE_ENV: 'development',
    });
    expect(devParsed.success).toBe(true);
    if (devParsed.success) {
      expect(devParsed.data.S3_ACCESS_KEY).toBe(DEV_DEFAULT_S3_ACCESS_KEY);
      expect(devParsed.data.S3_SECRET_KEY).toBe(DEV_DEFAULT_S3_SECRET_KEY);
    }

    const testParsed = apiEnvSchema.safeParse({
      ...validBaseApiEnv,
      NODE_ENV: 'test',
    });
    expect(testParsed.success).toBe(true);
  });

  test('rejects default dev S3 credentials when NODE_ENV is production', () => {
    // Implicit defaults
    const implicitResult = apiEnvSchema.safeParse({
      ...validBaseApiEnv,
      NODE_ENV: 'production',
    });
    expect(implicitResult.success).toBe(false);
    if (!implicitResult.success) {
      const paths = implicitResult.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('S3_ACCESS_KEY');
      expect(paths).toContain('S3_SECRET_KEY');
      const messages = implicitResult.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('S3_ACCESS_KEY') && m.includes('production'))).toBe(
        true,
      );
      expect(messages.some((m) => m.includes('S3_SECRET_KEY') && m.includes('production'))).toBe(
        true,
      );
    }

    // Explicit dev defaults
    const explicitResult = apiEnvSchema.safeParse({
      ...validBaseApiEnv,
      NODE_ENV: 'production',
      S3_ACCESS_KEY: DEV_DEFAULT_S3_ACCESS_KEY,
      S3_SECRET_KEY: DEV_DEFAULT_S3_SECRET_KEY,
    });
    expect(explicitResult.success).toBe(false);
  });

  test('accepts non-default S3 credentials in production', () => {
    const prodParsed = apiEnvSchema.safeParse({
      ...validBaseApiEnv,
      NODE_ENV: 'production',
      COOKIE_DOMAIN: '.playora.vn',
      S3_ACCESS_KEY: 'prod-access-key',
      S3_SECRET_KEY: 'prod-secret-key-complex-12345',
      ...prodPiiKeys,
    });
    expect(prodParsed.success).toBe(true);
    if (prodParsed.success) {
      expect(prodParsed.data.COOKIE_DOMAIN).toBe('.playora.vn');
      expect(prodParsed.data.S3_ACCESS_KEY).toBe('prod-access-key');
      expect(prodParsed.data.S3_SECRET_KEY).toBe('prod-secret-key-complex-12345');
    }
  });
});

describe('apiEnvSchema PII keys', () => {
  const prodS3 = { S3_ACCESS_KEY: 'prod-access-key', S3_SECRET_KEY: 'prod-secret-key' };

  test('uses dev defaults outside production', () => {
    const parsed = apiEnvSchema.parse({ ...validBaseApiEnv, NODE_ENV: 'test' });
    expect(parsed.PII_ENCRYPTION_KEY).toBe(DEV_DEFAULT_PII_ENCRYPTION_KEY);
    expect(parsed.PII_HMAC_KEY).toBe(DEV_DEFAULT_PII_HMAC_KEY);
    expect(parsed.PII_ENCRYPTION_KEY_ID).toBe('v1');
    expect(Buffer.from(parsed.PII_ENCRYPTION_KEY, 'base64')).toHaveLength(32);
  });

  test('rejects missing or dev-default PII keys in production', () => {
    const res = apiEnvSchema.safeParse({ ...validBaseApiEnv, NODE_ENV: 'production', ...prodS3 });
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('PII_ENCRYPTION_KEY');
      expect(paths).toContain('PII_HMAC_KEY');
    }
  });

  test('rejects keys of the wrong size', () => {
    const res = apiEnvSchema.safeParse({
      ...validBaseApiEnv,
      NODE_ENV: 'production',
      ...prodS3,
      PII_ENCRYPTION_KEY: Buffer.alloc(16, 7).toString('base64'),
      PII_HMAC_KEY: 'CHANGE_ME',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('PII_ENCRYPTION_KEY');
      expect(paths).toContain('PII_HMAC_KEY');
    }
  });

  test('accepts generated keys in production', () => {
    const res = apiEnvSchema.safeParse({
      ...validBaseApiEnv,
      NODE_ENV: 'production',
      ...prodS3,
      ...prodPiiKeys,
    });
    expect(res.success).toBe(true);
  });
});

describe('workerEnvSchema', () => {
  test('accepts default dev S3 credentials in development', () => {
    const devParsed = workerEnvSchema.safeParse({
      ...validBaseWorkerEnv,
      NODE_ENV: 'development',
    });
    expect(devParsed.success).toBe(true);
    if (devParsed.success) {
      expect(devParsed.data.S3_ACCESS_KEY).toBe(DEV_DEFAULT_S3_ACCESS_KEY);
    }
  });

  test('rejects default dev S3 credentials in production', () => {
    const result = workerEnvSchema.safeParse({
      ...validBaseWorkerEnv,
      NODE_ENV: 'production',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('S3_ACCESS_KEY');
      expect(paths).toContain('S3_SECRET_KEY');
    }
  });

  test('accepts custom S3 credentials in production', () => {
    const prodParsed = workerEnvSchema.safeParse({
      ...validBaseWorkerEnv,
      NODE_ENV: 'production',
      S3_ACCESS_KEY: 'worker-prod-key',
      S3_SECRET_KEY: 'worker-prod-secret',
    });
    expect(prodParsed.success).toBe(true);
  });
});

describe('parseEnv helper', () => {
  test('throws descriptive Error on validation failure in production', () => {
    expect(() =>
      parseEnv(apiEnvSchema, {
        ...validBaseApiEnv,
        NODE_ENV: 'production',
      }),
    ).toThrow(/S3_ACCESS_KEY.*production/);
  });

  test('returns parsed data on success', () => {
    const data = parseEnv(workerEnvSchema, {
      ...validBaseWorkerEnv,
      NODE_ENV: 'development',
    });
    expect(data.NODE_ENV).toBe('development');
  });
});
