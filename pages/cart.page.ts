import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CartPage extends BasePage {
  readonly itemTitles: Locator;
  readonly itemQuantities: Locator;
  readonly total: Locator;
  private readonly proceed: Locator;

  constructor(page: Page) {
    super(page);
    this.itemTitles = page.getByTestId('product-title');
    this.itemQuantities = page.getByTestId('product-quantity');
    this.total = page.getByTestId('cart-total');
    this.proceed = page.getByTestId('proceed-1');
  }

  async proceedToCheckout(): Promise<void> {
    await this.proceed.click();
  }
}
