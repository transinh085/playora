import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Template gallery → editor → rules that pass pre-flight → open the publish dialog. */
async function createAndOpenPublish(page: Page, org: string, name: string) {
  await page.goto(`${org}/campaigns/new?start=templates`);
  await page
    .getByRole('button', { name: /^Vòng quay may mắn · / })
    .first()
    .click();
  await page.getByRole('textbox', { name: 'Tên chương trình' }).fill(name);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Tạo chương trình', exact: true })
    .click();
  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}\/edit$/);

  await page.locator('.ant-segmented-item', { hasText: 'Luật & giải' }).first().click();
  await page.getByRole('radio', { name: /Ai chơi cũng có quà/ }).click({ force: true });
  await page.getByRole('switch', { name: 'Rải đều quà' }).click();
  await page.getByRole('switch', { name: 'Chỉ phát quà trong khung giờ' }).click();

  await page.getByRole('button', { name: 'Publish' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: /Không/ }).click();
  await dialog.getByRole('checkbox', { name: /đơn vị tổ chức/ }).check();
  await dialog.getByRole('checkbox', { name: /kiểm tra thể lệ/ }).check();
  await dialog.getByRole('button', { name: 'Publish' }).click();
  return dialog;
}

test('Free plan: plan page shows usage, a second running campaign hits the plan limit (BIL-01/02)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const id = unique();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Plan Owner');
  await page.getByLabel('Email').fill(`plan-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Plan Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  const org = new URL(page.url()).pathname;

  // A new organization is on Free with nothing used.
  await page.getByRole('link', { name: 'Gói & sử dụng' }).click();
  await expect(page).toHaveURL(/\/settings\/billing$/);
  await expect(page.getByRole('heading', { name: 'Gói & sử dụng' })).toBeVisible();
  await expect(page.getByTestId('billing-plan')).toHaveText('Free');
  await expect(page.getByTestId('usage-campaigns')).toContainText('0 / 1');
  await expect(page.getByTestId('usage-redemptions')).toContainText('0 / 100');
  await expect(page.getByTestId('manual-payment')).toContainText('PLAYORA');
  await expect(page.getByText('Chưa có hoá đơn')).toBeVisible();

  // The first campaign uses the only running slot of Free.
  const first = await createAndOpenPublish(page, org, `Gói 1 ${id}`);
  await expect(first.getByText('Đã publish v1')).toBeVisible();

  await page.goto(`${org}/settings/billing`);
  await expect(page.getByTestId('usage-campaigns')).toContainText('1 / 1');
  await expect(page.getByTestId('plan-campaign-limit')).toBeVisible();

  // The second one is refused with the plan message and a way to the plan page.
  const second = await createAndOpenPublish(page, org, `Gói 2 ${id}`);
  const limit = second.getByTestId('plan-campaign-limit');
  await expect(limit).toContainText('Gói hiện tại đã đủ số chương trình đang chạy');
  await limit.getByRole('button', { name: 'Xem gói' }).click();
  await expect(page).toHaveURL(/\/settings\/billing$/);
});
