import { expect, test } from './fixtures';

/**
 * J2 (docs/product/prd.md): a guest scans the table QR (`?ch=table-qr`), fills the form, plays,
 * gets a voucher code and finds it in "Quà của tôi"; the counter redeems it and the open sheet
 * flips to "Đã đổi". The campaign is created and published through the API so this spec only
 * drives the Play app.
 */

const API = 'http://localhost:4000';
const PLAY = 'http://localhost:3002';
const STUDIO_ORIGIN = 'http://localhost:3001';
const DAY = 86_400_000;

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function authPost(path: string, body: unknown, cookie?: string) {
  const res = await fetch(`${API}/auth${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: STUDIO_ORIGIN,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res;
}

async function apiCall<T>(method: string, path: string, cookie: string, body?: unknown) {
  const res = await fetch(`${API}/v1${path}`, {
    method,
    headers: {
      accept: 'application/json',
      origin: STUDIO_ORIGIN,
      cookie,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

const base = {
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  animation: { enter: 'none', delayMs: 0 },
};

const text = (id: string, content: string, y: number) => ({
  ...base,
  id,
  type: 'text',
  name: id,
  x: 20,
  y,
  w: 335,
  h: 48,
  content,
  font: 'heading',
  fontSize: 28,
  fontWeight: 800,
  color: 'brand.text',
  align: 'center',
  lineHeight: 1.2,
});

const button = (id: string, label: string, action: string, y: number) => ({
  ...base,
  id,
  type: 'button',
  name: id,
  x: 60,
  y,
  w: 255,
  h: 56,
  label,
  action,
  background: 'brand.primary',
  color: '#FFFFFF',
  radius: 28,
  fontSize: 18,
});

const screen = (elements: unknown[]) => ({
  height: 750,
  background: { color: 'brand.background' },
  elements,
});

function campaignBody(slug: string) {
  const now = Date.now();
  return {
    name: 'Khai trương e2e',
    slug,
    templateKey: 'spin-wheel',
    skinKey: 'grand-opening',
    brand: {
      primary: '#D7263D',
      accent: '#F4B400',
      background: '#FFF8E7',
      text: '#1F1F1F',
      surface: '#FFFFFF',
    },
    screens: {
      cover: screen([
        text('cover-title', 'VÒNG QUAY KHAI TRƯƠNG', 120),
        button('cover-start', 'CHƠI NGAY', 'start', 560),
      ]),
      form: screen([
        text('form-title', 'Để lại thông tin', 60),
        {
          ...base,
          id: 'form',
          type: 'form',
          name: 'form',
          x: 24,
          y: 140,
          w: 327,
          h: 300,
          color: 'brand.text',
        },
        button('form-next', 'TIẾP TỤC', 'next', 560),
      ]),
      game: screen([
        { ...base, id: 'stage', type: 'gameStage', name: 'stage', x: 20, y: 120, w: 335, h: 335 },
      ]),
      resultWin: screen([
        text('win-title', 'CHÚC MỪNG!', 80),
        text('win-prize', '{prize.name}', 140),
      ]),
      resultLose: screen([
        text('lose-title', 'Chúc bạn may mắn lần sau', 120),
        button('lose-again', 'CHƠI LẠI', 'next', 560),
      ]),
    },
    prizes: [{ id: 'p1', name: 'Ly cà phê muối', quantity: 100, valueVnd: 20_000 }],
    rules: {
      // Everyone wins, all day, no pacing: the play below is deterministic.
      mode: 'guaranteed',
      overallWinRate: 1,
      playsPerDay: 2,
      maxWinsPerPlayer: 5,
      startsAt: new Date(now - DAY).toISOString(),
      endsAt: new Date(now + 7 * DAY).toISOString(),
      openingHours: null,
      pacing: false,
      budgetVnd: null,
      collectForm: true,
    },
  };
}

let cookie = '';
let orgId = '';
let campaignId = '';
let slug = '';

test.beforeAll(async () => {
  const id = unique();
  const signUp = await authPost('/sign-up/email', {
    email: `play-${id}@test.playora.local`,
    password: 'e2e-password-123',
    name: 'Play Owner',
  });
  cookie = signUp.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const org = (await (
    await authPost('/organization/create', { name: `Play Org ${id}`, slug: `play-${id}` }, cookie)
  ).json()) as { id: string };
  orgId = org.id;

  slug = `e2e-play-${id}`;
  const campaign = await apiCall<{ id: string }>(
    'POST',
    `/orgs/${orgId}/campaigns`,
    cookie,
    campaignBody(slug),
  );
  campaignId = campaign.id;
  await apiCall('POST', `/orgs/${orgId}/campaigns/${campaignId}/publish`, cookie);
});

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('guest plays a published campaign from the table QR and finds the voucher in Quà của tôi', async ({
  page,
}) => {
  test.setTimeout(90_000);

  await page.goto(`${PLAY}/${slug}?ch=table-qr`);
  await page.getByRole('button', { name: 'CHƠI NGAY' }).click();

  // Form screen: name, phone and the campaign's own required consent.
  await page.getByRole('textbox').nth(0).fill('Khách E2E');
  await page.getByRole('textbox').nth(1).fill('0912 345 678');
  await page.getByRole('checkbox').first().check({ force: true });
  await page.getByRole('button', { name: 'TIẾP TỤC' }).click();

  await page.getByRole('button', { name: /chạm để quay/i }).click();
  await expect(page.getByText('CHÚC MỪNG!')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Ly cà phê muối').first()).toBeVisible();

  const codeEl = page.getByTestId('voucher-code');
  await expect(codeEl).toBeVisible();
  const code = ((await codeEl.textContent()) ?? '').trim();
  expect(code).toMatch(/^[A-Z0-9]{4,32}$/);
  await expect(page.getByTestId('turns-left')).toHaveText('Còn 1 lượt');

  // The play is attributed to the channel from the link.
  const plays = await apiCall<{ items: { channel: string | null; voucherCode: string | null }[] }>(
    'GET',
    `/orgs/${orgId}/campaigns/${campaignId}/plays`,
    cookie,
  );
  expect(plays.items.find((p) => p.voucherCode === code)?.channel).toBe('table-qr');

  // Quà của tôi: the code, its live status and a running clock (anti-screenshot).
  await page.getByRole('button', { name: 'Quà của tôi' }).first().click();
  const sheet = page.locator('.ant-drawer-content').filter({ hasText: 'Quà của tôi' });
  const row = sheet.getByTestId('voucher-row').filter({ hasText: code });
  await expect(row).toHaveAttribute('data-status', 'issued');
  await expect(row.getByText('Chưa đổi')).toBeVisible();
  await expect(sheet.getByTestId('voucher-live-clock')).toBeVisible();

  // The counter redeems it; the open sheet polls and flips to "Đã đổi".
  await apiCall('POST', `/orgs/${orgId}/vouchers/${code}/redeem`, cookie);
  await expect(row).toHaveAttribute('data-status', 'redeemed', { timeout: 25_000 });
  await expect(row.getByText('Đã đổi')).toBeVisible();

  // The standalone page shows the same list.
  await page.goto(`${PLAY}/${slug}/prizes`);
  await expect(page.getByRole('heading', { name: 'Quà của tôi' })).toBeVisible();
  await expect(page.getByTestId('voucher-row').filter({ hasText: code })).toHaveAttribute(
    'data-status',
    'redeemed',
  );

  // Back on the game, the stored session skips the form.
  await page.goto(`${PLAY}/${slug}`);
  await page.getByRole('button', { name: 'CHƠI NGAY' }).click();
  await expect(page.getByRole('button', { name: /chạm để quay/i })).toBeVisible();
});

test('unknown campaign slug is a 404', async ({ page }) => {
  const res = await page.goto(`${PLAY}/khong-ton-tai-${unique()}`);
  expect(res?.status()).toBe(404);
});
