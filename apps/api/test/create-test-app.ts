import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createApiClient } from '@playora/api-client';
import { prepareTestDatabase } from '@playora/db/testing';
import { apiEnvSchema, parseEnv } from '@playora/env';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';

export const TEST_ORIGIN = 'http://localhost:3001';

/** Boots the real API (same module + configureApp as production) on a random port against `<db>_test`. */
export async function createTestApp(envOverrides: Record<string, string> = {}) {
  const databaseUrl = await prepareTestDatabase(process.env.DATABASE_URL ?? '');
  const env = parseEnv(apiEnvSchema, {
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: databaseUrl,
    DATABASE_POOL_MAX: '4',
    RATE_LIMIT_PER_MIN: '100000',
    STUDIO_ORIGINS: TEST_ORIGIN,
    // No Turnstile unless a test opts in (with a fake verifier): tests never call Cloudflare.
    TURNSTILE_SITE_KEY: '',
    TURNSTILE_SECRET_KEY: '',
    ...envOverrides,
  });

  const app = await NestFactory.create(AppModule.forRoot(env), {
    bodyParser: false,
    bufferLogs: true,
    logger: false,
    // Surface init errors as test failures instead of process.exit(1).
    abortOnError: false,
  });
  configureApp(app, env);
  await app.listen(0);
  const baseUrl = (await app.getUrl()).replace('[::1]', 'localhost');

  return {
    app,
    baseUrl,
    /** Typed client acting as the given user (cookie from `signUp`). */
    client: (cookie?: string) =>
      createApiClient({ baseUrl, headers: cookie ? { cookie } : undefined }),
    close: () => app.close(),
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const uniqueEmail = () => `${unique()}@test.playora.local`;

async function authPost(baseUrl: string, path: string, body: unknown, cookie?: string) {
  const res = await fetch(`${baseUrl}/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: TEST_ORIGIN, ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res;
}

/** Signs up a fresh user and returns its session cookie. */
export async function signUp(baseUrl: string, name = 'Tester', email = uniqueEmail()) {
  const res = await authPost(baseUrl, '/sign-up/email', {
    email,
    password: 'test-password-123',
    name,
  });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!cookie) throw new Error('No session cookie returned by sign-up');
  return cookie;
}

/** Creates an organization through Better Auth; the creator becomes `owner`. */
export async function createOrg(baseUrl: string, cookie: string) {
  const slug = `org-${unique()}`;
  const res = await authPost(baseUrl, '/organization/create', { name: slug, slug }, cookie);
  const org = (await res.json()) as { id: string };
  return org.id;
}

export const uniqueSlug = (prefix = 'ev') => `${prefix}-${unique()}`;
