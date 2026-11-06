import { expect, type Locator, type Page } from '@playwright/test';

// Requests the product page uses to price the cart (observed on /mattresses/*).
const PRICING_REQUEST = /\/carts\/quote|\/api\/products|\/applicable-offers/;
// Pricing requests are chained with gaps of up to ~250 ms, so "settled" means
// none in flight for this long.
const QUIET_MS = 1_000;

export class MattressPage {
  readonly title: Locator;
  readonly sizeSelect: Locator;
  readonly addToCartButton: Locator;

  private inFlight = 0;
  private lastPricingActivity = Date.now();

  constructor(private readonly page: Page) {
    this.title = page.getByTestId('product_title');
    this.sizeSelect = page.getByTestId('add_to_cart_property_selector_size');
    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart', exact: true });

    // Create this page object before navigating so no request is missed.
    const onStart = (url: string) => {
      if (!PRICING_REQUEST.test(url)) return;
      this.inFlight++;
      this.lastPricingActivity = Date.now();
    };
    const onEnd = (url: string) => {
      if (!PRICING_REQUEST.test(url)) return;
      this.inFlight--;
      this.lastPricingActivity = Date.now();
    };
    page.on('request', (request) => onStart(request.url()));
    page.on('requestfinished', (request) => onEnd(request.url()));
    page.on('requestfailed', (request) => onEnd(request.url()));
  }

  async productName() {
    return (await this.title.innerText()).trim();
  }

  async selectSize(size: string) {
    // Application defect worked around here: for ~1.5-2 s after the page renders,
    // it keeps re-pricing the cart and finally resets the size to the default
    // (Queen). A size chosen in that window is silently lost, and the cart gets
    // the wrong size. The UI shows no sign of this, so wait for the requests.
    await expect
      .poll(() => this.inFlight === 0 && Date.now() - this.lastPricingActivity >= QUIET_MS, {
        message: 'product page should finish its initial pricing requests',
        timeout: 15_000,
      })
      .toBe(true);

    await this.sizeSelect.click();
    // Option names look like "King(Total Value $1,809)$999", hence the prefix match.
    const option = this.page.getByRole('option', { name: new RegExp(`^${size}\\b`) });
    const optionText = ((await option.textContent()) ?? '').trim();
    await option.click();
    // The label changes first; the price follows once the size is applied.
    await expect(this.sizeSelect).toHaveText(optionText);
  }

  /** Adds to cart and declines the two upsell dialogs that follow, which lands on the cart page. */
  async addToCart() {
    await this.addToCartButton.click();
    await this.declineUpsell('Upgrade to Certified Organic');
    await this.declineUpsell('Protect your');
  }

  private async declineUpsell(dialogText: string) {
    const dialog = this.page.getByRole('dialog').filter({ hasText: dialogText });
    await dialog.getByRole('button', { name: 'No Thanks' }).click();
  }
}
