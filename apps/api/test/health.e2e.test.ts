import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { HealthLivenessResponse, HealthReadyResponse, publicApi } from '@playora/contracts';
import { type Database, latestMigration } from '@playora/db';
import type { Redis } from 'ioredis';
import { DB, REDIS } from '../src/infra/tokens';
import { checkReadiness } from '../src/modules/health/health.controller';
import { createTestApp, type TestApp } from './create-test-app';

let t: TestApp;
let db: Database;
let redis: Redis;

beforeAll(async () => {
  t = await createTestApp();
  db = t.app.get(DB);
  redis = t.app.get(REDIS);
});

afterAll(() => t?.close());

describe('health & readiness endpoints', () => {
  test('GET /v1/health returns 200 and liveness shape', async () => {
    const res = await fetch(`${t.baseUrl}/v1/health`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as unknown;
    const parsed = HealthLivenessResponse.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('ok');
      expect(typeof parsed.data.uptimeSec).toBe('number');
      expect(parsed.data.uptimeSec).toBeGreaterThanOrEqual(0);
    }

    // Also via typed api client
    const clientData = await t.client().call(publicApi.health);
    expect(clientData.status).toBe('ok');
    expect(typeof clientData.uptimeSec).toBe('number');
  });

  test('GET /v1/health/ready returns 200 and full readiness shape when dependencies are healthy', async () => {
    const res = await fetch(`${t.baseUrl}/v1/health/ready`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as unknown;
    const parsed = HealthReadyResponse.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('ok');
      expect(parsed.data.db).toBe('ok');
      expect(parsed.data.redis).toBe('ok');
      expect(parsed.data.migrations.status).toBe('ok');
      const latest = latestMigration();
      expect(parsed.data.migrations.latestJournal).toBe(latest?.tag);
    }

    // Also via typed api client
    const clientData = await t.client().call(publicApi.ready);
    expect(clientData.status).toBe('ok');
    expect(clientData.db).toBe('ok');
    expect(clientData.redis).toBe('ok');
    expect(clientData.migrations.status).toBe('ok');
  });

  describe('checkReadiness pure function', () => {
    test('reports missing migration and isReady: false when given unapplied migration', async () => {
      const result = await checkReadiness(db, redis, {
        tag: '9999_unapplied_migration',
        when: 9999999999999,
      });
      expect(result.isReady).toBe(false);
      expect(result.response.status).toBe('down');
      expect(result.response.db).toBe('ok');
      expect(result.response.redis).toBe('ok');
      expect(result.response.migrations.status).toBe('missing');
      expect(result.response.migrations.latestJournal).toBe('9999_unapplied_migration');
    });

    test('reports redis: down and isReady: false when redis ping fails', async () => {
      const mockRedis = {
        ping: async () => {
          throw new Error('Connection refused');
        },
      } as unknown as Redis;

      const result = await checkReadiness(db, mockRedis);
      expect(result.isReady).toBe(false);
      expect(result.response.status).toBe('down');
      expect(result.response.redis).toBe('down');
    });

    test('reports db: down and isReady: false when db query fails', async () => {
      const mockDb = {
        execute: async () => {
          throw new Error('DB connection lost');
        },
      } as unknown as Database;

      const result = await checkReadiness(mockDb, redis);
      expect(result.isReady).toBe(false);
      expect(result.response.status).toBe('down');
      expect(result.response.db).toBe('down');
      expect(result.response.migrations.status).toBe('down');
    });

    test('reports migrations: missing when migrations table has no matching row', async () => {
      const mockDb = {
        execute: async (query: unknown) => {
          const str = String(query);
          if (str.includes('select 1')) return [{ ok: 1 }];
          return [];
        },
      } as unknown as Database;

      const result = await checkReadiness(mockDb, redis, {
        tag: '0001_initial',
        when: 123456789,
      });
      expect(result.isReady).toBe(false);
      expect(result.response.status).toBe('down');
      expect(result.response.db).toBe('ok');
      expect(result.response.migrations.status).toBe('missing');
    });
  });
});
