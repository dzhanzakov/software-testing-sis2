import { test, expect } from '../fixtures/pages.fixture';

test.describe('Login', () => {
  test('valid credentials open the account page', async ({ loginPage, registeredUser, page }) => {
    await loginPage.open();
    await loginPage.signIn(registeredUser);

    await expect(page).toHaveURL(/\/account/);
    await expect(loginPage.pageTitle).toContainText('My account');
  });

  test('wrong password shows an error and stays on the login page', async ({ loginPage, registeredUser, page }) => {
    await loginPage.open();
    await loginPage.signIn({ email: registeredUser.email, password: 'definitely-wrong-password' });

    await expect(loginPage.loginError).toBeVisible();
    await expect(loginPage.loginError).toContainText('Invalid email or password');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
