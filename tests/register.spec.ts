import { test, expect } from '../fixtures/pages.fixture';
import { createUser } from '../data/user.factory';

test.describe('Register', () => {
  test('a new customer can register and is sent to the login page', async ({ registerPage, loginPage, page }) => {
    const user = createUser();

    await registerPage.open();
    await registerPage.register(user);

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(registerPage.registerError).toHaveCount(0);

    // Prove the account really exists: the new credentials must now log in.
    await loginPage.signIn(user);
    await expect(page).toHaveURL(/\/account/);
  });
});
