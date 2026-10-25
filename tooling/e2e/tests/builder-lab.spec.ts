import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('builder lab: create from template → set rules → publish → play on a phone → redeem at the counter (docs/15 prototype)', async ({
  page,
  context,
}) => {
  const id = unique();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Lab Owner');
  await page.getByLabel('Email').fill(`lab-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Lab Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  const org = new URL(page.url()).pathname;

  // Labs is hidden from the sidebar in production builds, so open it by URL.
  await page.goto(`${org}/labs/builder`);

  // Template gallery → new campaign.
  await page.getByText('Vòng quay may mắn').first().click();
  await page.getByRole('textbox', { name: 'Tên campaign' }).fill('Vòng quay e2e');
  await page.getByRole('button', { name: 'Tạo campaign' }).click();
  await expect(page).toHaveURL(/\/labs\/builder\/[0-9a-f-]{36}$/);

  // Quick edit: the title slot drives the preview.
  await page.getByRole('textbox', { name: 'Tiêu đề' }).fill('QUAY NGAY');
  await expect(page.getByText('QUAY NGAY').first()).toBeVisible();

  // Rules: everyone wins, no pacing or opening hours, so the play below is deterministic.
  await page.locator('.ant-segmented-item', { hasText: 'Luật & giải' }).first().click();
  await page.getByRole('radio', { name: /Ai chơi cũng có quà/ }).click({ force: true });
  await page.getByRole('switch', { name: 'Rải đều quà' }).click();
  await page.getByRole('switch', { name: 'Chỉ phát quà trong khung giờ' }).click();

  // Pre-flight passes; publish shows the share panel.
  await page.getByRole('button', { name: 'Publish' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Publish' }).click();
  await expect(dialog.getByText('Đã publish v1')).toBeVisible();
  const live = await dialog
    .locator('a[href*="/labs/play/"]:not([href*="rehearsal"])')
    .first()
    .getAttribute('href');
  expect(live).toBeTruthy();

  // A player on a phone.
  const phone = await context.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(live ?? '');
  await phone.getByRole('button', { name: 'CHƠI NGAY' }).click();
  await phone.getByRole('textbox').nth(0).fill('Khách E2E');
  await phone.getByRole('textbox').nth(1).fill('0912345678');
  await phone.getByRole('checkbox').first().check({ force: true });
  await phone.getByRole('button', { name: 'TIẾP TỤC' }).click();
  await phone.getByRole('button', { name: /chạm để quay/i }).click();
  await expect(phone.getByText('CHÚC MỪNG!')).toBeVisible({ timeout: 15_000 });
  const code = (await phone.locator('body').innerText()).match(/\b[A-HJ-NP-Z2-9]{6}\b/)?.[0];
  expect(code).toBeTruthy();

  // Staff redeems it once.
  const desk = await context.newPage();
  await desk.goto(`${org}/labs/redeem?code=${code}`);
  await desk.getByRole('button', { name: /Xác nhận đổi quà/ }).click();
  await desk.getByRole('dialog').getByRole('button').last().click();
  await expect(desk.getByText('Đổi quà thành công')).toBeVisible();
});
