import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('configure event identity, registration form and consent in Studio, then player joins and persists session', async ({
  page,
}) => {
  const id = unique();
  const slug = `yep-join-${id}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Join Organizer');
  await page.getByLabel('Email').fill(`join-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Join Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();

  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events$/);
  await page.getByRole('button', { name: 'Tạo sự kiện' }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('Tên sự kiện').fill('YEP Join 2026');
  await createDialog.getByLabel('Đường dẫn tham gia').fill(slug);
  await createDialog.getByRole('button', { name: 'Tạo' }).click();

  // Import guest list
  await page.getByRole('link', { name: 'YEP Join 2026' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/guests$/);

  const csvContent = [
    'externalCode,displayName,team',
    'NV001,Nguyễn Văn An,Kinh doanh',
    'NV002,Trần Thị Bình,Kỹ thuật',
  ].join('\n');

  await page.locator('#guest-file').setInputFiles({
    name: 'guests.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent, 'utf8'),
  });
  await expect(page.getByText('Xem trước (2 dòng)')).toBeVisible();
  await page.getByRole('button', { name: 'Nhập danh sách' }).click();
  await expect(page.getByText('Đã thêm 2, cập nhật 0, bỏ qua 0 dòng.').first()).toBeVisible();

  // Configure event participation settings
  await page.getByRole('link', { name: 'Quay lại sự kiện' }).click();
  await page.getByRole('link', { name: 'Cài đặt sự kiện' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/settings$/);

  await page.getByRole('combobox', { name: 'Trạng thái' }).click();
  await page.getByRole('option', { name: 'Đang diễn ra' }).click();

  await page.getByRole('combobox', { name: 'Phương thức định danh' }).click();
  await page.getByRole('option', { name: 'Danh sách khách mời (mã khách)' }).click();

  await page.getByRole('button', { name: 'Thêm trường' }).click();
  await page.getByLabel('Mã trường (key)').fill('phone');
  await page.getByLabel('Nhãn tiếng Việt').fill('Số điện thoại');

  await page.getByRole('button', { name: 'Thêm mục đồng ý' }).click();
  await page.getByLabel('Mục đích (key)').fill('participation');
  await page
    .getByLabel('Nội dung tiếng Việt')
    .fill('Tôi đồng ý tham gia chương trình và cho phép xử lý dữ liệu cá nhân.');

  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Đã lưu cài đặt sự kiện')).toBeVisible();
  const guestsUrl = page.url().replace(/\/settings$/, '/guests');

  // Player opens the join page
  await page.goto(`http://localhost:3002/${slug}`);
  await expect(page.getByRole('heading', { name: 'YEP Join 2026' })).toBeVisible();

  // Missing required consent shows validation message
  await page.getByLabel(/Mã tham gia/).fill('nv001');
  await page.getByLabel(/Số điện thoại/).fill('0901234567');
  await page.getByRole('button', { name: 'Tham gia' }).click();
  await expect(
    page.getByText('Vui lòng đồng ý với điều khoản bắt buộc để tiếp tục.'),
  ).toBeVisible();

  // Check consent and join with unknown code → shows error
  await page
    .getByLabel(/Tôi đồng ý tham gia chương trình và cho phép xử lý dữ liệu cá nhân/)
    .check();
  await page.getByLabel(/Mã tham gia/).fill('NV999');
  await page.getByRole('button', { name: 'Tham gia' }).click();
  await expect(page.getByText('Mã khách mời không tồn tại trong sự kiện này.')).toBeVisible();

  // Valid guest code (case-insensitive) joins and enters the lobby
  await page.getByLabel(/Mã tham gia/).fill('nv001');
  await page.getByRole('button', { name: 'Tham gia' }).click();

  await expect(page.getByText('Đã tham gia — chờ MC bắt đầu')).toBeVisible();
  await expect(page.getByTestId('player-display-name')).toHaveText('Nguyễn Văn An');
  await expect(page.getByTestId('player-team')).toContainText('Kinh doanh');

  // Re-opening the page with a stored valid token skips the join step
  await page.reload();
  await expect(page.getByText('Đã tham gia — chờ MC bắt đầu')).toBeVisible();
  await expect(page.getByTestId('player-display-name')).toHaveText('Nguyễn Văn An');

  // Organizer sees "Mở khoá thiết bị" action only for the guest that has joined and can release it
  await page.goto(guestsUrl);
  const releaseButtons = page.getByRole('button', { name: 'Mở khoá thiết bị' });
  await expect(releaseButtons).toHaveCount(1);
  await releaseButtons.click();
  await expect(page.getByText('Đã mở khoá thiết bị cho khách mời')).toBeVisible();
});
