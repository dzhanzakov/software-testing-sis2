import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { User } from '../data/user.factory';

export class RegisterPage extends BasePage {
  readonly registerError: Locator;
  readonly loginForm: Locator;
  private readonly firstName: Locator;
  private readonly lastName: Locator;
  private readonly dob: Locator;
  private readonly street: Locator;
  private readonly postalCode: Locator;
  private readonly houseNumber: Locator;
  private readonly city: Locator;
  private readonly state: Locator;
  private readonly country: Locator;
  private readonly phone: Locator;
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.registerError = page.getByTestId('register-error');
    this.loginForm = page.getByTestId('login-form');
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.dob = page.getByTestId('dob');
    this.street = page.getByTestId('street');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.country = page.getByTestId('country');
    this.phone = page.getByTestId('phone');
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submit = page.getByTestId('register-submit');
  }

  async open(): Promise<void> {
    await this.page.goto('/auth/register');
  }

  async register(user: User): Promise<void> {
    await this.firstName.fill(user.firstName);
    await this.lastName.fill(user.lastName);
    await this.dob.fill(user.dob);
    await this.street.fill(user.street);
    await this.postalCode.fill(user.postalCode);
    await this.houseNumber.fill(user.houseNumber);
    await this.city.fill(user.city);
    await this.state.fill(user.state);
    await this.country.selectOption(user.country);
    await this.phone.fill(user.phone);
    await this.email.fill(user.email);
    await this.password.fill(user.password);
    await this.submit.click();
  }
}
