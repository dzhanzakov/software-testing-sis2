# Toolshop Playwright suite (SIS 2)

Five end-to-end tests for https://practicesoftwaretesting.com, written in TypeScript with Playwright.

## Run it

```bash
npm install
npx playwright install chromium
npx playwright test            # headless
npx playwright test --ui       # UI mode
npm run test:bugs              # same suite against the deliberately buggy build
```

Run in shuffled order and in parallel to prove independence: `npx playwright test --fully-parallel --repeat-each=2 --workers=4`.

## What is covered

| Spec | Proves |
|---|---|
| `register.spec.ts` | A unique new customer registers, lands on the login page, and can then sign in with the new credentials. |
| `login.spec.ts` | Valid credentials reach the account page. A wrong password shows the error and stays on the login page. |
| `buy-product.spec.ts` | Add a product with quantity 2, the cart shows that item and quantity, checkout completes with an invoice number. |
| `compare-products.spec.ts` | Name and price captured in the catalogue match both detail pages, and the cheaper product is the same on both. |
| `reset-password.spec.ts` | Known email gives the success confirmation. A malformed email shows a validation error. |

## Structure

- `tests/`: one spec per test case. No locators, no raw paths.
- `pages/`: one page object per screen, exposing business actions (`signIn`, `register`, `payWithCashOnDelivery`).
- `fixtures/pages.fixture.ts`: extends `test` so page objects arrive ready in every spec.
- `data/user.factory.ts`: `createUser()` returns a never-used account (timestamp, pid, counter and random suffix).
- `playwright.config.ts`: `baseURL`, `testIdAttribute: 'data-test'`, `trace: 'on-first-retry'`, retries in CI only.

## Decisions

- **Every test that needs an account creates its own** through the API (`registeredUser` fixture, unique email each time). The shared seeded accounts are public and get locked by repeated failed logins from other users, so the suite does not depend on them. This keeps tests independent and parallel-safe.
- **Login through the UI inside the buy test** instead of a shared `storageState`, so each test stays independent. Logging in once via `auth.setup.ts` would be a reasonable optimisation.
- **Compare test** performs the comparison itself because the shop has no compare feature.
- **Reset password** is limited to the observable outcome: the API accepts the request (2xx) and a banner appears. I do not assert the banner text because the app shows a raw translation key there (template key `page.forgot-password.confirm` vs. translation `pages.forgot-password.confirm`), which is a bug worth reporting.
- **Not automated**: favourites, invoices, admin area, filters and sorting, other payment methods.
- Assertions target what each test created or read, never global counts such as "9 products".

## AI appendix (Level 1)

Add here: the prompts you used, why, what the model got wrong, and what you corrected. See `AI_APPENDIX.md`.
