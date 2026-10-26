import { expect, test } from './fixtures';

/**
 * GAM-04: scratch card and gift box run on the real play API like the spin wheel (P2.6). Each
 * mechanism gets its own org (Free allows one running campaign) and a guaranteed-win campaign
 * without a form, so the only variable is how the guest plays.
 */

const API = 'http://localhost:4000';
const PLAY = 'http://localhost:3002';
const STUDIO_ORIGIN = 'http://localhost:3001';
const DAY = 86_400_000;

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function post(path: string, body: unknown, cookie = '') {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: STUDIO_ORIGIN, cookie },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res;
}

const element = {
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  animation: { enter: 'none', delayMs: 0 },
};
const screen = (elements: unknown[]) => ({
  height: 750,
  background: { color: 'brand.background' },
  elements,
});
const startButton = {
  ...element,
  id: 'start',
  type: 'button',
  name: 'start',
  x: 60,
  y: 560,
  w: 255,
  h: 56,
  label: 'CHƠI NGAY',
  action: 'start',
  background: 'brand.primary',
  color: '#FFFFFF',
  radius: 28,
  fontSize: 18,
};
const stage = {
  ...element,
  id: 'stage',
  type: 'gameStage',
  name: 'stage',
  x: 20,
  y: 120,
  w: 335,
  h: 335,
};
const winTitle = {
  ...element,
  id: 'win',
  type: 'text',
  name: 'win',
  x: 20,
  y: 80,
  w: 335,
  h: 48,
  content: 'CHÚC MỪNG!',
  font: 'heading',
  fontSize: 28,
  fontWeight: 800,
  color: 'brand.text',
  align: 'center',
  lineHeight: 1.2,
};

async function publishCampaign(templateKey: 'scratch-card' | 'gift-box') {
  const id = unique();
  const signUp = await post('/auth/sign-up/email', {
    email: `mech-${id}@test.playora.local`,
    password: 'e2e-password-123',
    name: 'Mechanism Owner',
  });
  const cookie = signUp.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const org = (await (
    await post('/auth/organization/create', { name: `Mech ${id}`, slug: `mech-${id}` }, cookie)
  ).json()) as { id: string };
  const now = Date.now();
  const campaign = (await (
    await post(
      `/v1/orgs/${org.id}/campaigns`,
      {
        name: `E2E ${templateKey}`,
        slug: `e2e-${templateKey}-${id}`,
        templateKey,
        skinKey: 'everyday',
        brand: {
          primary: '#D7263D',
          accent: '#F4B400',
          background: '#FFF8E7',
          text: '#1F1F1F',
          surface: '#FFFFFF',
        },
        screens: {
          cover: screen([startButton]),
          form: screen([]),
          game: screen([stage]),
          resultWin: screen([winTitle]),
          resultLose: screen([]),
        },
        prizes: [{ id: 'p1', name: 'Bánh quy bơ', quantity: 50, valueVnd: 15_000 }],
        rules: {
          mode: 'guaranteed',
          overallWinRate: 1,
          playsPerDay: 1,
          maxWinsPerPlayer: 1,
          startsAt: new Date(now - DAY).toISOString(),
          endsAt: new Date(now + 7 * DAY).toISOString(),
          openingHours: null,
          pacing: false,
          budgetVnd: null,
          collectForm: false,
          antiFraud: 'low',
        },
      },
      cookie,
    )
  ).json()) as { id: string; slug: string };
  await post(`/v1/orgs/${org.id}/campaigns/${campaign.id}/publish`, {}, cookie);
  return campaign.slug;
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('scratch card reveals the prize decided by the server and issues a code', async ({ page }) => {
  const slug = await publishCampaign('scratch-card');
  await page.goto(`${PLAY}/${slug}`);
  await page.getByRole('button', { name: 'CHƠI NGAY' }).click();
  // Keyboard reveal is the accessible path; it plays the same round as scratching.
  const card = page.getByRole('button', { name: /thẻ cào/i });
  await expect(card).toBeVisible();
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('CHÚC MỪNG!')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('voucher-code')).toHaveText(/^[A-Z0-9]{4,32}/);
});

test('gift box opens the chosen box onto the prize decided by the server', async ({ page }) => {
  const slug = await publishCampaign('gift-box');
  await page.goto(`${PLAY}/${slug}`);
  await page.getByRole('button', { name: 'CHƠI NGAY' }).click();
  await page.getByRole('button', { name: 'Hộp quà 2' }).click();
  await expect(page.getByText('CHÚC MỪNG!')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('voucher-code')).toHaveText(/^[A-Z0-9]{4,32}/);
});
