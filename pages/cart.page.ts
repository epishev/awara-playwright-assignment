import { type Locator, type Page } from '@playwright/test';

export class CartPage {
  /** Every line item in the cart (test ids look like cart_item_<Product_Name>). */
  readonly items: Locator;

  constructor(private readonly page: Page) {
    this.items = page.getByTestId('cart_items_area').locator('[data-testid^="cart_item_"]');
  }

  /** The cart line for one product. The site derives its test id from the product name. */
  item(productName: string): Locator {
    return this.page.getByTestId(`cart_item_${productName.replace(/\s+/g, '_')}`);
  }
}
