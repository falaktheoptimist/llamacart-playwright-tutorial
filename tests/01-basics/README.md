# 🦙 Chapter 1 — Your First Playwright Tests

> From zero to running tests in minutes.

## What you'll learn

- Navigating to a page with `page.goto()`
- Asserting the page title with `expect(page).toHaveTitle()`
- Finding elements by role with `getByRole()`
- Finding elements by test ID with `getByTestId()`
- Asserting visibility with `toBeVisible()`
- Counting elements with `toHaveCount()`
- Partial text matching with `toContainText()`
- Typing into inputs with `fill()`
- Reading element text with `textContent()`

## Prerequisites

- Node.js 18+
- Repo cloned and dependencies installed (`npm install` at root, `cd webapp && npm install`)
- Playwright browsers installed (`npx playwright install`)

See the [root README](../../README.md) for full setup instructions.

## Running the tests

```bash
# Run Chapter 1 on Chromium only (fastest)
npx playwright test tests/01-basics --project=chromium

# Run with the interactive UI — great for exploring step by step
npx playwright test tests/01-basics --ui
```

## The app under test

LlamaCart is a small e-commerce store selling handcrafted llama goods — wool scarves, alpaca snacks, friendship bracelets, and more. It's built with vanilla HTML + JavaScript and served by Vite.

![Home page showing the LlamaCart hero and featured products](./assets/home-page.png)

The shop lists all 8 products with category filters and a live search bar.

![Shop page showing all 8 product cards](./assets/shop-page.png)

> **Note — single-page app:** LlamaCart is an SPA. All navigation happens by toggling CSS classes in JavaScript — the URL stays at `/` throughout. Our tests always start with `page.goto('/')` and interact with in-app controls from there.

---

## Test walkthrough

### Test 1 — "homepage loads with correct title"

```typescript
test('homepage loads with correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/LlamaCart/);
});
```

`page.goto('/')` navigates the browser to the base URL defined in `playwright.config.ts` (`http://localhost:5173`). Playwright waits for the page to load before moving on.

`expect(page).toHaveTitle()` asserts the `<title>` element. Passing a **regex** (`/LlamaCart/`) means the title only needs to *contain* "LlamaCart" — useful when titles include extra text like "LlamaCart 🦙".

---

### Test 2 — "homepage shows the hero heading"

```typescript
test('homepage shows the hero heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Made by llamas/i })).toBeVisible();
});
```

`getByRole('heading', { name: ... })` is the **accessibility-first** way to find headings — it maps directly to ARIA roles and matches what screen readers see. The `i` flag on the regex makes the match case-insensitive, so the test stays green even if the copy changes capitalisation.

`toBeVisible()` checks the element is in the DOM, not hidden via `display: none` / `visibility: hidden`, and has non-zero dimensions.

---

### Test 3 — 'clicking "Shop the Collection" navigates to the shop'

```typescript
test('clicking "Shop the Collection" navigates to the shop', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('hero-shop-btn').click();
  await expect(page.getByTestId('product-card').first()).toBeVisible();
});
```

`getByTestId('hero-shop-btn')` finds an element by its `data-testid` attribute. Test IDs are **stable** — they don't change with copy edits or style tweaks, which makes tests less brittle.

After `click()`, the SPA swaps pages via JavaScript. Playwright transparently handles this: `toBeVisible()` will retry until the product card appears or the test times out.

---

### Test 4 — "product cards are visible in the shop"

```typescript
test('product cards are visible in the shop', async ({ page }) => {
