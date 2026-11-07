import { test } from '../../fixtures/ui.fixture';

const sizes = ['Twin', 'Twin XL', 'Full', 'Queen', 'King', 'Cal King', 'Split King'];

test.describe('Adding a mattress to the cart', () => {
  test.beforeAll(async ({ expectSiteToBeUp }) => {
    await expectSiteToBeUp();
  });

  test.beforeEach(async ({ homePage, mattressPage }) => {
    await test.step('Open the homepage', async () => {
      await homePage.open();
      await homePage.expectToBeOpen();
    });

    await test.step('Click "Shop Mattress" on the Hero Banner', async () => {
      await homePage.clickHeroShopMattress();
      await mattressPage.expectToBeOpen();
    });
  });

  for (const size of sizes) {
    test(`visitor adds a ${size} mattress from the Hero Banner to the cart`, async ({ mattressPage, cartPage }) => {
      const mattressName = await mattressPage.getProductName();

      await test.step(`Choose size ${size} and add the mattress to the cart`, async () => {
        await mattressPage.selectSize(size);
        await mattressPage.addToCart();
      });

      await test.step('Check that the cart contains only the chosen mattress', async () => {
        await cartPage.expectToBeOpen();
        await cartPage.expectOnlyItem({ name: mattressName, size, quantity: 1 });
      });
    });
  }
});
