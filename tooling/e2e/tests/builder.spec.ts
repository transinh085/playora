import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('create games from template gallery, reorder, edit in 3-column builder with live preview, and publish version', async ({
  page,
}) => {
  const id = unique();
  const slug = `yep-builder-${id}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Builder Organizer');
  await page.getByLabel('Email').fill(`builder-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Builder Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();

  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events$/);
  await page.getByRole('button', { name: 'Tạo sự kiện' }).click();
  const createEventDialog = page.getByRole('dialog');
  await createEventDialog.getByLabel('Tên sự kiện').fill('YEP Builder 2026');
  await createEventDialog.getByLabel('Đường dẫn tham gia').fill(slug);
  await createEventDialog.getByRole('button', { name: 'Tạo' }).click();

  await page.getByRole('link', { name: 'YEP Builder 2026' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/guests$/);

  // Navigate to "Trò chơi" via EventNav
  await page.getByRole('link', { name: 'Trò chơi' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/events\/[^/]+\/games$/);
  await expect(page.getByTestId('event-games-tab')).toBeVisible();
  await expect(page.getByTestId('games-empty-state')).toBeVisible();

  // Add first game from template gallery
  await page.getByTestId('add-game-button').click();
  const galleryDialog = page.getByTestId('template-gallery-dialog');
  await expect(galleryDialog).toBeVisible();
  await galleryDialog.getByTestId('template-card-tap-race').click();
  await galleryDialog.getByTestId('new-game-name-input').fill('Đua chạm Vòng 1');
  await galleryDialog.getByTestId('confirm-add-game').click();

  const gameRows = page.locator('[data-testid^="game-row-"]');
  await expect(galleryDialog).toBeHidden();
  await expect(gameRows.filter({ hasText: 'Đua chạm Vòng 1' })).toHaveCount(1);

  // Add second game from template gallery
  await page.getByTestId('add-game-button').click();
  await galleryDialog.getByTestId('template-card-tap-race').click();
  await galleryDialog.getByTestId('new-game-name-input').fill('Đua chạm Chung kết');
  await galleryDialog.getByTestId('confirm-add-game').click();

  await expect(galleryDialog).toBeHidden();
  await expect(gameRows.filter({ hasText: 'Đua chạm Chung kết' })).toHaveCount(1);

  // Reorder games (move second game up) and delete it
  await expect(gameRows).toHaveCount(2);

  await gameRows.nth(1).locator('[data-testid^="game-move-up-"]').click();
  await expect(gameRows.nth(0)).toContainText('Đua chạm Chung kết');

  await gameRows.nth(0).locator('[data-testid^="game-delete-"]').click();
  await expect(gameRows).toHaveCount(1);
  await expect(gameRows.nth(0)).toContainText('Đua chạm Vòng 1');

  // Open 3-column Game Editor
  await gameRows.nth(0).locator('[data-testid^="game-edit-"]').click();
  await expect(page.getByTestId('game-editor')).toBeVisible();
  await expect(page.getByTestId('editor-groups-column')).toBeVisible();
  await expect(page.getByTestId('editor-preview-column')).toBeVisible();
  await expect(page.getByTestId('editor-properties-column')).toBeVisible();

  // Toggle between Mobile and Screen 16:9 preview surfaces
  await expect(page.getByTestId('preview-frame-wrapper')).toHaveAttribute('data-surface', 'player');
  await page.getByTestId('preview-toggle-screen').click();
  await expect(page.getByTestId('preview-frame-wrapper')).toHaveAttribute('data-surface', 'screen');
  await page.getByTestId('preview-toggle-mobile').click();
  await expect(page.getByTestId('preview-frame-wrapper')).toHaveAttribute('data-surface', 'player');

  // Interact with live preview iframe (tap button increments score in local test room)
  const previewFrame = page.frameLocator('[data-testid="preview-iframe"]');
  await expect(previewFrame.getByTestId('tap-race-player')).toBeVisible();
  await expect(previewFrame.getByTestId('tap-race-score')).toHaveText('0');
  await previewFrame.getByTestId('tap-race-tap-button').click();
  await expect(previewFrame.getByTestId('tap-race-score')).toHaveText('1');

  // Edit a field in auto-form and save draft
  await page
    .getByRole('radiogroup', { name: 'Chế độ thi đấu' })
    .getByRole('button', { name: 'Cá nhân' })
    .click();
  await page.getByTestId('save-draft-button').click();
  await expect(page.getByText('Đã lưu bản nháp').first()).toBeVisible();

  // Publish v1 via confirm dialog
  await page.getByTestId('publish-button').click();
  const publishDialog = page.getByTestId('publish-confirm-dialog');
  await expect(publishDialog).toContainText('v1');
  await publishDialog.getByTestId('confirm-publish-button').click();

  await expect(page.getByTestId('published-version-badge')).toContainText('Đã xuất bản v1');

  // Editing a non-hotEditable field after publish keeps working on draft and shows lock warning
  await page
    .getByRole('radiogroup', { name: 'Chế độ thi đấu' })
    .getByRole('button', { name: 'Theo đội' })
    .click();
  await expect(page.getByTestId('locked-field-warning')).toContainText(
    'Thay đổi không ảnh hưởng người chơi đã tham gia',
  );
});
