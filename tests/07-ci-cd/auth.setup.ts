import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config.advanced';

/**
 * AUTH SETUP — runs once before all other test projects
 *
 * This is not a regular test — it's a setup step that the other
 * projects depend on via `dependencies: ['setup']` in the config.
 *
 * It logs in with the demo credentials and saves the browser's
 * storage state (localStorage + cookies) to a file.
 * All subsequent tests start already authenticated.
 *
 * The STORAGE_STATE file is in .gitignore — it's generated fresh
 * each time tests run, so credentials never end up in source control.
 */

setup('authenticate', async ({ page }) => {
  await page.goto('/');

  // Navigate to login
  await page.getByTestId('nav-login').click();

  // Fill in credentials
  await page.getByLabel('Email').fill('tester@llamacart.dev');
  await page.getByLabel('Password').fill('LlamaRules123');
  await page.getByTestId('login-submit').click();

  // Verify login succeeded
  await expect(page.getByTestId('user-avatar')).toBeVisible();

  // Save the authenticated state to disk
  await page.context().storageState({ path: STORAGE_STATE });
});
