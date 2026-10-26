import { expect, test } from './fixtures';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('canvas lab: add, move, undo and delete elements on a screen (ADR-014 prototype)', async ({
  page,
}) => {
  const id = unique();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Canvas Tester');
  await page.getByLabel('Email').fill(`canvas-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Canvas Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  // Labs is hidden from the sidebar in production builds, so open it by URL.
  await page.goto(`${new URL(page.url()).pathname}/labs/canvas`);
  await expect(page).toHaveURL(/\/labs\/canvas$/);
  const layers = page.getByTestId('layer-row');
  await expect(layers.first()).toBeVisible();
  const initial = await layers.count();

  // Click-add a text element: it lands on the canvas, in the layers list, and is selected.
  await page.getByTestId('toolbox-text').click();
  await expect(layers).toHaveCount(initial + 1);
  await expect(page.getByLabel('Tên lớp')).toHaveValue('Nội dung mới');

  // Drag it 40px down; the Y field follows.
  const y = Number(await page.getByRole('spinbutton').nth(1).inputValue());
  const box = await page.getByTestId('canvas-element-text').last().boundingBox();
  if (!box) throw new Error('new text element not rendered');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 7, box.y + box.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByRole('spinbutton').nth(1)).not.toHaveValue(String(y));

  // Undo the move and the add (one step each), then redo the add.
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(layers).toHaveCount(initial);
  await page.getByRole('button', { name: 'Làm lại' }).click();
  await expect(layers).toHaveCount(initial + 1);

  // Delete with the keyboard; the game stage on the Game screen cannot be deleted.
  await page.getByTestId('canvas-element-text').last().click();
  await page.keyboard.press('Delete');
  await expect(layers).toHaveCount(initial);
  await page.getByRole('menuitem', { name: 'Màn chơi' }).click();
  await page.getByTestId('canvas-element-gameStage').click();
  await expect(page.getByRole('button', { name: 'Xoá' })).toBeDisabled();
});

test('canvas lab: right-click menu adds, duplicates, aligns and deletes elements', async ({
  page,
}) => {
  const id = unique();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Họ tên').fill('Canvas Menu Tester');
  await page.getByLabel('Email').fill(`canvas-menu-${id}@test.playora.local`);
  await page.getByLabel('Mật khẩu').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Tên tổ chức').fill(`Canvas Menu Org ${id}`);
  await page.getByRole('button', { name: 'Tạo tổ chức' }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  await page.goto(`${new URL(page.url()).pathname}/labs/canvas`);
  const layers = page.getByTestId('layer-row');
  await expect(layers.first()).toBeVisible();
  const initial = await layers.count();
  const menu = page.getByTestId('canvas-context-menu');

  // Right-click empty stage space → "Add element here" submenu → Text.
  const stage = await page.getByTestId('canvas-stage').boundingBox();
  if (!stage) throw new Error('stage not rendered');
  await page.mouse.click(stage.x + 20, stage.y + 20, { button: 'right' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Thêm phần tử tại đây' }).hover();
  await page.getByRole('menuitem', { name: 'Chữ', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(layers).toHaveCount(initial + 1);

  // Right-click the new element → Duplicate.
  const text = page.getByTestId('canvas-element-text').last();
  await text.click({ button: 'right' });
  await menu.getByRole('menuitem', { name: /Nhân bản/ }).click();
  await expect(layers).toHaveCount(initial + 2);

  // Right-click → Quick align → Align left puts X at 16.
  await page.getByTestId('canvas-element-text').last().click({ button: 'right' });
  await menu.getByRole('menuitem', { name: 'Căn lề nhanh' }).hover();
  await page.getByRole('menuitem', { name: 'Căn lề trái' }).click();
  await expect(page.getByRole('spinbutton').nth(0)).toHaveValue('16');

  // Escape closes the menu without acting; Delete from the menu removes the element.
  await page.getByTestId('canvas-element-text').last().click({ button: 'right' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(layers).toHaveCount(initial + 2);
  await page.getByTestId('canvas-element-text').last().click({ button: 'right' });
  await menu.getByRole('menuitem', { name: /Xoá/ }).click();
  await expect(layers).toHaveCount(initial + 1);
});
