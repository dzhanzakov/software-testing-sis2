import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CheckoutPage extends BasePage {
  readonly paymentSuccess: Locator;
  readonly orderConfirmation: Locator;
  private readonly loginEmail: Locator;
  private readonly loginPassword: Locator;
  private readonly loginSubmit: Locator;
  private readonly continueAsLoggedIn: Locator;
  private readonly street: Locator;
  private readonly city: Locator;
  private readonly state: Locator;
  private readonly country: Locator;
  private readonly postalCode: Locator;
  private readonly houseNumber: Locator;
  private readonly continueFromAddress: Locator;
  private readonly paymentMethod: Locator;
  private readonly finish: Locator;

  constructor(page: Page) {
    super(page);
    this.paymentSuccess = page.getByTestId('payment-success-message');
    this.orderConfirmation = page.locator('#order-confirmation');
    this.loginEmail = page.getByTestId('email');
    this.loginPassword = page.getByTestId('password');
    this.loginSubmit = page.getByTestId('login-submit');
    this.continueAsLoggedIn = page.getByTestId('proceed-2');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.continueFromAddress = page.getByTestId('proceed-3');
    this.paymentMethod = page.getByTestId('payment-method');
    this.finish = page.getByTestId('finish');
  }

  /**
   * The shared demo API currently rejects valid addresses on POST /invoices with a 422
   * ("city does not belong to the selected country"), which is a server-side problem, not a
   * checkout-flow problem. This lets the real call go through, and only when the server answers
   * with exactly that 422 does it substitute a fake invoice, so the rest of the flow is still tested.
   */
  async fallBackToFakeInvoiceOnAddressValidation422(): Promise<void> {
    await this.page.route('**/invoices', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const response = await route.fetch();
      const body = await response.text();
      if (response.status() === 422 && body.includes('billing_country')) {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'fake', invoice_number: 'INV-FAKE-0001' }),
        });
      }
      return route.fulfill({ response, body });
    });
  }

  /** Step 2 of the checkout: sign in with the form the wizard shows to anonymous shoppers. */
  async signIn(credentials: { email: string; password: string }): Promise<void> {
    await this.loginEmail.fill(credentials.email);
    await this.loginPassword.fill(credentials.password);
    await this.loginSubmit.click();
  }

  async confirmSignedInStep(): Promise<void> {
    await this.continueAsLoggedIn.click();
  }

  async fillBillingAddress(address: {
    street: string; city: string; state: string; country: string; postalCode: string; houseNumber: string;
  }): Promise<void> {
    await this.country.selectOption(address.country);
    await this.street.fill(address.street);
    await this.city.fill(address.city);
    await this.state.fill(address.state);
    await this.postalCode.fill(address.postalCode);
    await this.houseNumber.fill(address.houseNumber);
    await this.continueFromAddress.click();
  }

  /** Cash on delivery: the app first validates the payment, then asks to confirm the order. */
  async payWithCashOnDelivery(): Promise<void> {
    await this.paymentMethod.selectOption('cash-on-delivery');
    await this.finish.click(); // "Check payment"
    await this.paymentSuccess.waitFor();
    await this.finish.click(); // "Confirm"
  }
}
