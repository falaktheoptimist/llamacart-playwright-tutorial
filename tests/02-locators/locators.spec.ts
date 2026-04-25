import { test, expect } from '@playwright/test';

/**
 * CHAPTER 02 — Locators
 *
 * Playwright's locator API is the recommended way to find elements.
 * It retries automatically until elements are ready, making tests
 * resilient without manual waits.
 *
 * Best practices shown here:
 *   - getByRole()       — most resilient, accessibility-first
 *   - getByLabel()      — for form inputs
 *   - getByTestId()     — for test-specific hooks (data-testid)
 *   - getByText()       — for visible text
 *   - getByPlaceholder() — for input placeholders
 *   - .filter()         — narrow down multiple matches
 *   - .nth()            — pick by index
 *
 * Run with:
 *   npx playwright test tests/02-locators --project=chromium
 */

test.describe('Locators — finding elements the right way', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-shop').click();
  });

  // ── getByRole ────────────────────────────────────────────────────────────
  test('getByRole — find the nav logo link', async ({ page }) => {
    await page.goto('/');
    const logo = page.getByRole('link', { name: /LlamaCart/i });
    await expect(logo).toBeVisible();
  });

  test('getByRole — find buttons by name', async ({ page }) => {
    await page.goto('/');
    // Multiple "Add to Cart" buttons on the page — check they're all there
    const addButtons = page.getByRole('button', { name: 'Add to Cart' });
    await expect(addButtons).toHaveCount(4); // 4 on featured (home)
  });

  test('getByRole — find headings', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'All Products' });
    await expect(heading).toBeVisible();
  });

  // ── getByLabel ───────────────────────────────────────────────────────────
  test('getByLabel — fill in login form fields', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-login').click();

    // getByLabel works on <input> elements that have a matching <label>
    await page.getByLabel('Email').fill('tester@llamacart.dev');
    await page.getByLabel('Password').fill('LlamaRules123');

    await expect(page.getByLabel('Email')).toHaveValue('tester@llamacart.dev');
  });

  // ── getByPlaceholder ─────────────────────────────────────────────────────
  test('getByPlaceholder — find the search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search llama goods...');
    await searchInput.fill('scarf');
    await expect(page.getByTestId('product-card')).toHaveCount(1);
  });

  // ── getByText ────────────────────────────────────────────────────────────
  test('getByText — find elements by visible text', async ({ page }) => {
    // Exact text
    const badge = page.getByText('Out of stock');
    await expect(badge).toBeVisible();
  });

  // ── getByTestId ───────────────────────────────────────────────────────────
  test('getByTestId — use data-testid attributes', async ({ page }) => {
    // data-testid is the most stable selector — it doesn't break on UI changes
    const cards = page.getByTestId('product-card');
    await expect(cards).toHaveCount(8);
  });

  // ── Chaining & filtering ──────────────────────────────────────────────────
  test('chaining — find a specific button inside a specific card', async ({ page }) => {
    // Find the card with "Alpaca Friendship Bracelet", then click its Add to Cart
    const braceletCard = page.getByTestId('product-card')
      .filter({ hasText: 'Alpaca Friendship Bracelet' });
    await braceletCard.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('toast')).toBeVisible();
  });

  test('nth() — interact with the third product card', async ({ page }) => {
    const thirdCard = page.getByTestId('product-card').nth(2);
    const name = await thirdCard.getByTestId('product-name').textContent();
    await thirdCard.click();
    await expect(page.getByTestId('detail-product-name')).toHaveText(name!);
  });

  // ── Locator assertions ────────────────────────────────────────────────────
  test('locator assertions — visible, enabled, count', async ({ page }) => {
    // toBeVisible — element is in the DOM and visible
    await expect(page.getByTestId('search-input')).toBeVisible();

    // toBeEnabled — element can be interacted with
    await expect(page.getByTestId('filter-all')).toBeEnabled();

    // toHaveCount — number of matched elements
    await expect(page.getByTestId('product-card')).toHaveCount(8);

    // toContainText — element contains this text (partial match)
    await expect(page.getByTestId('product-count')).toContainText('8 items');
  });

  test('soft assertions — continue test even after a failure', async ({ page }) => {
    const cards = page.getByTestId('product-card');

    // expect.soft() marks assertion as failed but continues executing
    await expect.soft(cards).toHaveCount(8);
    await expect.soft(page.getByTestId('search-input')).toBeVisible();
    // Both are checked, test reports all failures at the end
  });

});
