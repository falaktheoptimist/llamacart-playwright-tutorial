# 🦙 Chapter 6 — Visual Regression Testing

> Catch unintended UI changes before your users do — automatically.

## What you'll learn

- How [`toHaveScreenshot()`](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1) works: baselines, comparisons, and failure artefacts
- Full-page screenshots vs element-level screenshots
- [`animations: 'disabled'`](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1) — freezing CSS animations for deterministic frames
- `maxDiffPixelRatio` and `maxDiffPixels` — calibrating tolerance for cross-environment noise
- `threshold` — per-pixel colour sensitivity from exact (`0`) to anything (`1`)
- `mask` — hiding dynamic regions so they never cause false failures
- How to update baselines after an intentional UI change

## Prerequisites

- Node.js 18+
- Repo cloned and dependencies installed (`npm install` at root, `cd webapp && npm install`)
- Playwright browsers installed (`npx playwright install`)

See the [root README](../../README.md) for full setup instructions.

## Running the tests

```bash
# Run Chapter 6 on Chromium only
# Visual tests must be pinned to one browser — snapshots are not portable across engines
npx playwright test tests/06-visual-testing --project=chromium

# Update baselines after an intentional UI change
npx playwright test tests/06-visual-testing --project=chromium --update-snapshots

# Run with the interactive UI — inspect diffs in the browser
npx playwright test tests/06-visual-testing --ui
```

---

## Core concepts

### How `toHaveScreenshot()` works

The API is one line, but the behaviour changes based on whether a baseline exists.

**First run** — no baseline yet. Playwright takes a screenshot and writes it to a `visual.spec.ts-snapshots/` folder next to the spec file. The test passes automatically because there is nothing to compare against. The written file becomes the golden baseline for every future run.

**Every run after that** — Playwright takes a new screenshot and diffs it pixel-by-pixel against the baseline. If the difference exceeds the configured tolerance the test fails, and three artefacts are saved alongside the test results:

| File | What it shows |
|---|---|
| `*-expected.png` | The stored baseline |
| `*-actual.png` | What Playwright captured this run |
| `*-diff.png` | Changed pixels highlighted in magenta |

**Updating baselines** — when a UI change is intentional, regenerate all baselines with `--update-snapshots`. Commit the new snapshots to version control so CI uses them going forward.

### Snapshot naming and platform suffixes

Playwright appends the browser name and OS to every snapshot filename automatically:

```
visual.spec.ts-snapshots/
  homepage-chromium-linux.png
  homepage-chromium-darwin.png   ← different baseline for macOS
```

This means baselines from your Linux CI machine will not match your macOS laptop — and that's by design. Commit the snapshots generated in your CI environment and use those as the canonical baseline.

### Why pin to one browser

Font hinting, sub-pixel antialiasing, and shadow rendering all differ across browser engines and operating systems. A snapshot taken in Chromium on Linux will fail in Firefox or WebKit even when the UI is pixel-perfect on both. Pick one browser for visual tests (Chromium is the most common choice) and run them in a consistent environment.

### `animations: 'disabled'`

CSS transitions and keyframe animations produce different frames depending on the exact millisecond the screenshot is taken. Setting `animations: 'disabled'` snaps every animated element to its final state before capturing, making the shot deterministic regardless of timing.

```typescript
await expect(page).toHaveScreenshot('homepage.png', {
  animations: 'disabled',
});
```

Always set this unless you are specifically testing an animation state.

### Tolerance options

Three separate knobs control how much the actual screenshot is allowed to differ from the baseline.

#### `maxDiffPixelRatio` — percentage of the image

```typescript
await expect(page).toHaveScreenshot('shop.png', {
  maxDiffPixelRatio: 0.01,  // up to 1% of pixels may differ
});
```

Good default for full-page screenshots. A 1% budget on a 1280×720 image allows roughly 9 000 pixels to differ — enough to absorb font-hinting noise without letting real regressions through.

#### `maxDiffPixels` — absolute pixel count

```typescript
await expect(firstCard).toHaveScreenshot('product-card-loose.png', {
  maxDiffPixels: 200,
});
```

Useful for element-level screenshots where the element size is known and fixed. An absolute budget is easier to reason about than a ratio when the element is small.

#### `threshold` — per-pixel colour sensitivity

```typescript
await expect(firstCard).toHaveScreenshot('product-card-strict.png', {
  threshold: 0,  // every channel of every pixel must match exactly
});
```

`threshold` controls how much two pixels can differ in colour before being counted as different (0 = exact match, 1 = any colour is acceptable). It is independent of `maxDiffPixelRatio` and `maxDiffPixels` — all three can be combined.

| Setting | When to use |
|---|---|
| `threshold: 0` | Locked CI environments where rendering is byte-identical across runs |
| `threshold: 0.1–0.2` (default) | Most projects — absorbs sub-pixel antialiasing without hiding real changes |
| `maxDiffPixelRatio: 0.01` | Full-page screenshots with font rendering noise |
| `maxDiffPixels: 100–200` | Small, fixed-size components |

