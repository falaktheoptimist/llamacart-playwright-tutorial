import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for the LlamaCart shopping cart.
 */
export class CartPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.getByTestId('cart-button').click();
  }

  async getItemCount() {
    const items = this.page.getByTestId('cart-item');
    return items.count();
  }

  async getItemNames() {
    return this.page.getByTestId('cart-item-name').allTextContents();
  }

  async increaseQty(productName: string) {
    const item = this.page.getByTestId('cart-item').filter({ hasText: productName });
    await item.getByTestId('qty-increase').click();
  }

  async decreaseQty(productName: string) {
    const item = this.page.getByTestId('cart-item').filter({ hasText: productName });
    await item.getByTestId('qty-decrease').click();
  }

  async removeItem(productName: string) {
    const item = this.page.getByTestId('cart-item').filter({ hasText: productName });
    await item.getByTestId('remove-from-cart').click();
  }

  async getTotal() {
    return this.page.getByTestId('cart-total').textContent();
  }

  async checkout() {
    await this.page.getByTestId('checkout-btn').click();
  }

  async isEmpty() {
    return this.page.getByTestId('empty-cart-shop-btn').isVisible();
  }
}
