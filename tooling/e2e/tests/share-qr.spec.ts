import { expect, test } from './fixtures';

/**
 * EVT-10, EVT-11 (docs/product/prd.md): "Chia sẻ & QR" page in Studio.
 * Creates and publishes a campaign via API, logs into Studio, checks channel links
 * and confirms that the print page renders the QR standee.
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
    name: 'Khai trương Share QR',
    slug,
    templateKey: 'spin-wheel',
    skinKey: 'grand-opening',
    brand: {
      primary: '#0F7C79',
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
    prizes: [{ id: 'p1', name: 'Cà phê muối', quantity: 100, valueVnd: 25_000 }],
    rules: {
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
      antiFraud: 'low',
    },
  };
}

let cookie = '';
let orgId = '';
let campaignId = '';
let slug = '';
let email = '';
const password = 'e2e-password-123';

async function newOrg() {
  const id = unique();
  email = `share-owner-${id}@test.playora.local`;
  const signUp = await authPost('/sign-up/email', {
    email,
    password,
    name: 'Share QR Owner',
  });
  const ownerCookie = signUp.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const org = (await (
    await authPost(
      '/organization/create',
      { name: `Share Org ${id}`, slug: `share-${id}` },
      ownerCookie,
    )
  ).json()) as { id: string };
  return { cookie: ownerCookie, orgId: org.id, id };
}

test.beforeAll(async () => {
  const owner = await newOrg();
  cookie = owner.cookie;
  orgId = owner.orgId;
  const id = owner.id;

  slug = `e2e-share-${id}`;
  const campaign = await apiCall<{ id: string }>(
    'POST',
    `/orgs/${orgId}/campaigns`,
    cookie,
    campaignBody(slug),
  );
  campaignId = campaign.id;
  await apiCall('POST', `/orgs/${orgId}/campaigns/${campaignId}/publish`, cookie);
});

test('opens share page, verifies ?ch=table-qr link and renders printable standee QR', async ({
  page,
}) => {
  test.setTimeout(90_000);

  // 1. Sign in to Studio
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orgs/${orgId}`));

  // 2. Open Share & QR page
  await page.goto(`/orgs/${orgId}/campaigns/${campaignId}/share`);
  await expect(page.getByTestId('campaign-share-page')).toBeVisible();

  // 3. Check preset channels and link with ?ch=table-qr
  await expect(page.getByTestId('share-channel-table-qr')).toBeVisible();
  await expect(page.getByTestId('share-channel-counter')).toBeVisible();
  await expect(page.getByTestId('share-channel-fanpage')).toBeVisible();
  await expect(page.getByTestId('share-channel-zalo')).toBeVisible();

  const tableQrLinkInput = page.getByTestId('channel-link-table-qr');
  await expect(tableQrLinkInput).toBeVisible();
  await expect(tableQrLinkInput).toHaveValue(new RegExp(`/${slug}\\?ch=table-qr$`));

  // 4. Check invite counter staff block
  await expect(page.getByTestId('invite-counter-staff')).toBeVisible();

  // 5. Open print page for standee format
  await page.goto(`/orgs/${orgId}/campaigns/${campaignId}/share/print?ch=table-qr&format=standee`);
  await expect(page.getByTestId('print-standee')).toBeVisible();
  await expect(page.getByTestId('print-qr-code').first()).toBeVisible();
  await expect(page.getByText('Quét để nhận quà').first()).toBeVisible();

  // 6. Check tent card print format renders
  await page.goto(`/orgs/${orgId}/campaigns/${campaignId}/share/print?ch=table-qr&format=tent`);
  await expect(page.getByTestId('print-tent')).toBeVisible();
  await expect(page.getByTestId('print-qr-code').first()).toBeVisible();
});
