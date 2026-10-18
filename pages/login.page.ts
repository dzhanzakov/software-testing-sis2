import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly pageTitle: Locator;
  readonly loginError: Locator;
  readonly emailError: Locator;
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByTestId('page-title');
    this.loginError = page.getByTestId('login-error');
    this.emailError = page.getByTestId('email-error');
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submit = page.getByTestId('login-submit');
  }

  async open(): Promise<void> {
    await this.page.goto('/auth/login');
  }

  async signIn(credentials: { email: string; password: string }): Promise<void> {
    await this.email.fill(credentials.email);
    await this.password.fill(credentials.password);
    await this.submit.click();
  }
}
