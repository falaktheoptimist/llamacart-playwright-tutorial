# 🦙 Chapter 2 — Locators

> Find elements the right way: resilient, readable, accessibility-first.

## What you'll learn

- Finding elements by ARIA role with [`getByRole()`](https://playwright.dev/docs/api/class-page#page-get-by-role)
- Finding form inputs by their label with [`getByLabel()`](https://playwright.dev/docs/api/class-page#page-get-by-label)
- Finding inputs by placeholder text with [`getByPlaceholder()`](https://playwright.dev/docs/api/class-page#page-get-by-placeholder)
- Finding elements by visible text with [`getByText()`](https://playwright.dev/docs/api/class-page#page-get-by-text)
- Stable test hooks with [`getByTestId()`](https://playwright.dev/docs/api/class-page#page-get-by-test-id)
- Narrowing locator sets with [`.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter)
- Picking by index with [`.nth()`](https://playwright.dev/docs/api/class-locator#locator-nth)
- Grouping tests and sharing setup with [`test.describe()`](https://playwright.dev/docs/api/class-test#test-describe) and [`test.beforeEach()`](https://playwright.dev/docs/api/class-test#test-before-each)
- Asserting that an element is interactive with [`toBeEnabled()`](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-be-enabled)
- Collecting multiple failures in one run with [`expect.soft()`](https://playwright.dev/docs/api/class-playwrightassertions#playwright-assertions-expect-soft)

## Prerequisites

- Node.js 18+
- Repo cloned and dependencies installed (`npm install` at root, `cd webapp && npm install`)
- Playwright browsers installed (`npx playwright install`)

See the [root README](../../README.md) for full setup instructions.

## Running the tests

```bash
# Run Chapter 2 on Chromium only (fastest)
npx playwright test tests/02-locators --project=chromium

# Run with the interactive UI — great for inspecting each locator step by step
npx playwright test tests/02-locators --ui
```

---

## Test walkthrough

All tests in this chapter live inside a `test.describe` block with a shared `beforeEach` hook that navigates to the shop page before each test. Two tests override this by calling `page.goto('/')` again — explained in those sections.

### `test.describe` and `test.beforeEach`

```typescript
test.describe('Locators — finding elements the right way', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-shop').click();
  });

  // …tests…
});
```

[`test.describe()`](https://playwright.dev/docs/api/class-test#test-describe) groups related tests under a label that appears in reports, making failures easier to read. [`test.beforeEach()`](https://playwright.dev/docs/api/class-test#test-before-each) runs its callback before every test in the group — here it lands on the shop page so each test starts in a known state without repeating navigation code.

---

### Test 1 — "getByRole — find the nav logo link"

```typescript
test('getByRole — find the nav logo link', async ({ page }) => {
  await page.goto('/');
  const logo = page.getByRole('link', { name: /LlamaCart/i });
  await expect(logo).toBeVisible();
});
```

[`getByRole('link', { name: ... })`](https://playwright.dev/docs/api/class-page#page-get-by-role) finds an `<a>` element whose accessible name matches the pattern. This is the **most resilient** locator strategy: it maps to what screen readers and assistive technology expose, so it stays green through class renames, layout changes, and style updates.

This test calls `page.goto('/')` explicitly to start from the homepage, overriding the `beforeEach` shop navigation — the logo link is visible on all pages, but the intent here is to test it in its primary context.

---

### Test 2 — "getByRole — find buttons by name"

```typescript
test('getByRole — find buttons by name', async ({ page }) => {
  await page.goto('/');
  const addButtons = page.getByRole('button', { name: 'Add to Cart' });
  await expect(addButtons).toHaveCount(4); // 4 on featured (home)
});
```

When `getByRole` matches **multiple elements** it returns all of them as a locator collection, just like `getByTestId`. The `{ name: 'Add to Cart' }` option filters by accessible name — the visible button label — which means a copy change from "Add to Cart" to "Buy Now" will catch the test's attention immediately.

#### Assignment — count the buttons on the shop page

The home page has 4 featured products. The shop page has all 8. Remove the `page.goto('/')` override and let `beforeEach` land you on the shop page, then update the count assertion to match:

```bash
npx playwright test tests/02-locators --project=chromium -g "getByRole — find buttons by name"
```

<details>
<summary>Solution</summary>

Remove `await page.goto('/')` so the test starts on the shop page (where `beforeEach` already navigated). Update the count:

```typescript
test('getByRole — find buttons by name', async ({ page }) => {
  const addButtons = page.getByRole('button', { name: 'Add to Cart' });
  await expect(addButtons).toHaveCount(8); // all 8 on shop page
});
```

One of the 8 products is "Out of Stock" and its button is disabled, but it is still present in the DOM, so `toHaveCount(8)` passes. If you want to assert on only the *enabled* buttons, chain `.filter()`:

```typescript
const enabledButtons = page.getByRole('button', { name: 'Add to Cart' }).filter({ hasNot: page.locator('[disabled]') });
```

</details>

---

### Test 3 — "getByRole — find headings"

```typescript
test('getByRole — find headings', async ({ page }) => {
  const heading = page.getByRole('heading', { name: 'All Products' });
  await expect(heading).toBeVisible();
});
```

`getByRole('heading')` matches any `<h1>`–`<h6>` element. Scoping by `{ name: 'All Products' }` pins it to the shop section heading. This is preferable to `page.locator('h2')` because it expresses *intent* — "I expect a heading that says All Products" — rather than a CSS tag that might change.

---

### Test 4 — "getByLabel — fill in login form fields"

```typescript
test('getByLabel — fill in login form fields', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-login').click();

  const loginForm = page.locator('#page-login');
  await loginForm.getByLabel('Email').fill('tester@llamacart.dev');
  await loginForm.getByLabel('Password').fill('LlamaRules123');

  await expect(loginForm.getByLabel('Email')).toHaveValue('tester@llamacart.dev');
});
```

[`getByLabel('Email')`](https://playwright.dev/docs/api/class-page#page-get-by-label) finds the `<input>` whose associated `<label>` text is "Email". This is the right locator for form fields: it matches the label-to-input relationship the browser uses for accessibility, so renaming a `name` attribute or changing a `class` won't break the test.

The login page has both a Login form and a Register form in the DOM at the same time — each has an "Email" input. Calling `page.getByLabel('Email')` on the full page would match both and throw a **strict mode violation** (Playwright refuses to act on an ambiguous locator). Scoping to `page.locator('#page-login')` first ensures `getByLabel` only searches inside the login section.

[`toHaveValue()`](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-have-value) asserts the current value of an `<input>` element — different from `toHaveText()`, which reads text content. Always use `toHaveValue` to verify what a user typed.

#### Assignment — trigger a strict mode violation

Remove the `loginForm` scoping and call `page.getByLabel('Email').fill(...)` directly. Run the test and read the error:

```bash
npx playwright test tests/02-locators --project=chromium -g "getByLabel — fill in login form fields"
```

<details>
<summary>Solution</summary>

Change the test to:

```typescript
await page.getByLabel('Email').fill('tester@llamacart.dev');
```

Playwright will fail immediately with something like:

```
Error: strict mode violation: getByLabel('Email') resolved to 2 elements:
  1) <input id="login-email" …>
  2) <input id="register-email" …>
