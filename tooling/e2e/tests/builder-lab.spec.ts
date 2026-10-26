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

  await page.goto(`${org}/campaigns/new`);

  // Template gallery → new campaign.
  await page
    .getByRole('button', { name: /^Vòng quay may mắn · / })
    .first()
    .click();
  await page.getByRole('textbox', { name: 'Tên chương trình' }).fill('Vòng quay e2e');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Tạo chương trình', exact: true })
    .click();
  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}\/edit$/);

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
    .locator('a[href*="/play/"]:not([href*="rehearsal"])')
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
  await desk.goto(`${org}/redeem?code=${code}`);
  await desk.getByRole('button', { name: /Xác nhận đổi quà/ }).click();
  await desk.getByRole('dialog').getByRole('button').last().click();
  await expect(desk.getByText('Đổi quà thành công')).toBeVisible();

  // The campaign shows up in the Studio list as live and opens its operations page (docs/16 §2).
  await page.goto(`${org}/campaigns`);
  const row = page.getByTestId('campaign-table').getByRole('row', { name: /Vòng quay e2e/ });
  await expect(row.locator('[data-phase="live"]')).toBeVisible();
  await row.getByRole('link', { name: 'Vòng quay e2e' }).click();
  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId('prize-stock')).toContainText('Đã phát 1 · đã đổi 1');

  // A live campaign cannot be deleted; pausing it shows on Home as something to act on.
  await page.getByRole('tab', { name: 'Cài đặt' }).click();
  await expect(page.getByRole('button', { name: 'Xoá' })).toBeDisabled();
  await page.getByRole('button', { name: 'Tạm dừng' }).click();
  await expect(page.locator('[data-phase="paused"]').first()).toBeVisible();
  await page.goto(org);
  await expect(page.getByTestId('home-attention')).toContainText('đang tạm dừng');
});
