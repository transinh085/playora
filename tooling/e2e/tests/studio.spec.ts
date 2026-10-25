import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('signed-out visitors are sent to /login', async ({ page }) => {
  await page.goto('/orgs/anything/events');
  await expect(page).toHaveURL(/\/login\?next=%2Forgs%2Fanything%2Fevents/);
});

test('sign up → create organization → create event', async ({ page }) => {
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

  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events$/);
  await expect(page.getByText('Chưa có chương trình nào')).toBeVisible();

  await page.getByRole('button', { name: 'Tạo chương trình' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên chương trình').fill('YEP E2E 2026');
  await dialog.getByLabel('Đường dẫn tham gia').fill(`yep-${id}`);
  await dialog.getByRole('button', { name: 'Tạo' }).click();

  await expect(page.getByRole('cell', { name: 'YEP E2E 2026' })).toBeVisible();
  await expect(page.getByRole('cell', { name: `/yep-${id}` })).toBeVisible();

  // Same slug again → the API's SLUG_TAKEN lands on the slug field.
  await page.getByRole('button', { name: 'Tạo chương trình' }).click();
  await dialog.getByLabel('Tên chương trình').fill('Trùng');
  await dialog.getByLabel('Đường dẫn tham gia').fill(`yep-${id}`);
  await dialog.getByRole('button', { name: 'Tạo' }).click();
  await expect(dialog.getByText('Đường dẫn này đã được dùng')).toBeVisible();
});
