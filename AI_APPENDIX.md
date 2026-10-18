# AI appendix (Level 1)

Fill this in honestly before submitting. Undisclosed AI use is treated as plagiarism.


## Prompts used

"I'm doing a university assignment (Software Testing and Debugging) and need a
Playwright + TypeScript test suite for https://practicesoftwaretesting.com.

Write five tests, one spec file each: register, login, buy a product, compare two
products, reset password. Use page objects (no locators in specs), a fixtures
file, and a data factory for unique emails. Use data-test attributes via
testIdAttribute. No waitForTimeout, no CSS-class or XPath locators, and every
test needs an assertion that could actually fail. Tests must be independent and
pass in parallel.

If you can't open the site, tell me which locators you couldn't verify.
Then check your own work against these rules.

Here is the project: <Here i sent an html file of the project>"

## What the model produced
- A TypeScript Playwright project: config, page objects, a fixture layer, a user factory, five specs and a README. Because it could not open the live site, it took the data-test names from the Toolshop's public source code on GitHub.


## My review and corrections

| Problem | How I found it | What changed |
|---|---|---|
| Reset-password test waited for the word "successfully" and failed | Ran the suite, read the failure and the page snapshot | The app's template uses the translation key `page.forgot-password.confirm` but the translation is `pages.forgot-password.confirm`, so the banner shows a raw key. This is a bug in the app. The test now asserts on the API response and that a banner appears. |
| Shared seeded account got locked | The site showed "too many failed attempts" | The model's wrong-password test used a shared account. Tests that need an account now create their own through the API. |
| Buy test was logged out at checkout | The snapshot showed "Sign in" in the header and a login form on step 2 | The test reloaded the page after login, which loses the session in this build. The flow now shops first and signs in on checkout step 2. |
| Tests timed out on the slow shared site | Logins took about 10 seconds in my runs | Longer timeouts and fewer parallel workers. |
| Locators were taken from source code, not the live site | I ran every test on the live site | Fixed the ones that failed, as above. |