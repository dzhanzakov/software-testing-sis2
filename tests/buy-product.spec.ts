import { test, expect } from '../fixtures/pages.fixture';
import { createUser } from '../data/user.factory';

test.describe('Buy a product', () => {
  test('a customer can add a product to the cart, sign in at checkout and complete the order', async ({
    productPage, cartPage, checkoutPage, registeredUser,
  }) => {
    const quantity = 2;
    const address = createUser();

    // Shop first, sign in at checkout. A full page reload would drop the session in this build,
    // so the flow stays inside the app after the sign-in.
    await productPage.openCatalogue();
    await productPage.openFromCatalogue(0);
    const chosen = await productPage.detailEntry();
    await productPage.addToCartWithQuantity(quantity);

    await expect(productPage.cartQuantity).toHaveText(String(quantity));
    await productPage.openCart();

    await expect(cartPage.itemTitles).toHaveCount(1);
    await expect(cartPage.itemTitles).toContainText(chosen.name);
    await expect(cartPage.itemQuantities).toHaveValue(String(quantity));

    await cartPage.proceedToCheckout();
    await checkoutPage.signIn(registeredUser);
    await checkoutPage.confirmSignedInStep();
    await checkoutPage.fillBillingAddress(address);
    await checkoutPage.payWithCashOnDelivery();

    await expect(checkoutPage.orderConfirmation).toContainText('Thanks for your order');
    await expect(checkoutPage.orderConfirmation).toContainText('invoice number');
  });
});
