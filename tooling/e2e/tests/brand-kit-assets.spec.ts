import { expect, pickSelectOption, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('create brand kit and attach it to an event in settings', async ({ page }) => {
  const id = unique();

  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Brand Tester');
  await page.getByLabel('Email').fill(`brand-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Brand Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();

  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events$/);

  await page.getByRole('button', { name: 'Tạo sự kiện' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên sự kiện').fill(`YEP Brand ${id}`);
  await dialog.getByLabel('Đường dẫn tham gia').fill(`yep-brand-${id}`);
  await dialog.getByRole('button', { name: 'Tạo' }).click();
  await expect(page.getByRole('cell', { name: `YEP Brand ${id}` })).toBeVisible();

  await page.getByRole('link', { name: 'Brand kit' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/brand-kits$/);

  await page.getByLabel('Tên brand kit').fill(`Kit ${id}`);
  await page.getByRole('button', { name: 'Tạo', exact: true }).click();
  await expect(page.getByText(`Kit ${id}`).first()).toBeVisible();

  await page.getByRole('link', { name: 'Sự kiện' }).click();
  await page.getByRole('link', { name: 'Cài đặt sự kiện' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/settings$/);

  await pickSelectOption(page, 'Brand kit', `Kit ${id}`);
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Đã lưu cài đặt sự kiện')).toBeVisible();
});
