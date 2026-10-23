import { expect, test } from './fixtures';

test('player shell renders a seeded event and 404s unknown slugs', async ({ page }) => {
  await page.goto('http://localhost:3002/demo-yep');
  await expect(page.getByRole('heading', { name: 'YEP Demo 2026' })).toBeVisible();

  const res = await page.goto('http://localhost:3002/khong-ton-tai');
  expect(res?.status()).toBe(404);
});
