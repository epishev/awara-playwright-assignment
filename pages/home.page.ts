import { expect, type Locator, type Page } from '@playwright/test';

export class HomePage {
  readonly heading: Locator;
  readonly heroShopMattressLink: Locator;
  private readonly cookieBanner: Locator;
  private readonly promoModal: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    // Scoped to the Hero Banner container. The page also has a "Shop Mattress"
    // link in the comparison table, and hidden responsive duplicates of the hero link.
    this.heroShopMattressLink = page
      .getByTestId('hero_content_container')
      .getByRole('link', { name: 'Shop Mattress' });
    this.cookieBanner = page.getByRole('dialog', { name: 'Privacy' });
    this.promoModal = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('button', { name: /Save \$\d+ NOW/ }) });
  }

  async goto() {
    // 'domcontentloaded': the full load event waits for slow third-party content.
    const response = await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response, 'homepage navigation should produce a response').not.toBeNull();
    return response!;
  }

  /**
   * Closes the two overlays every fresh visitor gets: a cookie banner (about 2 s
   * after load) and a promo modal (about 7 s after load). They block clicks and
   * arrive at unpredictable moments, so a click-time handler can fire mid-click and
   * lose it. Closing them up front is deterministic; neither returns afterwards.
   * The cookie banner is closed with "Close", not "Accept All Cookies".
   */
  async dismissOverlays() {
    for (const overlay of [this.cookieBanner, this.promoModal]) {
      await expect(overlay).toBeVisible({ timeout: 30_000 });
      await overlay.getByRole('button', { name: 'Close' }).click();
      await expect(overlay).toBeHidden();
    }
  }

  async clickHeroShopMattress() {
    await this.heroShopMattressLink.click();
  }
}
