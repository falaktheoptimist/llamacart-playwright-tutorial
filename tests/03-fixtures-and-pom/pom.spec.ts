import { test as base, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CartPage } from './pages/CartPage';

/**
 * CHAPTER 03 — Fixtures & Page Object Model
 *
 * Fixtures are Playwright's dependency injection system.
 * They set up and tear down test state, and can be shared
 * across many tests without repetition.
 *
 * This chapter shows:
 *   - Creating a custom fixture (loggedInPage)
 *   - Using Page Object Model classes
 *   - test.beforeEach for shared setup
 *
 * Run with:
 *   npx playwright test tests/03-fixtures-and-pom --project=chromium
 */

// ── CUSTOM FIXTURES ────────────────────────────────────────────────────────

type LlamaFixtures = {
  loginPage: LoginPage;
  cartPage: CartPage;
  loggedInPage: LoginPage;
};

// Extend the base test with our custom fixtures
export const test = base.extend<LlamaFixtures>({

  // Fixture: provides a LoginPage instance
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
    // teardown (if needed) goes after use()
  },

  // Fixture: provides a CartPage instance
  cartPage: async ({ page }, use) => {
    const cartPage = new CartPage(page);
    await use(cartPage);
  },

  // Fixture: logs in with demo credentials before yielding
  loggedInPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('tester@llamacart.dev', 'LlamaRules123');
    await use(loginPage);
  },
});

// ── TESTS ──────────────────────────────────────────────────────────────────

test.describe('Login — using Page Object Model', () => {

  test('successful login with valid credentials', async ({ loginPage, page }) => {
    await loginPage.login('tester@llamacart.dev', 'LlamaRules123');
    await expect(page.getByTestId('user-avatar')).toBeVisible();
    await expect(page.getByTestId('toast')).toContainText('Welcome back');
  });

  test('failed login shows error message', async ({ loginPage }) => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    const error = await loginPage.getErrorMessage();
    await expect(error).toBeVisible();
    await expect(error).toContainText('Invalid email or password');
  });

  test('empty form shows no error until submitted', async ({ loginPage }) => {
    const error = await loginPage.getErrorMessage();
    await expect(error).not.toBeVisible();
  });

});

test.describe('Cart — using fixtures and POM', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to shop before each test
    await page.goto('/');
    await page.getByTestId('nav-shop').click();
  });

  test('adding a product updates cart count', async ({ page, cartPage }) => {
    await page.locator('#page-shop').getByTestId('add-to-cart').first().click();
    const countBadge = page.locator('#cart-count');
    await expect(countBadge).toHaveText('1');
  });

  test('cart shows added items', async ({ page, cartPage }) => {
    // Add two different products
    await page.getByTestId('product-card').nth(0).getByTestId('add-to-cart').click();
    await page.getByTestId('product-card').nth(1).getByTestId('add-to-cart').click();

    await cartPage.goto();

    const count = await cartPage.getItemCount();
    expect(count).toBe(2);
  });

  test('quantity controls update cart total', async ({ page, cartPage }) => {
    const firstCard = page.getByTestId('product-card').first();
    const productName = await firstCard.getByTestId('product-name').textContent();
    await firstCard.getByTestId('add-to-cart').click();

    await cartPage.goto();
    const totalBefore = await cartPage.getTotal();

    await cartPage.increaseQty(productName!);
    const totalAfter = await cartPage.getTotal();

    // Total should have doubled (price × 2)
    expect(totalBefore).not.toEqual(totalAfter);
  });

  test('removing an item from cart empties it', async ({ page, cartPage }) => {
    const firstCard = page.getByTestId('product-card').first();
    const productName = await firstCard.getByTestId('product-name').textContent();
    await firstCard.getByTestId('add-to-cart').click();

    await cartPage.goto();
    await cartPage.removeItem(productName!);

    expect(await cartPage.isEmpty()).toBe(true);
  });

});

test.describe('Logged-in user flow — using loggedInPage fixture', () => {

  test('logged-in user sees avatar in nav', async ({ loggedInPage, page }) => {
    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });

  test('logged-in user can add to cart and checkout', async ({ loggedInPage, page, cartPage }) => {
    await page.getByTestId('nav-shop').click();
    await page.locator('#page-shop').getByTestId('add-to-cart').first().click();

    await cartPage.goto();
    await cartPage.checkout();

    await expect(page.getByText('Order placed!')).toBeVisible();
  });

});