### `mask` — neutralising dynamic content

Some regions legitimately change between runs: prices fetched from an API, timestamps, personalised recommendations, session tokens in avatars. `mask` replaces those regions with a solid magenta rectangle *before* the diff is computed, so they never cause a failure.

```typescript
await expect(page).toHaveScreenshot('cart-masked.png', {
  mask: [
    page.getByTestId('cart-subtotal'),
    page.getByTestId('cart-shipping'),
    page.getByTestId('cart-total'),
  ],
});
```

The masked regions appear magenta in both the baseline and the actual screenshot, so the diff image always shows zero difference for those areas.

### Element-level screenshots

Scope `toHaveScreenshot()` to a locator instead of the whole page to get a tighter, component-level check. Element screenshots are faster to compute, produce smaller files, and fail only when *that* component changes — unrelated page changes don't trigger them.

```typescript
const firstCard = page.getByTestId('product-card').first();
await expect(firstCard).toHaveScreenshot('product-card.png', {
  animations: 'disabled',
});
```

Use element screenshots for design-system components (buttons, cards, modals) and full-page screenshots for layout and spacing.

---

## Test walkthrough

### "homepage — full page matches baseline"

```typescript
await page.goto('/');
await expect(page).toHaveScreenshot('homepage.png', {
  animations: 'disabled',
  maxDiffPixelRatio: 0.01,
});
```

The simplest possible visual test. `animations: 'disabled'` ensures the hero gradient renders in its final state. `maxDiffPixelRatio: 0.01` gives a 1% tolerance for sub-pixel font differences across environments.

---

### "shop page — product grid matches baseline"

```typescript
await page.getByTestId('hero-shop-btn').click();
await expect(page.getByTestId('product-card').first()).toBeVisible();
await expect(page).toHaveScreenshot('shop.png', { animations: 'disabled', maxDiffPixelRatio: 0.01 });
```

The explicit `toBeVisible()` wait before the screenshot is critical. Playwright's click resolves as soon as the JavaScript event fires, but the product grid renders asynchronously. Without the wait, the screenshot might capture an empty grid and lock in an incorrect baseline.

#### Assignment — catch a CSS regression in the product grid

Try changing the grid gap in `webapp/index.html`:

```css
/* find this in index.html */
.products-grid {
  gap: 1.25rem;   /* change to 3rem */
}
```

Run the tests without `--update-snapshots`. Observe the diff artefacts in `test-results/`. Then revert the change and run again to confirm the tests go green.

```bash
npx playwright test tests/06-visual-testing --project=chromium -g "shop page"
```

<details>
<summary>What to expect</summary>

The test fails with a pixel-diff error. In `test-results/` you'll find three files:
- `shop-expected.png` — the original grid with `1.25rem` gaps
- `shop-actual.png` — the new screenshot with `3rem` gaps
- `shop-diff.png` — every shifted pixel highlighted in magenta

This is exactly the feedback loop visual regression testing is designed to provide: the diff image shows *where* the change is, not just *that* something changed.

</details>

---

### "order success page — matches baseline"

```typescript
await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
await page.getByTestId('cart-button').click();
await page.getByTestId('checkout-btn').click();
await expect(page.getByText('Order placed!')).toBeVisible();
await expect(page).toHaveScreenshot('order-success.png', { ... });
```

Note the `toBeVisible()` guard on `Order placed!` before the screenshot. The order-success page renders after a synchronous JavaScript state change, but the guard makes the wait explicit and the intent clear — the screenshot should capture the *confirmed* success state.

---

### "nav bar — element screenshot matches baseline"

```typescript
await expect(page.locator('nav')).toHaveScreenshot('nav.png', {
  animations: 'disabled',
});
```

A narrow element screenshot. Any change to the logo, spacing, or nav links will fail this test while leaving all the page-level tests green, immediately pointing you to the nav as the source of the regression.

---

### "product card — element screenshot matches baseline"

```typescript
const firstCard = page.getByTestId('product-card').first();
await expect(firstCard).toBeVisible();
await expect(firstCard).toHaveScreenshot('product-card.png', { animations: 'disabled' });
```

Wait for `toBeVisible()` before snapping. Without it, the card locator resolves before the shop page has rendered its grid, and `toHaveScreenshot` captures an element that has not yet been painted.

#### Assignment — add a screenshot for the out-of-stock card

Product 6 ("Llama Hair Pins") has `inStock: false`. Add a test that screenshots that specific card to lock in the visual treatment of the disabled/out-of-stock state.

```bash
npx playwright test tests/06-visual-testing --project=chromium -g "product card"
```

<details>
<summary>Solution</summary>

```typescript
test('product card — out-of-stock state matches baseline', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('hero-shop-btn').click();

  const oosCard = page.getByTestId('product-card')
    .filter({ hasText: 'Llama Hair Pins' });
  await expect(oosCard).toBeVisible();

  await expect(oosCard).toHaveScreenshot('product-card-oos.png', {
    animations: 'disabled',
  });
});
```

