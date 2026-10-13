/*
 * Layout test (XBR-02): the form on a small phone screen.
 * XBR-01 (the same suite on three browsers) is set up in playwright.config.js.
 */
const { test, expect } = require('../fixtures/test-fixtures');
const { meta } = require('../support/meta');

const NARROW_PHONE = { width: 375, height: 667 };

test.describe('Narrow screen layout', () => {
  // Applies to every test in this block: a typical small phone screen.
  test.use({ viewport: NARROW_PHONE });

  // XBR-02 (P2): on a phone there is no sideways scroll, every field is on screen and the submit button is big enough to tap (44 px is the usual minimum).
  test(
    'XBR-02 the form fits a 375 px wide screen without sideways scrolling',
    meta('XBR-02', 'P2', 'responsive'),
    async ({ page, applicationPage }) => {
      // the page is not wider than the screen.
      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(horizontalOverflow).toBeLessThanOrEqual(0);

      // each field sits fully inside the screen.
      for (const field of [
        applicationPage.fullName,
        applicationPage.email,
        applicationPage.experience,
        applicationPage.coverNote,
      ]) {
        const box = await field.boundingBox();
        expect(box).not.toBeNull();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(NARROW_PHONE.width);
      }

      // the submit button can be reached and is large enough to tap.
      await applicationPage.submitButton.scrollIntoViewIfNeeded();
      await expect(applicationPage.submitButton).toBeInViewport();
      const button = await applicationPage.submitButton.boundingBox();
      expect(button.height).toBeGreaterThanOrEqual(44);
    },
  );
});
