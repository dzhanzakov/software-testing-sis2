# Review

## What the AI produced
From my slides and one short request, Claude produced a full TypeScript Playwright project: configuration, page objects, a fixture layer, a user data factory, five spec files and a README. It could not open the live site from its environment, so it took the `data-test` attribute names from the Toolshop's public source code on GitHub and said which parts it could not verify.

## How I reviewed it
I ran the suite on the real site, and reported each failure back with the output, the page snapshot or the trace. I also checked the generated structure against the grading rules in the presentation: no locators in specs, no `waitForTimeout`, page objects, a fixture, unique data per run, and assertions that can fail.

## What I changed and why

| Problem found | How I found it | Decision |
|---|---|---|
| Reset-password test failed waiting for the word "successfully" | Ran the test, read the error and the page snapshot | The app's template uses the translation key `page.forgot-password.confirm` but the translation file defines `pages.forgot-password.confirm`, so the banner shows a raw key. This is a bug in the app. I changed the test to assert on the API response being OK and on a banner appearing, instead of on text that the app gets wrong. The assertion can still fail if the API rejects the request. |
| Shared seeded account got locked ("too many failed attempts") | The site showed the lock message | The first design used one shared account, including for a wrong-password test. Those accounts are public and other students use them too, so they lock easily. I decided that tests should create their own accounts. A `registeredUser` fixture creates a unique account through the API for each test, so tests are independent and safe in parallel. |
| Buy-product test could not find the "continue" button on checkout step 2 | Error context showed "Sign in" in the header and a login form on step 2 | The test reloaded the page after logging in, and this build loses the session on reload. I changed the flow to shop first and sign in on checkout step 2, which is how the app is meant to be used. |
| Timeouts | Logins took about 10 seconds on the shared site | Raised the test and assertion timeouts and used 3 workers instead of 6. |
| Compare test | The assignment says there is no compare feature | The test captures name and price from the catalogue for two products, opens each product, and asserts that the detail pages match and that the cheaper product is the same in both places. |

## Decisions I made myself
- Prefer accounts the tests create over the seeded accounts, for independence and because shared accounts lock.
- Keep the registration test on the UI, and use the API only for setting up accounts in other tests.
- Assert only on things the test created or read, never on global counts such as "9 products".
- Keep the app bug about the confirmation text as a documented finding instead of working around it silently.

## Verification I did
- All tests pass on the live site: [CONFIRM]
- Repeated parallel run (`npx playwright test --repeat-each=3 --workers=4`): [FILL IN]
- Clean clone, `npm install` and `npx playwright test`: [FILL IN]
- Run against the buggy build, and which tests failed there: [FILL IN]

## Limits
The AI generated the code and I reviewed and ran it. The AI could not run the suite against the live site itself, so every fix above came from my own runs.
