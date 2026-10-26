/**
 * Creates and publishes an anonymous campaign for `play.js` and prints its slug.
 *
 *   API=http://localhost:4100 bun tooling/loadtest/seed-campaign.ts
 *
 * The campaign uses the `low` anti-fraud level (no captcha) and enough stock and turns that the
 * run measures the play path, not empty stock.
 */
const API = process.env.API ?? 'http://localhost:4000';
const ORIGIN = process.env.STUDIO_ORIGIN ?? 'http://localhost:3001';
const DAY = 86_400_000;
const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function call(path: string, cookie: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res;
}

const screen = (elements: unknown[]) => ({
  height: 750,
  background: { color: 'brand.background' },
  elements,
});
const stage = {
  id: 'stage',
  type: 'gameStage',
  name: 'stage',
  x: 20,
  y: 120,
  w: 335,
  h: 335,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  animation: { enter: 'none', delayMs: 0 },
};

const signUp = await call('/auth/sign-up/email', '', {
  email: `load-${id}@test.playora.local`,
  password: 'load-password-123',
  name: 'Load Owner',
});
const cookie = signUp.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ');
const org = (await (
  await call('/auth/organization/create', cookie, { name: `Load ${id}`, slug: `load-${id}` })
).json()) as { id: string };

const now = Date.now();
const campaign = (await (
  await call(`/v1/orgs/${org.id}/campaigns`, cookie, {
    name: 'Load test',
    slug: `load-${id}`,
    templateKey: 'spin-wheel',
    skinKey: 'everyday',
    brand: {
      primary: '#D7263D',
      accent: '#F4B400',
      background: '#FFF8E7',
      text: '#1F1F1F',
      surface: '#FFFFFF',
    },
    screens: {
      cover: screen([]),
      form: screen([]),
      game: screen([stage]),
      resultWin: screen([]),
      resultLose: screen([]),
    },
    prizes: [
      { id: 'p1', name: 'Cà phê', quantity: 100_000, valueVnd: 20_000 },
      { id: 'p2', name: 'Voucher', quantity: 20_000, valueVnd: 50_000 },
    ],
    rules: {
      mode: 'overall_win_rate',
      overallWinRate: 0.2,
      playsPerDay: 5,
      maxWinsPerPlayer: 5,
      startsAt: new Date(now - DAY).toISOString(),
      endsAt: new Date(now + 7 * DAY).toISOString(),
      openingHours: null,
      pacing: false,
      budgetVnd: null,
      collectForm: false,
      antiFraud: 'low',
    },
  })
).json()) as { id: string; slug: string };
await call(`/v1/orgs/${org.id}/campaigns/${campaign.id}/publish`, cookie);
console.log(campaign.slug);