```

This is intentional — Playwright refuses to guess which element you meant. The fix is always to narrow the locator until exactly one element matches. Restore the `page.locator('#page-login')` scoping to fix it.

</details>

---

### Test 5 — "getByPlaceholder — find the search input"

```typescript
test('getByPlaceholder — find the search input', async ({ page }) => {
  const searchInput = page.getByPlaceholder('Search llama goods...');
  await searchInput.fill('scarf');
  await expect(page.getByTestId('product-card')).toHaveCount(1);
});
```

[`getByPlaceholder()`](https://playwright.dev/docs/api/class-page#page-get-by-placeholder) matches the `placeholder` attribute on an `<input>`. It is useful when inputs have no `<label>` — though adding a label and switching to `getByLabel` is always better for accessibility. Use it as a fallback when the HTML is outside your control.

---

### Test 6 — "getByText — find elements by visible text"

```typescript
test('getByText — find elements by visible text', async ({ page }) => {
  const badge = page.getByText('Out of stock', { exact: true });
  await expect(badge).toBeVisible();
});
```

[`getByText()`](https://playwright.dev/docs/api/class-page#page-get-by-text) searches the visible text content of every element. Without `exact: true` it does a **substring match** — so `getByText('Out of stock')` would also match any element whose text *contains* "Out of stock" as part of a longer string (like a description or button label). Passing `{ exact: true }` restricts the match to elements whose full text is exactly "Out of stock".

#### Assignment — see what happens without `exact: true`

Remove `{ exact: true }` and run the test. Read the strict mode error to understand how many elements match the substring:

```bash
npx playwright test tests/02-locators --project=chromium -g "getByText — find elements by visible text"
```

<details>
<summary>Solution</summary>

Without `exact: true`, `getByText('Out of stock')` performs a substring match and likely hits multiple elements — the badge text, the disabled button label, and any description snippet. Playwright will throw a strict mode violation listing all matches. Restore `{ exact: true }` to pin the locator to the badge element alone.

</details>

---

### Test 7 — "getByTestId — use data-testid attributes"

```typescript
test('getByTestId — use data-testid attributes', async ({ page }) => {
  const cards = page.getByTestId('product-card');
  await expect(cards).toHaveCount(8);
});
```

`data-testid` attributes are **purpose-built hooks for tests** — they carry no styling or semantic meaning and survive refactors that would break CSS selectors or ARIA queries. `getByTestId` is the right choice when the element has no natural accessible role or label, or when the accessible name is unstable.

The trade-off: test IDs couple your test suite to the markup, so removing a `data-testid` silently breaks tests. They are most valuable on dynamic containers (product cards, list items) that don't have a stable role + name.

---

### Test 8 — "chaining — find a specific button inside a specific card"

```typescript
test('chaining — find a specific button inside a specific card', async ({ page }) => {
  const braceletCard = page.getByTestId('product-card')
    .filter({ hasText: 'Alpaca Friendship Bracelet' });
  await braceletCard.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('toast')).toBeVisible();
});
```

[`.filter({ hasText: '...' })`](https://playwright.dev/docs/api/class-locator#locator-filter) narrows a locator that matches many elements down to only those that contain a given text string. Here it takes all 8 product cards and keeps only the one with "Alpaca Friendship Bracelet" in its text content.

Calling `.getByTestId('add-to-cart')` on the filtered card then **scopes the search** to inside that card — so the click targets the correct button even though every card has an `add-to-cart` element. This is the standard pattern for interacting with items in a list when you know which item you want by name.

#### Assignment — chain a `getByRole` instead of `getByTestId`

Replace `braceletCard.getByTestId('add-to-cart')` with a role-based locator that finds the same button:

```bash
npx playwright test tests/02-locators --project=chromium -g "chaining — find a specific button inside a specific card"
```

<details>
<summary>Solution</summary>

```typescript
await braceletCard.getByRole('button', { name: 'Add to Cart' }).click();
```

Both locators work. `getByRole` is more resilient to `data-testid` renames; `getByTestId` is more resilient to button label copy changes. In practice, `getByRole` is the preferred default — fall back to `getByTestId` only when no good ARIA role exists.

</details>

---

### Test 9 — "nth() — interact with the third product card"

```typescript
test('nth() — interact with the third product card', async ({ page }) => {
  const thirdCard = page.getByTestId('product-card').nth(2);
  const name = await thirdCard.getByTestId('product-name').textContent();
  await thirdCard.click();
  await expect(page.getByTestId('detail-product-name')).toHaveText(name!);
});
```

[`.nth(n)`](https://playwright.dev/docs/api/class-locator#locator-nth) picks a single element from a multi-match locator by zero-based index — `.nth(0)` is equivalent to `.first()`, `.nth(2)` is the third match.

The pattern here — capture a value, perform an action, assert the value carried over — is the same as Test 8 from Chapter 1. It is useful any time navigation should preserve context: clicking a card should open *that* card's detail page, not a random one.

---

### Test 10 — "locator assertions — visible, enabled, count"

```typescript
test('locator assertions — visible, enabled, count', async ({ page }) => {
  await expect(page.getByTestId('search-input')).toBeVisible();
  await expect(page.getByTestId('filter-all')).toBeEnabled();
  await expect(page.getByTestId('product-card')).toHaveCount(8);
  await expect(page.getByTestId('product-count')).toContainText('8 items');
});
```

This test demonstrates three assertions you'll use constantly:

| Assertion | What it checks |
|---|---|
| [`toBeVisible()`](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-be-visible) | Element is in the DOM, not hidden, and has non-zero size |
| [`toBeEnabled()`](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-be-enabled) | Element is not `disabled` and can be interacted with |
| [`toHaveCount(n)`](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-have-count) | Locator matches exactly `n` elements |
| [`toContainText()`](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-contain-text) | Element's text includes the given substring |

All Playwright assertions **auto-retry** until the condition is met or the timeout expires. There is no need for `waitForSelector` or manual sleeps.

---

### Test 11 — "soft assertions — continue test even after a failure"

```typescript
test('soft assertions — continue test even after a failure', async ({ page }) => {
  const cards = page.getByTestId('product-card');

  await expect.soft(cards).toHaveCount(8);
  await expect.soft(page.getByTestId('search-input')).toBeVisible();
});
```

[`expect.soft()`](https://playwright.dev/docs/api/class-playwrightassertions#playwright-assertions-expect-soft) marks an assertion as non-fatal: if it fails, the test continues executing instead of stopping. All soft failures are collected and reported together at the end.

Use soft assertions when you want to capture the full state of a page in a single test run — for example, checking that every element on a dashboard renders correctly, where stopping at the first broken element would hide all the others. For most tests, hard assertions (plain `expect()`) are the right default: stopping early gives a cleaner failure signal and avoids cascading errors.

#### Assignment — make one soft assertion fail

Change `toHaveCount(8)` to `toHaveCount(9)` and run the test. Observe that the second assertion still runs and its result is also reported:

```bash
npx playwright test tests/02-locators --project=chromium -g "soft assertions — continue test even after a failure"
```

<details>
<summary>Solution</summary>

With `toHaveCount(9)`, the first soft assertion fails but the test keeps going. The output will list both results:

```
1 failed
  ● soft assertion 1: expect(locator).toHaveCount(expected)
    Expected: 9
    Received: 8
