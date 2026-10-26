import { expect, test } from './fixtures';

test('player shell renders the home page and 404s unknown campaign slugs', async ({ page }) => {
  await page.goto('http://localhost:3002/');
  await expect(page.getByText('Quét mã QR tại cửa hàng để tham gia.')).toBeVisible();

  const res = await page.goto('http://localhost:3002/khong-ton-tai');
  expect(res?.status()).toBe(404);
  await expect(page.getByText('Không tìm thấy chương trình')).toBeVisible();
});
