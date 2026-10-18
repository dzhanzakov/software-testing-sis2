# Description

## What I want to do
Automate five core user flows of the Toolshop practice application (https://practicesoftwaretesting.com) with Playwright and TypeScript, structured the way a real suite would be: page objects, a fixture layer, generated test data, and independent tests that pass in parallel.

## Test cases to automate

| # | Test case | What it proves |
|---|---|---|
| 1 | Register a new customer | A unique new account is created through the UI, the user lands on the login page, and the new credentials can then sign in |
| 2 | Log in | Valid credentials reach the account page. A wrong password shows "Invalid email or password" and stays on the login page |
| 3 | Buy a product | Add a product with quantity 2, the cart shows the right item and quantity, sign in at checkout, pay by cash on delivery, and the order confirmation shows an invoice number |
| 4 | Compare two products | Name and price captured in the catalogue match both product detail pages, and the cheaper product is the same on both. The shop has no compare feature, so the test performs the comparison |
| 5 | Reset a password | A known email is accepted by the API and the page shows a confirmation. An invalid email shows a validation error and no confirmation |

The suite contains 5 spec files with 7 tests in total (login and reset-password each have a success and a failure test).

## Structure
- `tests/`: one spec per test case, with no locators
- `pages/`: one page object per screen, with business actions
- `fixtures/pages.fixture.ts`: page objects and a per-test `registeredUser` account created through the API
- `data/user.factory.ts`: unique user data for every run
- `playwright.config.ts`: `baseURL`, `testIdAttribute: 'data-test'`, `trace: 'on-first-retry'`, retries in CI only

## How to run
```bash
npm install
npx playwright install chromium
npx playwright test
```

## Not automated
Favourites, invoices, the admin area, filters and sorting, and payment methods other than cash on delivery.
