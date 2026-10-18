import { Locator, Page } from '@playwright/test';

/** Parts of the page that exist on every screen: the navigation bar. */
export abstract class BasePage {
  readonly navSignIn: Locator;
  readonly navMenu: Locator;
  readonly navCart: Locator;
  readonly cartQuantity: Locator;

  constructor(protected readonly page: Page) {
    this.navSignIn = page.getByTestId('nav-sign-in');
    this.navMenu = page.getByTestId('nav-menu');
    this.navCart = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
  }

  async openCart(): Promise<void> {
    await this.navCart.click();
  }
}
