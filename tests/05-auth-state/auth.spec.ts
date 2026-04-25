import { test, expect, chromium } from '@playwright/test';
import path from 'path';

/**
 * CHAPTER 05 — Auth State (storageState)
 *
 * Logging in on every test is slow and brittle.
 * Playwright lets you save the browser's localStorage/cookies
 * after one login, then reuse that state across all tests.
 *
 * Pattern:
 *   1. A "setup" project logs in once and saves state to a file
 *   2. All other projects depend on the setup project
 *   3. Each test starts already authenticated — no login step needed
 *
 * To use storageState with projects, add this to playwright.config.ts:
 *
 *   projects: [
 *     { name: 'setup', testMatch: '** /auth.setup.ts' },
 *     {
 *       name: 'chromium',
 *       use: { storageState: 'playwright/.auth/user.json' },
 *       dependencies: ['setup'],
 *     },
 *   ]
 *
 * Run with:
 *   npx playwright test tests/05-auth-state --project=chromium
 */

const AUTH_FILE = path.join(__dirname, '../../playwright/.auth/user.json');

// ── SETUP: log in once and save the state ─────────────────────────────────
test('auth setup — save logged-in state', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-login').click();
  await page.getByLabel('Email').fill('tester@llamacart.dev');
  await page.getByLabel('Password').fill('LlamaRules123');
  await page.getByTestId('login-submit').click();

  // Wait until login is confirmed
  await expect(page.getByTestId('user-avatar')).toBeVisible();

  // Save the entire browser storage state to a file
  await page.context().storageState({ path: AUTH_FILE });
});

// ── REUSE: start new context using saved state ────────────────────────────
test('reuse saved auth state — already logged in', async () => {
  const browser = await chromium.launch();

  // Create a context with the saved storage state
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();

  await page.goto('/');

  // User should already be logged in — no login step needed
  await expect(page.getByTestId('user-avatar')).toBeVisible();

  await browser.close();
});

test('saved auth state persists across navigation', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();

  await page.goto('/');
  await page.getByTestId('nav-shop').click();

  // Navigate around — still logged in
  await expect(page.getByTestId('user-avatar')).toBeVisible();

  await browser.close();
});
