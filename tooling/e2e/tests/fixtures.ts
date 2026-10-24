import { test as base, expect, type Page } from '@playwright/test';

/** Every test fails if the browser logs an error (hydration, i18n formatting, React warnings…). */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));
      await use(errors);
      // Chrome logs every non-2xx response; expected API errors (404, 409…) are asserted in the tests.
      expect(errors.filter((e) => !e.startsWith('Failed to load resource'))).toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Opens an antd Select by its accessible name and picks an option by its visible text.
 * antd renders a hidden, virtualised a11y listbox, so `getByRole('option')` is not clickable.
 */
export async function pickSelectOption(page: Page, selectName: string, optionText: string) {
  await page.getByRole('combobox', { name: selectName }).click();
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
    .filter({ hasText: optionText })
    .first()
    .click();
}

export { expect };
