# 🦙 Chapter 7 — CI/CD Patterns

> Write tests that pass reliably in a pipeline — not just on your laptop.

## What you'll learn

- [`test.skip`](https://playwright.dev/docs/api/class-test#test-skip) and [`test.fixme`](https://playwright.dev/docs/api/class-test#test-fixme) — conditionally skip or mark broken tests
- [`test.slow()`](https://playwright.dev/docs/api/class-test#test-slow) — extend the timeout for a single known-slow test
- Retry-safe assertion patterns — why `toHaveCount` beats `count()`, and why you assert final state rather than intermediate steps
- Environment variables — wiring `BASE_URL` from the environment into `playwright.config.ts`
- Tags and `--grep` — running targeted subsets of your suite
- Test isolation — how Playwright's per-test browser contexts keep tests independent
- Sharding — splitting a test suite across parallel CI workers

## Prerequisites

- Node.js 18+
- Repo cloned and dependencies installed (`npm install` at root, `cd webapp && npm install`)
- Playwright browsers installed (`npx playwright install`)

See the [root README](../../README.md) for full setup instructions.

## Running the tests

```bash
# Run Chapter 7 on Chromium only
npx playwright test tests/07-ci-cd --project=chromium

# Simulate a CI environment (sets CI=true)
CI=true npx playwright test tests/07-ci-cd --project=chromium

# Run only smoke-tagged tests
npx playwright test tests/07-ci-cd --grep @smoke

# Run only the regression suite
npx playwright test tests/07-ci-cd --grep @regression

# Run with the interactive UI
npx playwright test tests/07-ci-cd --ui
```

---

## Core concepts

### `test.skip` — conditional skip

Skip a test entirely when a condition is true. The test is reported as skipped, not failed.

```typescript
test('visual test', async ({ page }) => {
  test.skip(isCI, 'Skipping visual test on CI — no display');
  // runs locally only
});
```

`test.skip(condition, reason)` must be called at the top of the test body, before any `await`. The second argument appears in the HTML report next to the skipped test.

### `test.fixme` — expected-to-fail

Mark a test that is broken and waiting for a fix. Playwright runs it but reports it as `fixme` instead of a failure, so it doesn't block CI while the underlying bug is tracked.

```typescript
test.fixme(true, 'Tracked in issue #42 — broken after checkout redesign');
```

Unlike `test.skip`, `fixme` communicates intent: the test *will* be fixed, it's just not fixed yet. Prefer it over commenting out a test or adding a `// TODO`.

### `test.slow()` — tripled timeout

Call `test.slow()` at the start of a test body to give it three times the default timeout. Use it for tests that involve slow network calls, large uploads, or third-party redirects.

```typescript
test('slow test', async ({ page }) => {
  test.slow();
  // now has 3× the default timeout
});
```

This is better than setting a large global timeout, which would mask genuinely slow tests elsewhere.

### Retry-safe assertion patterns

Playwright retries `expect` assertions until they pass or the timeout expires. This makes them robust to network delays and async rendering. Direct DOM reads do not retry.

```typescript
// BAD — page.evaluate / count() read the DOM once and return immediately
const count = await page.getByTestId('product-card').count();
expect(count).toBe(8); // flaky if the grid hasn't rendered yet

// GOOD — toHaveCount() retries until the DOM settles
await expect(page.getByTestId('product-card')).toHaveCount(8);
```

The same principle applies to intermediate UI state. Toasts, spinners, and loading indicators are transient — asserting them creates a race condition. Assert the *final* state instead:

```typescript
// BAD — toast disappears before the assertion can verify it reliably
await expect(page.getByTestId('toast')).toBeVisible();

// GOOD — the cart count is stable and reflects the outcome
await expect(page.locator('#cart-count')).toHaveText('1');
```

### Environment variables and `BASE_URL`

`playwright.config.ts` reads `process.env.BASE_URL` so you can point the suite at any environment without changing test code:

```bash
BASE_URL=https://staging.llamacart.dev npx playwright test
```

Inside tests, use `page.goto('/')` — Playwright prepends the configured `baseURL` automatically. Never hardcode hostnames in test files.

### Tags and `--grep`

Playwright has no built-in tag system, but embedding a tag string in the test title and using `--grep` achieves the same result:

```bash
npx playwright test --grep @smoke          # run smoke tests only
npx playwright test --grep-invert @slow    # skip slow tests
```

Useful tags to establish early: `@smoke` (run on every PR), `@regression` (run before a release), `@slow` (skip on limited-time pipelines).

### Test isolation

Playwright creates a fresh browser context for every test by default. Each context has its own cookies, `localStorage`, and `sessionStorage` — completely isolated from every other test, including tests running in parallel.

```typescript
test('fresh context', async ({ page }) => {
  await page.goto('/');
  // cart-count is 0 — no items carried over from any other test
  await expect(page.locator('#cart-count')).toHaveText('0');
});
```

This means you can add items to cart in one test without affecting another. The tradeoff: every test must set up its own state from scratch — there's no shared login session or pre-populated cart unless you use `storageState` (see Chapter 5).

### Sharding

Sharding splits your suite into N equal parts, each running in a separate CI job. The total wall-clock time drops by roughly 1/N.

```bash
npx playwright test --shard=1/3   # first third of the suite
npx playwright test --shard=2/3
npx playwright test --shard=3/3
```

In GitHub Actions, use a matrix strategy:

```yaml
strategy:
  matrix:
    shardIndex: [1, 2, 3]
    shardTotal: [3]
steps:
  - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

After all shards finish, merge their blob reports into a single HTML report:

```bash
npx playwright merge-reports --reporter html ./all-blob-reports
```

---

## Test walkthrough

### `test.skip` — "skip on CI — visual test that needs a real browser"

```typescript
test.skip(isCI, 'Skipping visual test on CI — no display');
```

`isCI` is `!!process.env.CI`, which is `true` in most CI providers (GitHub Actions, GitLab CI, CircleCI all set `CI=true`). The test runs locally but is silently skipped in the pipeline.

---

### `test.fixme` — "fixme — known broken test awaiting a fix"

```typescript
test.fixme(true, 'Tracked in issue #42 — broken after checkout redesign');
```

Passing `true` unconditionally marks the test as fixme regardless of environment. You can pass a dynamic condition just like `test.skip` — for example, `test.fixme(isSafari, 'Safari bug tracked in #99')`.

---

### `test.slow()` — "slow test — mark it so Playwright triples the timeout"

```typescript
test.slow();
await page.goto('/');
await page.getByTestId('hero-shop-btn').click();
await expect(page.getByTestId('product-card').first()).toBeVisible();
```

The `test.slow()` call must come before any `await`. Playwright applies the timeout multiplier from that point forward.

---

### Retry-safe: "avoid hardcoded waits"

```typescript
// BAD
await page.waitForTimeout(2000);

// GOOD
await expect(page.getByTestId('product-card').first()).toBeVisible();
```

`waitForTimeout` is a fixed sleep — it either waits too long (slow) or not long enough (flaky). An auto-retrying assertion waits for exactly as long as needed and fails fast if the condition is never met.

---

### Retry-safe: "use toHaveCount instead of count()"

```typescript
await expect(page.getByTestId('product-card')).toHaveCount(8);
```

`count()` is a snapshot — it reads the DOM once and returns. If the grid is still rendering when `count()` runs, you get 0 instead of 8. `toHaveCount` polls until the count matches or the timeout expires.

---

### Retry-safe: "assert state, not intermediate steps"

```typescript
await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
await expect(page.locator('#cart-count')).toHaveText('1');
```

Note the scoped locator: `.first().getByTestId('add-to-cart')` targets the `add-to-cart` button *within* the first `product-card`. Using `page.getByTestId('add-to-cart').first()` would match buttons in hidden pages still present in the DOM, causing a timeout. Always scope interactive locators to their visible parent.

#### Assignment — assert that the toast appears before the cart count updates

Add an assertion for the toast *before* the `#cart-count` check. Observe whether the test becomes flaky.

```bash
npx playwright test tests/07-ci-cd --project=chromium -g "assert state"
```

<details>
<summary>Solution</summary>

```typescript
await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
await expect(page.getByTestId('toast')).toBeVisible();  // flaky — toast auto-dismisses after 3s
await expect(page.locator('#cart-count')).toHaveText('1');
```

The toast assertion passes most of the time but occasionally races against the 3-second auto-dismiss. Removing it and asserting only `#cart-count` (the stable final state) makes the test unconditionally reliable.

</details>

---

### Tags — `@smoke` and `@regression`

```bash
npx playwright test tests/07-ci-cd --grep @smoke
npx playwright test tests/07-ci-cd --grep @regression
```

The `@smoke` tests verify the app is reachable and the basic flows work. Run them on every pull request. The `@regression` test runs the full checkout flow end-to-end — useful before a release.

---

### Isolation: "each test gets a fresh browser context"

```typescript
test('isolation: each test gets a fresh browser context', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#cart-count')).toHaveText('0');
});
```

This test exists in a file alongside a test that adds an item to the cart. Because each test gets its own browser context, the cart count starts at 0 regardless of what other tests do. If `#cart-count` showed 1 here, that would be a sign of context leakage — a serious isolation bug.

---

### Isolation: "actions in one test do not affect another"

```typescript
await page.getByTestId('product-card').first().getByTestId('add-to-cart').click();
await expect(page.locator('#cart-count')).toHaveText('1');
// This cart state only lives in this test's context — other tests see 0
```

The comment is the point: adding to cart here does not pollute any other test. The browser context is torn down after this test, taking its `localStorage` with it.

---

### Sharding: "this test is stateless and can run in any shard"

```typescript
test('shard-ready: this test is stateless and can run in any shard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/LlamaCart/);
});
```

A test is shard-safe when it has no dependency on external state set by another test. Tests that rely on a database seeded by a previous test, or a file written to disk in sequence, break when the two tests land in different shards. Design tests to be self-contained.

---

## Summary

| Test | Technique | Key concept |
|---|---|---|
| skip on CI | `test.skip(condition, reason)` | Omit platform-specific tests from pipelines |
| fixme | `test.fixme(condition, reason)` | Track known breakage without blocking CI |
| slow test | `test.slow()` | Triple timeout for one test, not the whole suite |
| avoid hardcoded waits | auto-retrying `expect` | Assertions wait for you; `waitForTimeout` doesn't |
| toHaveCount | `toHaveCount()` vs `count()` | Only retrying matchers are retry-safe |
| assert state | scope `add-to-cart` to `product-card` | Hidden DOM siblings cause timeout — always scope |
| env / baseURL | `process.env.BASE_URL` in config | One suite, many environments |
| @smoke / @regression | `--grep` tags | Run the right subset for the right pipeline stage |
| isolation — fresh context | default `page` fixture | Each test starts with empty storage |
| isolation — no bleed | per-test browser context teardown | Cart state, cookies, localStorage are discarded after each test |
| sharding | `--shard=N/M` | Stateless tests split freely across workers |

### When to reach for each technique

| Scenario | Technique |
|---|---|
| Skip a test that needs a display server | `test.skip(isCI, reason)` |
| Track a broken test without failing the build | `test.fixme(true, reason)` |
| A test legitimately takes longer than average | `test.slow()` |
| Run just the critical path on every PR | Tag with `@smoke`, run `--grep @smoke` |
| Run the full suite before a release | Tag with `@regression`, run `--grep @regression` |
| Cut pipeline time in half | `--shard=1/2` + `--shard=2/2` in a matrix |
| Assert async UI changes reliably | Auto-retrying matchers (`toHaveText`, `toHaveCount`, `toBeVisible`) |
| Interact with a product in a multi-page SPA | Scope the locator to a visible parent (`product-card.first().getByTestId(...)`) |
