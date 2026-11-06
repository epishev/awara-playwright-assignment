import { expect, test } from '@playwright/test';
import { CartPage } from '../../pages/cart.page';
import { HomePage } from '../../pages/home.page';
import { MattressPage } from '../../pages/mattress.page';

test('visitor adds a mattress from the Hero Banner to the cart', async ({ page }) => {
  const home = new HomePage(page);
  const mattress = new MattressPage(page);
  const cart = new CartPage(page);
  const size = 'King';

  await test.step('Open the homepage', async () => {
    const response = await home.goto();
    expect(response.status()).toBe(200);
    await expect(home.heading).toBeVisible();
    await expect(home.heroShopMattressLink).toBeVisible();
    await home.dismissOverlays();
  });

  await test.step('Click "Shop Mattress" on the Hero Banner', async () => {
    await home.clickHeroShopMattress();
    // The assignment expects /mattress, but the Hero Banner link points to this
    // product page (see README, "Assumptions and discrepancies").
    await expect(page).toHaveURL(/\/mattresses\/essential-latex-hybrid-mattress\/?(\?.*)?$/);
    await expect(mattress.title).toBeVisible();
    await expect(mattress.addToCartButton).toBeVisible();
  });

  let productName = '';
  await test.step('Select a size and add the mattress to the cart', async () => {
    productName = await mattress.productName();
    expect(productName).not.toBe('');
    await mattress.selectSize(size);
    await mattress.addToCart();
  });

  await test.step('Verify the cart contains the selected mattress', async () => {
    await expect(page).toHaveURL(/\/checkout\/cart\/?(\?.*)?$/);
    await expect(cart.items).toHaveCount(1);
    const item = cart.item(productName);
    await expect(item).toContainText(productName);
    await expect(item.getByTestId('checkout_Size')).toHaveText(`Size: ${size}`);
    await expect(item.getByTestId('quantity_number')).toHaveText('1');
  });
});