```

The second assertion (`toBeVisible`) passes normally. The test is ultimately marked as failed because at least one soft assertion did not pass. Restore `toHaveCount(8)` to fix it.

</details>

---

## Summary

| Test | Key concept | API used |
|---|---|---|
| 1 | Find a link by ARIA role | [`getByRole('link')`](https://playwright.dev/docs/api/class-page#page-get-by-role) |
| 2 | Find multiple buttons by accessible name | [`getByRole('button')`](https://playwright.dev/docs/api/class-page#page-get-by-role) + [`toHaveCount()`](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-have-count) |
| 3 | Find a heading by name | [`getByRole('heading')`](https://playwright.dev/docs/api/class-page#page-get-by-role) |
| 4 | Fill form fields, avoid strict mode violations | [`getByLabel()`](https://playwright.dev/docs/api/class-page#page-get-by-label) + scoped locator |
| 5 | Find an input by placeholder | [`getByPlaceholder()`](https://playwright.dev/docs/api/class-page#page-get-by-placeholder) |
| 6 | Match visible text, exact vs partial | [`getByText()`](https://playwright.dev/docs/api/class-page#page-get-by-text) + `{ exact: true }` |
| 7 | Stable test hooks | [`getByTestId()`](https://playwright.dev/docs/api/class-page#page-get-by-test-id) |
| 8 | Filter a list, chain locators | [`.filter({ hasText })`](https://playwright.dev/docs/api/class-locator#locator-filter) |
| 9 | Pick by index, capture across navigation | [`.nth()`](https://playwright.dev/docs/api/class-locator#locator-nth) + `textContent()` |
| 10 | Core assertions: visible, enabled, count | `toBeVisible()` · `toBeEnabled()` · `toHaveCount()` |
| 11 | Collect multiple failures in one run | [`expect.soft()`](https://playwright.dev/docs/api/class-playwrightassertions#playwright-assertions-expect-soft) |
