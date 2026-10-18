import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { ForgotPasswordPage } from '../pages/forgot-password.page';
import { ProductPage } from '../pages/product.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { User, createUser } from '../data/user.factory';

const API_URL = process.env.API_URL ?? 'https://api.practicesoftwaretesting.com';

type Pages = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  forgotPasswordPage: ForgotPasswordPage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  /** A throwaway account created through the API for this test only, so no test shares or locks a common account. */
  registeredUser: User;
};

export const test = base.extend<Pages>({

  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  registerPage: async ({ page }, use) => { await use(new RegisterPage(page)); },
  forgotPasswordPage: async ({ page }, use) => { await use(new ForgotPasswordPage(page)); },
  productPage: async ({ page }, use) => { await use(new ProductPage(page)); },
  cartPage: async ({ page }, use) => { await use(new CartPage(page)); },
  checkoutPage: async ({ page }, use) => { await use(new CheckoutPage(page)); },
  registeredUser: async ({ request }, use) => {
    const user = createUser();
    const response = await request.post(`${API_URL}/users/register`, {
      data: {
        first_name: user.firstName,
        last_name: user.lastName,
        dob: user.dob,
        phone: user.phone,
        email: user.email,
        password: user.password,
        address: {
          street: user.street,
          city: user.city,
          state: user.state,
          country: user.country,
          postal_code: user.postalCode,
        },
      },
    });
    if (!response.ok()) {
      throw new Error(`Could not create test user: ${response.status()} ${await response.text()}`);
    }
    await use(user);
  },
});

export { expect } from '@playwright/test';
