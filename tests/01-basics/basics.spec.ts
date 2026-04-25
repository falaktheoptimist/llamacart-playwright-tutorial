import { test, expect } from '@playwright/test';

/**
 * CHAPTER 01 — Your first Playwright tests
 *
 * These tests introduce the core concepts:
 *   - Navigating to a URL
 *   - Asserting page title and URL
 *   - Clicking elements
 *   - Filling in forms
 *   - Basic assertions
 *
 * Run these with:
 *   npx playwright test tests/01-basics --project=chromium
 */

test.describe('LlamaCart — basics', () => {

  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LlamaCart/);
  });

  test('homepage shows the hero heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Made by llamas/i })).toBeVisible();
  });

  test('clicking "Shop the Collection" navigates to the shop', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    // Products grid should now be visible
    await expect(page.getByTestId('product-card').first()).toBeVisible();
  });

  test('product cards are visible in the shop', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    const cards = page.getByTestId('product-card');
    await expect(cards).toHaveCount(8); // all 8 products
  });

  test('each product card shows a name and price', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    const firstCard = page.getByTestId('product-card').first();
    await expect(firstCard.getByTestId('product-name')).toBeVisible();
    await expect(firstCard.getByTestId('product-price')).toContainText('$');
  });

  test('search filters products', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('search-input').fill('scarf');
    // Should navigate to shop and show only matching items
    const cards = page.getByTestId('product-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first().getByTestId('product-name')).toContainText('Scarf');
  });

  test('searching for something that does not exist shows no products', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-shop').click();
    await page.getByTestId('search-input').fill('dragon egg');
    await expect(page.getByText('No products found.')).toBeVisible();
  });

  test('clicking a product card opens the detail page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    const firstName = await page.getByTestId('product-name').first().textContent();
    await page.getByTestId('product-card').first().click();
    await expect(page.getByTestId('detail-product-name')).toHaveText(firstName!);
  });

});
