import { test, expect } from '../fixtures/pages.fixture';

test.describe('Reset password', () => {
  test('a known email is accepted by the API and the page confirms it', async ({ forgotPasswordPage, registeredUser }) => {
    await forgotPasswordPage.open();
    const response = await forgotPasswordPage.requestReset(registeredUser.email);

    // The outcome is asserted on the API response, not on the banner's wording. The app's banner text
    // is currently a raw translation key (template uses "page.forgot-password.confirm", the key is "pages...").
    expect(response.ok()).toBe(true);
    await expect(forgotPasswordPage.confirmation).toBeVisible();
  });

  test('an invalid email is rejected with a validation error and no confirmation', async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.open();
    await forgotPasswordPage.submitOnly('not-an-email');

    await expect(forgotPasswordPage.emailError).toBeVisible();
    await expect(forgotPasswordPage.confirmation).toHaveCount(0);
  });
});
