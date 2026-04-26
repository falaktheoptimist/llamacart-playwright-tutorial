import { test, expect } from '@playwright/test';

/**
 * CHAPTER 04 — Network Mocking & API Interception
 *
 * Playwright can intercept, inspect, and modify any HTTP request
 * your app makes. This lets you:
 *
 *   - Test UI behaviour when APIs fail (500, 404, timeouts)
 *   - Stub slow or external APIs so tests run fast
 *   - Assert your app sends the right requests
 *   - Simulate edge cases that are hard to reproduce with real data
 *
 * Core API:
 *   page.route(pattern, handler)   — intercept matching requests
 *   page.unroute(pattern)          — remove a route handler
 *   route.fulfill({ ... })         — respond with mock data
 *   route.abort()                  — simulate a network failure
 *   route.continue()               — let request pass through normally
 *   page.waitForRequest(pattern)   — wait for a specific request
 *   page.waitForResponse(pattern)  — wait for a specific response
 *
 * Run with:
 *   npx playwright test tests/04-api-and-network --project=chromium
 */

test.describe('Network mocking — controlling the backend from your tests', () => {

  // ── Intercepting and inspecting requests ─────────────────────────────────

  test('observe: log all requests the app makes on load', async ({ page }) => {
    const requests: string[] = [];

    // Listen to every request before navigation
    page.on('request', req => requests.push(req.url()));

    await page.goto('/');

    // Our app is fully static so only the page itself loads
    // In a real app you'd see API calls here
    expect(requests.some(url => url.includes('localhost'))).toBe(true);
  });

  test('observe: capture a specific request and assert its method', async ({ page }) => {
    await page.goto('/');

    // waitForRequest returns the first matching request
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('localhost') && req.method() === 'GET'),
      page.reload(),
    ]);

    expect(request.method()).toBe('GET');
  });

  // ── Mocking static assets / JSON files ───────────────────────────────────

  test('mock: intercept products data with a custom response', async ({ page }) => {
    // Intercept requests to the products data file
    await page.route('**/products.js', async route => {
      // Return a stripped-down mock — only 2 products
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          export const products = [
            {
              id: 99,
              name: "Mock Llama Scarf",
              price: 10.00,
              category: "clothing",
              emoji: "🧣",
              rating: 5.0,
              reviews: 1,
              inStock: true,
              description: "A mocked product for testing.",
              tags: ["mock"],
            }
          ];
          export const categories = ["all", "clothing"];
          export const DEMO_USER = {
            email: "tester@llamacart.dev",
            password: "LlamaRules123",
            name: "Alex Llama",
          };
        `,
      });
    });

    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();

    // Only our mock product should be visible
    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByTestId('product-name').first()).toContainText('Mock Llama Scarf');
  });

  // ── Simulating network failures ───────────────────────────────────────────

  test('failure: abort a request to simulate network error', async ({ page }) => {
    let requestAborted = false;

    await page.route('**/products.js', async route => {
      requestAborted = true;
      await route.abort('failed'); // simulate connection failure
    });

    // App should handle the failure gracefully (not crash)
    await page.goto('/');
    expect(requestAborted).toBe(true);
  });

  test('failure: simulate slow network with artificial delay', async ({ page }) => {
    await page.route('**/products.js', async route => {
      // Wait 1 second before responding (simulates slow API)
      await new Promise(res => setTimeout(res, 1000));
      await route.continue(); // then let it pass through normally
    });

    const start = Date.now();
    await page.goto('/');
    const elapsed = Date.now() - start;

    // At least 1 second should have passed
    expect(elapsed).toBeGreaterThan(900);
  });

  // ── Modifying responses ───────────────────────────────────────────────────

  test('modify: mark all products as out of stock', async ({ page }) => {
    await page.route('**/products.js', async route => {
      // Fetch the real response first
      const response = await route.fetch();
      let body = await response.text();

      // Patch it: replace all inStock: true with inStock: false
      body = body.replace(/inStock: true/g, 'inStock: false');

      await route.fulfill({ response, body });
    });

    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();

    // All "Add to Cart" buttons should now be disabled
    const addButtons = page.getByTestId('add-to-cart');
    const count = await addButtons.count();
    for (let i = 0; i < count; i++) {
      await expect(addButtons.nth(i)).toBeDisabled();
    }
  });

  // ── Selectively intercepting routes ──────────────────────────────────────

  test('selective: only mock one product category', async ({ page }) => {
    let intercepted = false;

    await page.route('**/products.js', async route => {
      intercepted = true;
      await route.continue(); // pass through
    });

    await page.goto('/');
    await page.getByTestId('nav-shop').click();

    // Filter to clothing
    await page.getByTestId('filter-clothing').click();

    expect(intercepted).toBe(true);
    // Clothing products only
    const cards = page.getByTestId('product-card');
    await expect(cards.first()).toBeVisible();
  });

  // ── Combining route + assertions ──────────────────────────────────────────

  test('assert: app shows correct price from data', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-shop').click();

    // Get the first product price from the DOM
    const priceText = await page.getByTestId('product-price').first().textContent();
    expect(priceText).toMatch(/^\$\d+\.\d{2}$/); // e.g. "$42.00"
  });

  test('route priority: more specific routes take precedence', async ({ page }) => {
    // Both routes match, but the first registered one wins
    await page.route('**/*.js', route => route.continue());
    await page.route('**/products.js', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          export const products = [];
          export const categories = ["all"];
          export const DEMO_USER = { email: "tester@llamacart.dev", password: "LlamaRules123", name: "Alex Llama" };
        `,
      });
    });

    // Playwright routes in LIFO order — last registered wins
    await page.goto('/');
    await page.getByTestId('hero-shop-btn').click();
    // products.js was intercepted → empty products list
    await expect(page.getByText('No products found.')).toBeVisible();
  });

  // ── Real-world pattern: stub an auth API ─────────────────────────────────

  test('pattern: stub a login API endpoint', async ({ page }) => {
    // In a real app with a backend, you'd intercept the login POST
    // This shows the pattern you'd use
    let loginCalled = false;

    await page.route('**/api/login', async route => {
      loginCalled = true;

      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();

        if (body?.email === 'admin@llamacart.dev') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ token: 'mock-jwt-token', name: 'Admin Llama' }),
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid credentials' }),
          });
        }
      }
    });

    // Our app uses localStorage auth, not a real API,
    // so this route never fires — but the pattern is correct for real apps.
    await page.goto('/');
    // loginCalled would be true if the app hits /api/login
    expect(loginCalled).toBe(false); // expected for our static app
  });

});

// ── HAR file recording (advanced) ────────────────────────────────────────────

test.describe('HAR recording — capture and replay real network traffic', () => {

  test('record network as HAR file', async ({ page, context }) => {
    // Record all network requests to a HAR file
    await context.routeFromHAR('./tests/04-api-and-network/assets/llamacart.har', {
      update: true,    // set to true to record; false to replay
      url: /localhost/,
    });

    await page.goto('/');
    // On first run with update:true, this records to the HAR file
    // On subsequent runs with update:false, it replays from it
  });

});