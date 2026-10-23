import { test as base, expect } from '@playwright/test';

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

export { expect };