Run with `--update-snapshots` once to create the baseline, then run normally. If someone later removes the `out-of-stock` CSS class or changes the disabled button style, this test will catch it.

</details>

---

### "cart item — element screenshot matches baseline"

```typescript
const firstItem = page.getByTestId('cart-item').first();
await expect(firstItem).toBeVisible();
await expect(firstItem).toHaveScreenshot('cart-item.png', { animations: 'disabled' });
```

An element screenshot of a single cart row. Catches regressions in the quantity controls, item layout, or remove button without depending on the full cart page rendering correctly.

---

### "cart page — mask price summary to isolate layout changes"

```typescript
await expect(page).toHaveScreenshot('cart-masked.png', {
  animations: 'disabled',
  maxDiffPixelRatio: 0.01,
  mask: [
    page.getByTestId('cart-subtotal'),
    page.getByTestId('cart-shipping'),
    page.getByTestId('cart-total'),
  ],
});
```

The cart summary numbers are computed from fixed product prices here, so they won't actually vary — but the pattern is important. In a real app those figures come from an API. Masking them means the test asserts the *layout* of the cart page (columns aligned, summary box present, checkout button styled correctly) without being brittle to data changes.

#### Assignment — add a mask for the cart item name

Extend the test to also mask `cart-item-name` and `cart-item-price`. This simulates a product catalogue where names and prices change frequently but the row layout must stay consistent.

<details>
<summary>Solution</summary>

```typescript
mask: [
  page.getByTestId('cart-item-name'),
  page.getByTestId('cart-item-price'),
  page.getByTestId('cart-subtotal'),
  page.getByTestId('cart-shipping'),
  page.getByTestId('cart-total'),
],
```

With all data fields masked, the test becomes a pure layout assertion. It will catch: columns shifting, the summary box moving, the checkout button changing style — and ignore: any product name or price change.

</details>

---

### "shop page — mask cart badge to isolate grid layout"

```typescript
mask: [page.locator('#cart-count')],
```

The cart badge count changes every time an item is added. If two tests added different numbers of items before this one, the badge would show a different number and the screenshot would differ. Masking `#cart-count` isolates the grid layout assertion from cart state carried in from other interactions.

---

### "product card — strict: zero tolerance for pixel drift"

```typescript
await expect(firstCard).toHaveScreenshot('product-card-strict.png', {
  threshold: 0,
  animations: 'disabled',
});
```

`threshold: 0` means every colour channel of every pixel must match exactly. This will fail on any machine where font rendering differs from where the baseline was generated. Only use it when your test environment is locked (Docker image with pinned fonts, same GPU, same OS version) and you need maximum sensitivity for subtle colour or shadow regressions.

---

### "product card — loose: allow up to 200 pixels to differ"

```typescript
await expect(firstCard).toHaveScreenshot('product-card-loose.png', {
  maxDiffPixels: 200,
  animations: 'disabled',
});
```

An absolute pixel budget rather than a ratio. On a ~200×300 pixel card, 200 differing pixels is roughly 0.3% — lenient enough to survive font hinting differences while still catching a misaligned layout or a missing element.

---

## Summary

| Test | Technique | Key concept |
|---|---|---|
| homepage | `toHaveScreenshot` + `maxDiffPixelRatio` | Full-page baseline; 1% tolerance for font noise |
| shop page | wait then screenshot | Always assert an element is visible before snapping |
| order success | `toBeVisible()` guard | Confirm the target state before capturing it |
| nav bar | element-scoped screenshot | Narrow scope → precise regression signal |
| product card | element-scoped screenshot | Component-level visual check |
| cart item | element-scoped screenshot | Row layout locked independently of page |
| cart masked | `mask: [locators]` | Isolate layout from dynamic data |
| shop with badge | `mask: [#cart-count]` | Isolate grid from cart state |
| strict threshold | `threshold: 0` | Maximum sensitivity in locked environments |
| loose threshold | `maxDiffPixels: 200` | Absolute budget for small, fixed-size elements |

### When to reach for each technique

| Scenario | Technique |
|---|---|
| Lock in the overall page layout | Full-page `toHaveScreenshot` with `maxDiffPixelRatio: 0.01` |
| Lock in a specific component | Element-scoped `locator.toHaveScreenshot()` |
| Prices, timestamps, or API-driven text on the page | `mask: [locator]` for each dynamic region |
| Flaky tests from CSS animation timing | `animations: 'disabled'` |
| Locked Docker/CI environment, need maximum sensitivity | `threshold: 0` |
| Small component, font noise causing false failures | `maxDiffPixels: N` instead of a ratio |
| UI intentionally changed | `--update-snapshots` then commit the new baselines |
| Debugging a failure | Open `test-results/*-diff.png` — magenta pixels show exactly what changed |
