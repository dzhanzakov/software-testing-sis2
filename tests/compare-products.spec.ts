import { test, expect } from '../fixtures/pages.fixture';

/**
 * The Toolshop has no compare feature, so this test performs the comparison itself.
 * Stated comparison: for two different products, the name and price on each detail page
 * equal what the catalogue showed, so the cheaper product in the catalogue is also the
 * cheaper product on its detail page.
 */
test.describe('Compare two products', () => {
  test('catalogue and detail pages agree on name, price and which product is cheaper', async ({ productPage }) => {
    await productPage.openCatalogue();
    const listedA = await productPage.catalogueEntry(0);
    const listedB = await productPage.catalogueEntry(1);
    expect(listedA.name).not.toBe(listedB.name);

    await productPage.openFromCatalogue(0);
    const detailA = await productPage.detailEntry();

    await productPage.openCatalogue();
    await productPage.openFromCatalogue(1);
    const detailB = await productPage.detailEntry();

    expect(detailA).toEqual(listedA);
    expect(detailB).toEqual(listedB);
    expect(Math.sign(detailA.price - detailB.price)).toBe(Math.sign(listedA.price - listedB.price));
  });
});
