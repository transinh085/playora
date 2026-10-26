import { afterAll, beforeAll, describe, expect, type Mock, spyOn, test } from 'bun:test';
import { ApiError, createApiClient } from '@playora/api-client';
import {
  type Campaign,
  type CampaignRulesInput,
  campaignsApi,
  ErrorCode,
  playsApi,
  publicApi,
} from '@playora/contracts';
import { ANTI_FRAUD_LIMITS } from '../src/common/anti-fraud/anti-fraud.service';
import { TURNSTILE_VERIFIER, type TurnstileVerifier } from '../src/common/anti-fraud/turnstile';
import { campaignBody } from './campaign-fixtures';
import { createOrg, createTestApp, signUp, type TestApp } from './create-test-app';

let t: TestApp;
let alice: string;
let aliceOrg: string;
let verify: Mock<TurnstileVerifier['verify']>;

/** Fake Turnstile: the token `pass` is valid, anything else is not. No network. */
beforeAll(async () => {
  t = await createTestApp({
    TURNSTILE_SITE_KEY: 'test-site-key',
    TURNSTILE_SECRET_KEY: 'test-secret-key',
  });
  const verifier = t.app.get<TurnstileVerifier>(TURNSTILE_VERIFIER);
  verify = spyOn(verifier, 'verify').mockImplementation(async (token) => token === 'pass');
  alice = await signUp(t.baseUrl, 'Alice');
  aliceOrg = await createOrg(t.baseUrl, alice);
});

afterAll(() => t?.close());

async function expectApiError(promise: Promise<unknown>, status: number, code: ErrorCode) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status, code });
}

async function createCampaign(rules: Partial<CampaignRulesInput>): Promise<Campaign> {
  const api = t.client(alice);
  const base = campaignBody();
  const created = await api.call(campaignsApi.create, {
    params: { orgId: aliceOrg },
    body: campaignBody({
      rules: {
        ...base.rules,
        mode: 'overall_win_rate',
        overallWinRate: 0,
        collectForm: false,
        ...rules,
      },
    }),
  });
  return api.call(campaignsApi.publish, { params: { orgId: aliceOrg, campaignId: created.id } });
}

const client = (token?: string) =>
  createApiClient({
    baseUrl: t.baseUrl,
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });

function join(slug: string, deviceId: string = crypto.randomUUID()) {
  return client().call(publicApi.join, { params: { slug }, body: { deviceId } });
}

async function joined(slug: string) {
  const res = await join(slug);
  return client(res.playerToken);
}

function play(api: ReturnType<typeof client>, slug: string, captchaToken?: string) {
  return api.call(playsApi.play, {
    params: { slug },
    body: { requestId: crypto.randomUUID(), ...(captchaToken ? { captchaToken } : {}) },
  });
}

describe('anti-fraud "Chuẩn" (EVT-13)', () => {
  test('Turnstile: required once per player session on standard, never on low', async () => {
    const c = await createCampaign({ antiFraud: 'standard', playsPerDay: 5 });
    const pub = await client().call(playsApi.campaign, { params: { slug: c.slug } });
    expect(pub.captchaSiteKey).toBe('test-site-key');

    const api = await joined(c.slug);
    verify.mockClear();
    await expectApiError(play(api, c.slug), 403, ErrorCode.CAPTCHA_REQUIRED);
    await expectApiError(play(api, c.slug, 'wrong'), 403, ErrorCode.CAPTCHA_REQUIRED);
    expect((await play(api, c.slug, 'pass')).outcome).toBe('lose');
    // The solved challenge is remembered: no token needed, no second verification.
    expect((await play(api, c.slug)).outcome).toBe('lose');
    expect(verify).toHaveBeenCalledTimes(2);
    // Refused plays did not use turns.
    expect((await api.call(playsApi.me, { params: { slug: c.slug } })).turnsLeftToday).toBe(3);

    // Another player of the same campaign solves their own challenge.
    const other = await joined(c.slug);
    await expectApiError(play(other, c.slug), 403, ErrorCode.CAPTCHA_REQUIRED);

    const low = await createCampaign({ antiFraud: 'low' });
    expect(
      (await client().call(playsApi.campaign, { params: { slug: low.slug } })).captchaSiteKey,
    ).toBeNull();
    expect((await play(await joined(low.slug), low.slug)).outcome).toBe('lose');
  });

  test('429 once one player plays faster than the standard limit; low has no per-player limit', async () => {
    const max = ANTI_FRAUD_LIMITS.standard.playsPerPlayer;
    const c = await createCampaign({ antiFraud: 'standard', playsPerDay: 100 });
    const api = await joined(c.slug);
    expect((await play(api, c.slug, 'pass')).outcome).toBe('lose');
    for (let i = 1; i < max; i++) expect((await play(api, c.slug)).outcome).toBe('lose');
    await expectApiError(play(api, c.slug), 429, ErrorCode.RATE_LIMITED);

    const low = await createCampaign({ antiFraud: 'low', playsPerDay: 100 });
    const lowApi = await joined(low.slug);
    for (let i = 0; i <= max; i++) expect((await play(lowApi, low.slug)).outcome).toBe('lose');
  });

  test('429 on joins: per device and per IP on standard; low only limits the IP loosely', async () => {
    const { joinsPerDevice, joinsPerIp } = ANTI_FRAUD_LIMITS.standard;
    const c = await createCampaign({ antiFraud: 'standard' });
    const deviceId = crypto.randomUUID();
    for (let i = 0; i < joinsPerDevice; i++) await join(c.slug, deviceId);
    await expectApiError(join(c.slug, deviceId), 429, ErrorCode.RATE_LIMITED);

    const crowded = await createCampaign({ antiFraud: 'standard' });
    for (let i = 0; i < joinsPerIp; i++) await join(crowded.slug);
    await expectApiError(join(crowded.slug), 429, ErrorCode.RATE_LIMITED);

    const low = await createCampaign({ antiFraud: 'low' });
    const lowDevice = crypto.randomUUID();
    for (let i = 0; i <= joinsPerDevice; i++) await join(low.slug, lowDevice);
    for (let i = 0; i <= joinsPerIp; i++) await join(low.slug);
  });
});
