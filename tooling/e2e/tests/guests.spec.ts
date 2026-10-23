import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('import guest list CSV, assign random balanced teams, and configure join QR', async ({
  page,
}) => {
  const id = unique();
  const slug = `yep-guests-${id}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Guest Organizer');
  await page.getByLabel('Email').fill(`guests-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Guest Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();

  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events$/);
  await page.getByRole('button', { name: 'Tạo sự kiện' }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('Tên sự kiện').fill('YEP Guests 2026');
  await createDialog.getByLabel('Đường dẫn tham gia').fill(slug);
  await createDialog.getByRole('button', { name: 'Tạo' }).click();

  await page.getByRole('link', { name: 'YEP Guests 2026' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/guests$/);

  // Join QR card updates URL with optional ?t=<zone>
  await expect(page.getByTestId('join-url')).toContainText(`/${slug}`);
  await page.getByLabel('Bàn / Khu vực (tuỳ chọn)').fill('VIP-1');
  await expect(page.getByTestId('join-url')).toContainText(`/${slug}?t=VIP-1`);

  // Upload CSV and preview column mapping
  const csvContent = [
    'ma_nv,ho_ten,phong_ban,ban',
    'NV001,Nguyễn Văn A,Kinh doanh,B01',
    'NV002,Trần Thị B,,B02',
    'NV003,Lê Văn C,,B03',
  ].join('\n');

  await page.locator('#guest-file').setInputFiles({
    name: 'guests.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent, 'utf8'),
  });

  await expect(page.getByText('Xem trước (3 dòng)')).toBeVisible();
  await page.getByRole('button', { name: 'Nhập danh sách' }).click();

  await expect(page.getByText('Đã thêm 3, cập nhật 0, bỏ qua 0 dòng.').first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Nguyễn Văn A' }).last()).toBeVisible();
  await expect(page.getByText('Chưa phân đội: 2')).toBeVisible();

  // Auto-assign random balanced teams to unassigned guests
  await page.getByRole('button', { name: 'Chia đội ngẫu nhiên' }).click();
  const teamDialog = page.getByRole('dialog');
  await teamDialog.getByLabel('Danh sách tên đội').fill('Kinh doanh, Kỹ thuật');
  await teamDialog.getByRole('button', { name: 'Chia đội' }).click();

  await expect(page.getByText('Chưa phân đội: 0')).toBeVisible();
});
