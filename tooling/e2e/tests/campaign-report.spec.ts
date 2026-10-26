import { expect, test } from './fixtures';

/**
 * J4 (`docs/product/prd.md`, `PLB-03`, `PLB-04`, `ANL-01`, `docs/product/specs/playbooks.md` §3):
 * creates and publishes a campaign through the API (`antiFraud: 'low'`), plays once via the public
 * API (`join` + `plays` with `fetch`), redeems the voucher at the counter, then signs in to Studio
 * and verifies both the Campaign Overview and the one-page printable report show `Khách tới quầy = 1`.
 */

const API = 'http://localhost:4000';
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
    name: 'Tết Lộc Đầu Xuân E2E',
    slug,
    playbook: 'tet_traffic',
    templateKey: 'spin-wheel',
    skinKey: 'tet',
    brand: {
      primary: '#D7263D',
      accent: '#F4B400',
      background: '#FFF8E7',
      text: '#1F1F1F',
      surface: '#FFFFFF',
    },
    screens: {
      cover: screen([
        text('cover-title', 'LỘC ĐẦU XUÂN', 120),
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
      mode: 'guaranteed',
      overallWinRate: 1,
      playsPerDay: 2,
      maxWinsPerPlayer: 5,
      startsAt: new Date(now - DAY).toISOString(),
      endsAt: new Date(now + 7 * DAY).toISOString(),
      openDays: null,
      openingHours: null,
      pacing: false,
      budgetVnd: 500_000,
      collectForm: false,
      requireRedeemBeforeReplay: false,
      antiFraud: 'low',
    },
  };
}

test('outcome Overview and one-page report reflect redeemed visit (`Khách tới quầy = 1`)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const id = unique();
  const email = `report-${id}@test.playora.local`;
  const password = 'e2e-password-123';

  const signUp = await authPost('/sign-up/email', {
    email,
    password,
    name: 'Report Owner',
  });
  const cookie = signUp.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const org = (await (
    await authPost(
      '/organization/create',
      { name: `Report Org ${id}`, slug: `report-${id}` },
      cookie,
    )
  ).json()) as { id: string };
  const orgId = org.id;

  const slug = `e2e-report-${id}`;
  const campaign = await apiCall<{ id: string }>(
    'POST',
    `/orgs/${orgId}/campaigns`,
    cookie,
    campaignBody(slug),
  );
  const campaignId = campaign.id;
  await apiCall('POST', `/orgs/${orgId}/campaigns/${campaignId}/publish`, cookie);

  // Join and play once via the public API.
  const joinRes = await fetch(`${API}/v1/p/${slug}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId: crypto.randomUUID() }),
  });
  expect(joinRes.ok).toBe(true);
  const { playerToken } = (await joinRes.json()) as { playerToken: string };

  const playRes = await fetch(`${API}/v1/p/${slug}/plays`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${playerToken}`,
    },
    body: JSON.stringify({ requestId: crypto.randomUUID(), channel: 'table-qr' }),
  });
  expect(playRes.ok).toBe(true);
  const playData = (await playRes.json()) as {
    outcome: string;
    voucher: { code: string } | null;
  };
  expect(playData.outcome).toBe('win');
  const code = playData.voucher?.code ?? '';
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  // Redeem the voucher at the counter.
  await apiCall('POST', `/orgs/${orgId}/vouchers/${code}/redeem`, cookie);

  // Sign in to Studio and open the Campaign Overview.
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+$/);

  await page.goto(`/orgs/${orgId}/campaigns/${campaignId}`);
  await expect(page.getByTestId('playbook-highlight')).toContainText('Đông khách hơn dịp Tết');

  const overviewVisits = page.getByTestId('metric-visits');
  await expect(overviewVisits).toContainText('Khách tới quầy');
  await expect(overviewVisits).toContainText('1');

  await expect(page.getByTestId('metric-prize-cost')).toContainText('20.000 đ / 500.000 đ');
  await expect(page.getByTestId('metric-cost-per-visit')).toContainText('20.000 đ');
  await expect(page.getByTestId('daily-outcome-chart')).toBeVisible();
  await expect(page.getByTestId('channel-table')).toContainText('QR tại bàn');
  await expect(page.getByTestId('prize-stock')).toContainText('Ly cà phê muối');
  await expect(page.getByTestId('prize-stock')).toContainText('Đã phát 1 · đã đổi 1');

  // Navigate to the one-page printable report.
  await page.getByRole('button', { name: 'Xem báo cáo' }).click();
  await expect(page).toHaveURL(`/orgs/${orgId}/campaigns/${campaignId}/report`);

  await expect(page.getByTestId('campaign-one-page-report')).toBeVisible();
  const reportVisits = page.getByTestId('metric-visits');
  await expect(reportVisits).toContainText('Khách tới quầy');
  await expect(reportVisits).toContainText('1');

  await expect(page.getByTestId('report-insights')).toBeVisible();
  await expect(page.getByTestId('report-insight-item')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'In / Lưu PDF' })).toBeVisible();
});
