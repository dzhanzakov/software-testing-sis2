import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export interface ProductSummary {
  name: string;
  price: number;
}

export function parsePrice(text: string): number {
  const match = text.replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (!match) throw new Error(`No price found in "${text}"`);
  return Number(match[0]);
}

/** The catalogue (home page) and the product detail page. */
export class ProductPage extends BasePage {
  readonly productCards: Locator;
  readonly detailName: Locator;
  readonly detailPrice: Locator;
  private readonly quantity: Locator;
  private readonly addToCart: Locator;

  constructor(page: Page) {
    super(page);
    this.productCards = page.getByRole('link').filter({ has: page.getByTestId('product-name') });
    this.detailName = page.getByTestId('product-name');
    this.detailPrice = page.getByTestId('unit-price');
    this.quantity = page.getByTestId('quantity');
    this.addToCart = page.getByTestId('add-to-cart');
  }

  async openCatalogue(): Promise<void> {
    await this.page.goto('/');
    await expect(this.productCards.first()).toBeVisible();
  }

  /** Name and price exactly as the catalogue lists the n-th product. */
  async catalogueEntry(index: number): Promise<ProductSummary> {
    const card = this.productCards.nth(index);
    const name = (await card.getByTestId('product-name').innerText()).trim();
    const price = parsePrice(await card.getByTestId('product-price').innerText());
    return { name, price };
  }

  async openFromCatalogue(index: number): Promise<void> {
    await this.productCards.nth(index).click();
    await expect(this.detailName).toBeVisible();
  }

  /** Name and price exactly as the detail page shows the open product. */
  async detailEntry(): Promise<ProductSummary> {
    await expect(this.detailPrice).toBeVisible();
    const name = (await this.detailName.innerText()).trim();
    const price = parsePrice(await this.detailPrice.innerText());
    return { name, price };
  }

  async addToCartWithQuantity(quantity: number): Promise<void> {
    await this.quantity.fill(String(quantity));
    await this.addToCart.click();
  }
}
