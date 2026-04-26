import { test, expect } from '@playwright/test';

/**
 * CHAPTER 06 — Visual Regression Testing
 *
 * Playwright's toHaveScreenshot() captures pixel-level snapshots and
 * automatically compares them on every subsequent run.
 *
 *   First run    → baselines are written to visual.spec.ts-snapshots/
 *   Subsequent   → new screenshot is diffed against the baseline
 *   On failure   → three files are saved: actual, expected, diff (magenta pixels)
 *   Update       → npx playwright test tests/06-visual-testing --update-snapshots
 *
 * Pin visual tests to a single browser — font rendering differs across
 * operating systems and browser engines:
 *   npx playwright test tests/06-visual-testing --project=chromium
 */

test.describe('Visual regression — LlamaCart', () => {

  // ── Full-page screenshots ─────────────────────────────────────────────────

  test('homepage — full page matches baseline', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveScreenshot('homepage.png', {
      animations: 'disabled',      // freeze CSS animations for a deterministic frame
      maxDiffPixelRatio: 0.01,     // allow up to 1% of pixels to differ (font hinting, etc.)
    });
  });

  test('shop page — product grid matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();

    // Wait for the grid to fully render before snapping — no flaky empty-grid shots
    await expect(page.getByTestId('product-card').first()).toBeVisible();

    await expect(page).toHaveScreenshot('shop.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('order success page — matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
    await page.getByTestId('cart-button').click();
    await page.getByTestId('checkout-btn').click();
    await expect(page.getByText('Order placed!')).toBeVisible();

    await expect(page).toHaveScreenshot('order-success.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });

  // ── Element-level screenshots ─────────────────────────────────────────────

  test('nav bar — element screenshot matches baseline', async ({ page }) => {
    await page.goto('/');

    // Scoping to an element avoids capturing unrelated page changes
    await expect(page.locator('nav')).toHaveScreenshot('nav.png', {
      animations: 'disabled',
    });
  });

  test('product card — element screenshot matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();

    const firstCard = page.getByTestId('product-card').first();
    await expect(firstCard).toBeVisible();

    // Element screenshots are tighter than full-page — ideal for component-level checks
    await expect(firstCard).toHaveScreenshot('product-card.png', {
      animations: 'disabled',
    });
  });

  test('cart item — element screenshot matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
    await page.getByTestId('cart-button').click();

    const firstItem = page.getByTestId('cart-item').first();
    await expect(firstItem).toBeVisible();

    await expect(firstItem).toHaveScreenshot('cart-item.png', {
      animations: 'disabled',
    });
  });

  // ── Masking dynamic content ───────────────────────────────────────────────

  test('cart page — mask price summary to isolate layout changes', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
    await page.getByTestId('cart-button').click();
    await expect(page.getByTestId('cart-item')).toBeVisible();

    // mask[] replaces those regions with a solid magenta rectangle before diffing.
    // Use it for any content that legitimately changes between runs:
    // prices fetched from an API, timestamps, personalised recommendations, etc.
    await expect(page).toHaveScreenshot('cart-masked.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      mask: [
        page.getByTestId('cart-subtotal'),
        page.getByTestId('cart-shipping'),
        page.getByTestId('cart-total'),
      ],
    });
  });

  test('shop page — mask cart badge to isolate grid layout', async ({ page }) => {
    await page.goto('/');
    // Add an item first so the cart badge is visible
    await page.getByTestId('hero-shop-btn').click();
    await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();

    // The badge count would change if this test ran after another test that
    // had already added items — masking it makes the screenshot stable regardless
    await expect(page).toHaveScreenshot('shop-with-cart.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      mask: [page.locator('#cart-count')],
    });
  });

  // ── Threshold tuning ──────────────────────────────────────────────────────

  test('product card — strict: zero tolerance for pixel drift', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();

    const firstCard = page.getByTestId('product-card').first();
    await expect(firstCard).toBeVisible();

    // threshold: 0  → every pixel must match exactly.
    // Catches subtle colour or shadow regressions but will fail on
    // font-hinting differences between CI and local machines.
    // Only use when tests run in a locked, reproducible environment.
    await expect(firstCard).toHaveScreenshot('product-card-strict.png', {
      threshold: 0,
      animations: 'disabled',
    });
  });

  test('product card — loose: allow up to 200 pixels to differ', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();

    const firstCard = page.getByTestId('product-card').first();
    await expect(firstCard).toBeVisible();

    // maxDiffPixels sets an absolute budget rather than a ratio.
    // Useful when the card size is fixed and you know how many pixels
    // of sub-pixel rendering difference is acceptable.
    await expect(firstCard).toHaveScreenshot('product-card-loose.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

});
