import { Page } from '@playwright/test';

/**
 * Page Object Model (POM) for the LlamaCart login page.
 *
 * Instead of repeating selectors across tests, we encapsulate them
 * inside a class. Tests become readable and changes only need to
 * happen in one place.
 */
export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
    await this.page.getByTestId('nav-login').click();
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByTestId('login-submit').click();
  }

  async getErrorMessage() {
    return this.page.getByTestId('login-error');
  }

  async isLoggedIn() {
    return this.page.getByTestId('user-avatar').isVisible();
  }
}
