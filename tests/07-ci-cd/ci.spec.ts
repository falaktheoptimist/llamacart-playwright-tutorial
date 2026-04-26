import { test, expect } from '@playwright/test';

/**
 * CHAPTER 06 — CI/CD Patterns
 *
 * This chapter covers patterns that matter specifically in CI:
 *
 *   - test.skip / test.fixme — conditionally skip tests
 *   - test.slow()            — extend timeout for known slow tests
 *   - Retries and flakiness  — writing retry-safe tests
 *   - Environment variables  — configuring tests per environment
 *   - Sharding               — splitting tests across parallel workers
 *   - Tags and grep          — running subsets of tests
 *
 * Run with:
 *   npx playwright test tests/06-ci-cd --project=chromium
 *
 * CI-only run:
 *   CI=true npx playwright test tests/06-ci-cd
 */

const isCI = !!process.env.CI;
const baseURL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('CI patterns — writing tests that behave well in pipelines', () => {

  // ── Conditional skip ─────────────────────────────────────────────────────

  test('skip on CI — visual test that needs a real browser', async ({ page }) => {
    test.skip(isCI, 'Skipping visual test on CI — no display');
    // This test only runs locally
    await page.goto('/');
    await expect(page).toHaveTitle(/LlamaCart/);
  });

  test('fixme — known broken test awaiting a fix', async ({ page }) => {
    test.fixme(true, 'Tracked in issue #42 — broken after checkout redesign');
    // This test is marked as expected-to-fail
    // It shows up in the report as "fixme" instead of a real failure
    await page.goto('/');
  });

  // ── Slow tests ───────────────────────────────────────────────────────────

  test('slow test — mark it so Playwright triples the timeout', async ({ page }) => {
    test.slow(); // 3× the default timeout for this test only
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    await expect(page.getByTestId('product-card').first()).toBeVisible();
  });

  // ── Retry-safe patterns ───────────────────────────────────────────────────

  test('retry-safe: avoid hardcoded waits', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();

    // BAD — don't do this:
    // await page.waitForTimeout(2000);

    // GOOD — wait for the element you actually care about:
    await expect(page.getByTestId('product-card').first()).toBeVisible();
    // Playwright retries this assertion until it passes or times out
  });

  test('retry-safe: use toHaveCount instead of count()', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();

    // BAD — count() doesn't retry; it returns immediately
    // const count = await page.getByTestId('product-card').count();
    // expect(count).toBe(8);

    // GOOD — toHaveCount() retries until the DOM settles
    await expect(page.getByTestId('product-card')).toHaveCount(8);
  });

  test('retry-safe: assert state, not intermediate steps', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-shop').click();
    await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();

    // Assert the final state — not the toast (which disappears)
    await expect(page.locator('#cart-count')).toHaveText('1');
  });

  // ── Environment-specific config ───────────────────────────────────────────

  test('env: read baseURL from environment variable', async ({ page }) => {
    // baseURL comes from playwright.config.ts → use: { baseURL }
    // which reads from process.env.BASE_URL
    // This test just verifies the app is reachable at whatever URL is configured
    await page.goto('/');
    await expect(page).toHaveTitle(/LlamaCart/);
  });

  // ── Tags — run subsets of tests with --grep ───────────────────────────────
  // Run just smoke tests: npx playwright test --grep @smoke
  // Run everything except slow: npx playwright test --grep-invert @slow

  test('smoke @smoke — basic app health check', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LlamaCart/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('smoke @smoke — shop loads products', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    await expect(page.getByTestId('product-card').first()).toBeVisible();
  });

  test('regression @regression — full checkout flow', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
    await page.getByTestId('cart-button').click();
    await page.getByTestId('checkout-btn').click();
    await expect(page.getByText('Order placed!')).toBeVisible();
  });

  // ── Parallelism and test isolation ────────────────────────────────────────

  test('isolation: each test gets a fresh browser context', async ({ page }) => {
    await page.goto('/');
    // cart has no items at the start of every test — no state carried over from other tests
    await expect(page.locator('#cart-count')).toHaveText('0');
  });

  test('isolation: actions in one test do not affect another', async ({ page }) => {
    // Add to cart
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
    await expect(page.locator('#cart-count')).toHaveText('1');
    // This cart state only lives in this test's context — other tests see 0
  });

  // ── Global setup / teardown ───────────────────────────────────────────────
  // See: https://playwright.dev/docs/test-global-setup-teardown
  //
  // For tasks that run once before/after the entire test suite
  // (seed a database, start a mock server, clean up S3 test bucket):
  //
  //   // globalSetup.ts
  //   export default async function globalSetup() {
  //     await db.seed();
  //   }
  //
  //   // playwright.config.ts
  //   export default defineConfig({
  //     globalSetup: './globalSetup.ts',
  //   });

});

test.describe('Sharding — how to split tests across CI workers', () => {

  /**
   * Sharding splits your test suite into N equal parts.
   * Each part runs in a separate CI job in parallel.
   *
   * Command:
   *   npx playwright test --shard=1/3  ← run 1st third
   *   npx playwright test --shard=2/3  ← run 2nd third
   *   npx playwright test --shard=3/3  ← run 3rd third
   *
   * In GitHub Actions matrix:
   *   strategy:
   *     matrix:
   *       shardIndex: [1, 2, 3]
   *       shardTotal: [3]
   *
   *   steps:
   *     - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
   *
   * After all shards finish, merge their blob reports:
   *   npx playwright merge-reports --reporter html ./all-blob-reports
   */

  test('shard-ready: this test is stateless and can run in any shard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LlamaCart/);
  });

});
