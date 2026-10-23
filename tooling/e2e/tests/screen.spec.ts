import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('create screen with layout preset in Studio, launch /screen via fragment key, and revoke key', async ({
  page,
}) => {
  const id = unique();
  const slug = `yep-screen-${id}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Screen Organizer');
  await page.getByLabel('Email').fill(`screen-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Screen Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();

  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events$/);
  await page.getByRole('button', { name: 'Tạo sự kiện' }).click();
  const createEventDialog = page.getByRole('dialog');
  await createEventDialog.getByLabel('Tên sự kiện').fill('YEP Screen 2026');
  await createEventDialog.getByLabel('Đường dẫn tham gia').fill(slug);
  await createEventDialog.getByRole('button', { name: 'Tạo' }).click();

  await page.getByRole('link', { name: 'YEP Screen 2026' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/guests$/);

  const studioEventUrl = page.url();

  // Switch to the "Màn hình" sub-nav page and create a 32:9 screen
  await page.getByRole('link', { name: 'Màn hình' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/screens$/);
  await page.getByRole('button', { name: 'Tạo màn hình' }).click();

  const createScreenDialog = page.getByRole('dialog');
  await createScreenDialog.getByLabel('Tên màn hình').fill('Màn LED Sân khấu');
  await createScreenDialog.getByRole('combobox', { name: 'Tỷ lệ khung hình' }).click();
  await page.getByRole('option', { name: 'Màn LED siêu rộng (32:9)' }).click();
  await expect(createScreenDialog.getByTestId('screen-layout-preview')).toHaveAttribute(
    'data-aspect',
    '32:9',
  );
  await createScreenDialog.getByRole('button', { name: 'Tạo' }).click();

  // One-time key dialog shows launch URL (#k=...) and warning
  const issuedDialog = page.getByRole('dialog');
  await expect(issuedDialog.getByText('Lưu lại ngay — khoá chỉ hiển thị một lần')).toBeVisible();
  const launchUrl = await issuedDialog.getByTestId('screen-launch-url').inputValue();
  expect(launchUrl).toContain('/screen#k=');
  await issuedDialog.getByRole('button', { name: 'Đã lưu khoá' }).click();

  await expect(page.getByRole('cell', { name: 'Màn LED Sân khấu' })).toBeVisible();
  await expect(page.getByText('Đang hoạt động')).toBeVisible();

  // Open the launch URL in Play; fragment should be stripped from URL bar and stored in sessionStorage
  await page.goto(launchUrl);
  await expect(page).toHaveURL(/\/screen$/);
  await expect(page.getByTestId('screen-stage')).toHaveAttribute('data-aspect', '32:9');
  await expect(page.getByTestId('screen-event-title')).toHaveText('YEP Screen 2026');
  await expect(page.getByTestId('screen-online-count')).toContainText('người tham gia');
  await expect(page.getByTestId('game-stage')).toBeVisible();
  await expect(page.getByTestId('screen-join-qr')).toBeVisible();
  await expect(page.getByTestId('fullscreen-button')).toBeVisible();

  // Reloading /screen without #k= continues to work from sessionStorage
  await page.reload();
  await expect(page.getByTestId('screen-event-title')).toHaveText('YEP Screen 2026');

  // Return to Studio, revoke the screen, and verify /screen shows the revoked state
  await page.goto(studioEventUrl);
  await page.getByRole('link', { name: 'Màn hình' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/screens$/);
  await page.getByRole('button', { name: 'Thu hồi' }).click();
  await expect(page.getByText('Đã thu hồi').first()).toBeVisible();

  await page.goto(launchUrl);
  await expect(page.getByTestId('screen-revoked')).toContainText('Màn hình đã bị thu hồi');
});
