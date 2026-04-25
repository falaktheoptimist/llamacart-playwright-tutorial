# 🦙 LlamaCart — Playwright E2E Tutorial

> A hands-on Playwright tutorial built around **LlamaCart**, a fictional handmade goods store run by llamas. Learn end-to-end testing from zero to CI/CD.

---

## What's inside

| Chapter | Topic | What you'll learn |
|---|---|---|
| `01-basics` | Your first tests | `goto`, `click`, `fill`, basic assertions |
| `02-locators` | Finding elements | `getByRole`, `getByLabel`, `getByTestId`, `filter` |
| `03-fixtures-and-pom` | Page Object Model | Reusable page classes, custom fixtures |
| `04-api-and-network` | Network mocking | `page.route()`, intercepting API calls |
| `05-auth-state` | Auth state | `storageState`, log in once across all tests |
| `06-ci-cd` | GitHub Actions | Running Playwright in CI, uploading reports |

---

## The app — LlamaCart

LlamaCart is a small e-commerce store selling llama-made goods: wool scarves, alpaca snacks, friendship bracelets, and more. It's built with plain HTML + Vanilla JS + Vite — no framework needed, easy to run anywhere.

**Features tested:**
- Product listing with search and category filters
- Product detail pages
- Shopping cart (add, remove, quantity controls)
- Login / register flow
- Order checkout

---

## Quick start

### Prerequisites
- Node.js 18+
- npm

### Install everything

```bash
git clone https://github.com/YOUR_USERNAME/llamacart-playwright-tutorial
cd llamacart-playwright-tutorial

# Install Playwright
npm install

# Install webapp dependencies
cd webapp && npm install && cd ..

# Install browser binaries
npx playwright install
```

### Run the app

```bash
npm run dev
# Webapp runs at http://localhost:5173
```

### Run the tests

```bash
# All tests, all browsers
npm test

# Just Chromium (faster for development)
npm run test:chromium

# Interactive UI mode — great for debugging
npm run test:ui

# Headed mode — watch the browser
npm run test:headed

# View the HTML report after a run
npm run test:report
```

### Demo credentials

```
Email:    tester@llamacart.dev
Password: LlamaRules123
```

---

## Project structure

```
llamacart-playwright-tutorial/
├── playwright.config.ts        # Test configuration
├── webapp/                     # The LlamaCart web app
│   ├── index.html
│   └── src/data/products.js
├── tests/
│   ├── 01-basics/
│   ├── 02-locators/
│   ├── 03-fixtures-and-pom/
│   │   └── pages/              # Page Object Model classes
│   ├── 04-api-and-network/
│   ├── 05-auth-state/
│   └── 06-ci-cd/
└── .github/workflows/
    └── playwright.yml
```

---

## Key concepts

### Locators (Chapter 2)

Prefer these in order of resilience:

```typescript
page.getByRole('button', { name: 'Add to Cart' })  // best
page.getByLabel('Email')
page.getByTestId('cart-button')
page.getByPlaceholder('Search...')
page.getByText('Out of stock')
page.locator('#some-id')                            // last resort
```

### Page Object Model (Chapter 3)

```typescript
// Without POM — repeated in every test
await page.getByLabel('Email').fill('...');
await page.getByLabel('Password').fill('...');
await page.getByTestId('login-submit').click();

// With POM — one line
await loginPage.login('email', 'password');
```

### Auth state (Chapter 5)

```typescript
// Save state after login
await page.context().storageState({ path: 'auth.json' });

// Reuse in other tests — already logged in
const context = await browser.newContext({ storageState: 'auth.json' });
```

---

## Contributing

Found a bug? Want to add a chapter? PRs welcome!

---

*Made with ❤️ and a little llama magic.*
