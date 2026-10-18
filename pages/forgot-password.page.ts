import { Locator, Page, Response } from '@playwright/test';
import { BasePage } from './base.page';

export class ForgotPasswordPage extends BasePage {
  /** Banner shown under the form after a request. The app hides it again after about 3 seconds. */
  readonly confirmation: Locator;
  readonly emailError: Locator;
  private readonly email: Locator;
  private readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.confirmation = page.locator('form').getByRole('alert');
    this.emailError = page.getByTestId('email-error');
    this.email = page.getByTestId('email');
    this.submit = page.getByTestId('forgot-password-submit');
  }

  async open(): Promise<void> {
    await this.page.goto('/auth/forgot-password');
  }

  /** Submits the form and returns the API response, so the test can assert on the outcome itself. */
  async requestReset(email: string): Promise<Response> {
    await this.email.fill(email);
    const response = this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('forgot-password'),
    );
    await this.submit.click();
    return response;
  }

  /** Submits without waiting for the API (used when client-side validation should stop the request). */
  async submitOnly(email: string): Promise<void> {
    await this.email.fill(email);
    await this.submit.click();
  }
}
