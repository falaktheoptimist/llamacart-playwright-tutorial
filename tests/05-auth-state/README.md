# 🦙 Chapter 5 — Auth State (storageState)

> Log in once. Reuse the session everywhere. No more logging in on every test.

## What you'll learn

- Saving browser storage state to a file with [`page.context().storageState()`](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)
- Reusing saved state in a new browser context with [`browser.newContext({ storageState })`](https://playwright.dev/docs/api/class-browser#browser-new-context)
- Enforcing test order within a file using [`test.describe.serial`](https://playwright.dev/docs/api/class-test#test-describe-serial)
- The recommended project-based pattern for auth setup in real test suites

## Prerequisites

- Node.js 18+
- Repo cloned and dependencies installed (`npm install` at root, `cd webapp && npm install`)
- Playwright browsers installed (`npx playwright install`)

See the [root README](../../README.md) for full setup instructions.

## Running the tests

```bash
# Run Chapter 5 on Chromium only
npx playwright test tests/05-auth-state --project=chromium

# Run with the interactive UI — watch the auth file get written and reused
npx playwright test tests/05-auth-state --ui
```

---

## Core concepts

### `page.context().storageState({ path })`

After a successful login, call this to snapshot the current browser context — `localStorage`, `sessionStorage`, and cookies — into a JSON file on disk.

```typescript
await page.context().storageState({ path: 'playwright/.auth/user.json' });
```

The file contains everything the browser holds that proves the user is authenticated. For LlamaCart that's the `llamacart_user` key in `localStorage`.

### `browser.newContext({ storageState })`

Seed a brand-new browser context with the saved state. The browser behaves as if the user already went through the login flow — no navigation to the login page, no form filling.

```typescript
const context = await browser.newContext({
  storageState: 'playwright/.auth/user.json',
});
const page = await context.newPage();
```

### `test.describe.serial`

By default, Playwright runs tests in parallel across workers. `test.describe.serial` forces all tests inside the block to run sequentially in order. This is necessary here because the reuse tests depend on the auth file that the setup test writes.

```typescript
test.describe.serial('auth state', () => {
  test('setup — save state', ...);   // runs first
  test('reuse — already logged in', ...); // runs second
});
```

### The recommended project-based pattern

For full test suites, the idiomatic approach is a dedicated setup *project* in `playwright.config.ts`. This scales better than `describe.serial` because setup runs once globally, not once per file:

```typescript
projects: [
  { name: 'setup', testMatch: '**/auth.setup.ts' },
  {
    name: 'chromium',
    use: { storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
]
```

With `dependencies: ['setup']`, Playwright guarantees the setup project completes before any `chromium` tests start. Every test in the `chromium` project then launches with the saved storage state pre-loaded — no explicit `newContext` call needed.

---

## The page under test

LlamaCart's home page has a **Login** button in the nav bar. Clicking it opens a modal with email and password fields. On a successful login, the modal closes and a user avatar appears in the nav bar — the presence of `[data-testid="user-avatar"]` is the canonical signal that the user is authenticated.

The auth data is stored in `localStorage` under the key `llamacart_user`. `storageState` captures this, so a new context seeded with the snapshot starts with `llamacart_user` already set — the app reads it on load and renders the avatar immediately, before any interaction.

---

## Test walkthrough

### `describe.serial` block — auth state

---

#### Test 1 — "auth setup — save logged-in state"

```typescript
test('auth setup — save logged-in state', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-login').click();
  await page.getByTestId('login-email').fill('tester@llamacart.dev');
  await page.getByTestId('login-password').fill('LlamaRules123');
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('user-avatar')).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
```

This is the only test in the chapter that actually touches the login form. After `login-submit`, the test waits for `user-avatar` to be visible before saving state — this is critical. Saving state before the app finishes processing the login would capture a pre-auth snapshot and the reuse tests would start logged out.

`getByTestId` is used instead of `getByLabel` because both the login form and the register form on the same page share the label text "Email" and "Password". `getByLabel` would match two elements and throw a strict-mode violation.

#### Assignment — assert the auth file was written

After `storageState`, assert that the file exists and is non-empty:

```typescript
import fs from 'fs';

const contents = fs.readFileSync(AUTH_FILE, 'utf-8');
expect(contents.length).toBeGreaterThan(0);
```

Run it:

```bash
npx playwright test tests/05-auth-state --project=chromium -g "save logged-in state"
```

<details>
<summary>Solution</summary>

```typescript
import fs from 'fs';

test('auth setup — save logged-in state', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-login').click();
  await page.getByTestId('login-email').fill('tester@llamacart.dev');
  await page.getByTestId('login-password').fill('LlamaRules123');
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('user-avatar')).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });

  const contents = fs.readFileSync(AUTH_FILE, 'utf-8');
  expect(contents.length).toBeGreaterThan(0);
});
```

You could also parse the JSON and assert that `origins` contains an entry with the `llamacart_user` key in `localStorage` — but checking that the file is non-empty is enough for most purposes.

</details>

---

#### Test 2 — "reuse saved auth state — already logged in"

```typescript
test('reuse saved auth state — already logged in', async () => {
  const browser = await chromium.launch();

  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();

  await page.goto('/');

  await expect(page.getByTestId('user-avatar')).toBeVisible();

  await browser.close();
});
```

Notice the test receives no fixtures (`async ()` with no arguments). It launches its own browser rather than using the `{ page }` fixture, because the fixture-provided context is always fresh — there's no way to seed it with `storageState` from inside the test body. When you need full control over the browser context, launch it manually.

The `user-avatar` check passes without any login interaction. The app reads `llamacart_user` from `localStorage` on page load and renders the authenticated nav immediately.

`browser.close()` at the end cleans up all pages and contexts created from this browser. Forgetting it leaks a browser process for the duration of the test run.

#### Assignment — assert the user's display name is visible

LlamaCart shows the logged-in user's name in the nav area. After loading with the saved state, find and assert it:

```bash
npx playwright test tests/05-auth-state --project=chromium -g "already logged in"
```

<details>
<summary>Solution</summary>

```typescript
await expect(page.getByTestId('user-avatar')).toBeVisible();
await expect(page.getByTestId('user-name')).toContainText('Alex');
```

Inspect the nav bar with Playwright's `--headed` flag or UI mode to find the correct test ID. The `toContainText` matcher is more resilient than `toHaveText` — it passes as long as the expected string appears anywhere in the element's text, so a full name like "Alex Llama" won't break the assertion.

</details>

---

#### Test 3 — "saved auth state persists across navigation"

```typescript
test('saved auth state persists across navigation', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();

  await page.goto('/');
  await page.getByTestId('nav-shop').click();

  await expect(page.getByTestId('user-avatar')).toBeVisible();

  await browser.close();
});
```

This test verifies that auth state isn't lost when the user navigates to a different page. A common bug in SPA apps is that a page transition re-initialises state from a default value rather than reading from storage — this test catches that.

The shop page is a good navigation target because it's a real route change, not just a modal or scroll. If the avatar disappears after `nav-shop`, the app is not correctly reading auth from `localStorage` on client-side navigation.

#### Assignment — navigate to a second page and check again

Add a second navigation to a different section of the site and re-assert `user-avatar`:

```bash
npx playwright test tests/05-auth-state --project=chromium -g "persists across navigation"
```

<details>
<summary>Solution</summary>

```typescript
await page.goto('/');
await page.getByTestId('nav-shop').click();
await expect(page.getByTestId('user-avatar')).toBeVisible();

await page.getByTestId('nav-home').click();
await expect(page.getByTestId('user-avatar')).toBeVisible();
```

Each navigation re-runs the app's boot sequence. Asserting after each one provides a tighter guarantee that auth state is correctly persisted throughout a user's session.

</details>

---

## Summary

| Test | Technique | Key concept |
|---|---|---|
| 1 — save logged-in state | `page.context().storageState({ path })` | Save *after* confirming login is complete, not before |
| 2 — reuse saved state | `browser.newContext({ storageState })` | Launch a manual browser to seed the context; fixture `page` is always fresh |
| 3 — persists across navigation | navigate + re-assert `user-avatar` | Catches SPAs that drop auth state on client-side route changes |

### When to reach for each technique

| Scenario | Technique |
|---|---|
| Log in once for an entire test suite | Project-based setup with `dependencies: ['setup']` in config |
| Log in once for a group of tests in one file | `test.describe.serial` with a setup test first |
| Need full control over browser context within a test | `chromium.launch()` + `browser.newContext({ storageState })` |
| Verify a specific page renders correctly when authenticated | Seed `storageState` and assert without touching the login form |
| Test that auth survives page reloads or navigation | Load with `storageState`, navigate, re-assert the auth indicator |
