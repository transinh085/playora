import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('playbook: goal → budget → suggestion → editor with prizes and rules filled → publish (docs/product/specs/playbooks.md §4.1)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const id = unique();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Chị Hà');
  await page.getByLabel('Email').fill(`playbook-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Trà sữa ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  const org = new URL(page.url()).pathname;

  // Screen 1 — "Bạn muốn gì?": pick the Tết playbook.
  await page.goto(`${org}/campaigns/new`);
  await expect(page.getByText('Bạn muốn gì?')).toBeVisible();
  await page.getByTestId('playbook-tet_traffic').click();
  await expect(page).toHaveURL(/\?playbook=tet_traffic$/);

  // Screen 2 — setup: only the budget is typed; prizes, costs and dates are suggested.
  const budget = page.getByRole('spinbutton', { name: 'Ngân sách quà' });
  await budget.fill('2000000');
  await budget.blur();
  await expect(page.getByTestId('playbook-prize')).toHaveCount(4);
  const suggestion = page.getByTestId('playbook-suggestion');
  await expect(suggestion).toContainText('Với 2.000.000 đ, bạn phát được khoảng 410 phần quà');
  await expect(suggestion).toContainText('trong 20 ngày');
  await page.getByRole('button', { name: 'Tạo chương trình', exact: true }).click();

  // Screen 3 — the editor, with prizes and rules already in place.
  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}\/edit$/);
  const campaignId = new URL(page.url()).pathname.split('/').at(-2);
  await page.locator('.ant-segmented-item', { hasText: 'Luật & giải' }).first().click();
  const prizeNames = page.getByPlaceholder('Vd. Ly cà phê muối');
  await expect(prizeNames).toHaveCount(4);
  await expect(prizeNames.first()).toHaveValue('Size up miễn phí');
  await expect(page.getByRole('switch', { name: 'Giới hạn ngân sách' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Rải đều quà' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Chỉ phát quà trong khung giờ' })).toBeChecked();
  await expect(page.getByText('Mỗi khách chơi được 1 lượt mỗi ngày.')).toBeVisible();

  // Pre-flight has no blocking errors: answer promotion question and confirm legal checklist before publish.
  await page.getByRole('button', { name: 'Publish' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: /Không/ }).click();
  await dialog.getByRole('checkbox', { name: /đơn vị tổ chức/ }).check();
  await dialog.getByRole('checkbox', { name: /kiểm tra thể lệ/ }).check();
  await dialog.getByRole('button', { name: 'Publish' }).click();
  await expect(dialog.getByText('Đã publish v1')).toBeVisible();

  // The campaign page shows which playbook it came from.
  await page.goto(`${org}/campaigns/${campaignId}`);
  await expect(page.locator('[data-playbook="tet_traffic"]')).toHaveText('Tết kéo khách');
});
