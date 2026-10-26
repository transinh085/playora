import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('invite member → accept invitation as new user → editor sees members without invite permissions', async ({
  page,
}) => {
  const id = unique();
  const ownerEmail = `owner-${id}@test.playora.local`;
  const inviteeEmail = `editor-${id}@test.playora.local`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Owner Alice');
  await page.getByLabel('Email').fill(ownerEmail);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();

  await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  // The legacy event pages are no longer in the sidebar (docs/product/specs/studio-ux.md); open them by URL.
  await page.goto(`${new URL(page.url()).pathname}/events`);
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events$/);
  const orgMatch = /\/orgs\/([^/]+)\/events$/.exec(page.url());
  const orgId = orgMatch?.[1] ?? '';
  expect(orgId).not.toBe('');

  await page.goto(`/orgs/${orgId}/settings`);
  await expect(page.getByRole('heading', { name: 'Thành viên' })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Owner Alice/ })).toBeVisible();

  await page.getByRole('button', { name: 'Mời thành viên' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email').fill(inviteeEmail);

  const inviteResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/auth/organization/invite-member') && res.status() === 200,
  );
  await dialog.getByRole('button', { name: 'Gửi lời mời' }).click();
  const inviteResponse = await inviteResponsePromise;
  const invitation = (await inviteResponse.json()) as { id: string };

  await expect(page.getByRole('cell', { name: inviteeEmail })).toBeVisible();

  // Visit the invitation link while still signed in as Owner → switch account to sign up as invitee.
  await page.goto(`/invite/${invitation.id}`);
  await expect(page.getByRole('button', { name: 'Đăng nhập bằng tài khoản khác' })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng nhập bằng tài khoản khác' }).click();

  await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Finvite%2F${invitation.id}`));
  // Full page load after sign-out: retry the toggle until the client has hydrated.
  await expect(async () => {
    await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
    await expect(page.getByLabel('Họ tên')).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await page.getByLabel('Họ tên').fill('Editor Bob');
  await page.getByLabel('Email').fill(inviteeEmail);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/invite/${invitation.id}$`));
  await expect(page.getByRole('button', { name: 'Chấp nhận lời mời' })).toBeVisible();
  await page.getByRole('button', { name: 'Chấp nhận lời mời' }).click();

  await expect(page).toHaveURL(new RegExp(`/orgs/${orgId}$`));

  // As an editor, Bob can view the members list and leave, but cannot invite members.
  await page.goto(`/orgs/${orgId}/settings`);
  await expect(page.getByRole('cell', { name: /Editor Bob/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mời thành viên' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Rời tổ chức' })).toBeVisible();
});
