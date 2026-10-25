import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('start a campaign from the template gallery and land in the editor (docs/16 §4)', async ({
  page,
}) => {
  const id = unique();

  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Gallery Owner');
  await page.getByLabel('Email').fill(`gallery-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Gallery Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events$/);

  await page.getByRole('link', { name: 'Tạo từ mẫu' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/templates$/);

  // One card per template × skin; picking one updates the detail panel.
  await page.getByTestId('template-item-spin-wheel:tet').click();
  await expect(page.getByTestId('template-detail')).toContainText('Vòng quay may mắn');
  await page.getByTestId('use-template-button').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('quick-create-name')).toHaveValue(
    'Vòng quay may mắn – Tết Rực Rỡ',
  );
  await dialog.getByTestId('quick-create-name').fill(`Vòng quay Tết ${id}`);
  await dialog.getByTestId('quick-create-submit').click();

  // No slug to type and no list to come back to: the editor opens on the new game.
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/games\/[^/]+$/);
  await expect(page.getByTestId('game-editor')).toBeVisible();
  await expect(page.getByTestId('editor-game-name')).toHaveValue(`Vòng quay Tết ${id}`);
});
