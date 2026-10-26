import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('signed-out visitors are sent to /login', async ({ page }) => {
  await page.goto('/orgs/anything/campaigns');
  await expect(page).toHaveURL(/\/login\?next=%2Forgs%2Fanything%2Fcampaigns/);
});

test('sign up → create organization → Home checklist', async ({ page }) => {
  const id = unique();

  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('E2E Tester');
  await page.getByLabel('Email').fill(`e2e-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Agency ${id}`);
  await expect(page.getByLabel('Đường dẫn')).toHaveValue(`agency-${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();

  await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  // New organizations land on Home with the getting-started checklist.
  await expect(page.getByTestId('home-checklist')).toBeVisible();
  await expect(page.getByTestId('home-checklist-campaign')).toHaveAttribute('data-done', 'false');
});
