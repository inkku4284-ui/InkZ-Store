import { test, expect } from "@playwright/test";

const canonicalOrigin = "https://canonical.example";
const productPath = "/products/combat-framework";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/store", route => route.fulfill({ json: {
    open: true, mode: "test", checkoutOrigin: canonicalOrigin,
  } }));
});

test("Buy Now follows an explicit canonical-store redirect from a deployment alias", async ({ page }) => {
  const destination = canonicalOrigin + productPath;
  await page.route("**/api/checkout", route => route.fulfill({ json: { url: destination, destination: "store" } }));
  await page.route(destination, route => route.fulfill({ body: "Canonical store reached (test fixture).", contentType: "text/html" }));
  await page.goto(productPath);
  await page.getByRole("button", { name: /TEST MODE — Buy/ }).click();
  await expect(page).toHaveURL(destination);
});

test("Buy Now preserves normal Stripe Checkout navigation", async ({ page }) => {
  const destination = "https://checkout.stripe.com/c/pay/cs_test_navigationFixture";
  await page.route("**/api/checkout", route => route.fulfill({ json: { url: destination } }));
  await page.route(destination, route => route.fulfill({ body: "Stripe Checkout (test fixture).", contentType: "text/html" }));
  await page.goto(productPath);
  await page.getByRole("button", { name: /TEST MODE — Buy/ }).click();
  await expect(page).toHaveURL(destination);
});

for (const [name, result] of [
  ["foreign store", { destination: "store", url: "https://evil.example" + productPath }],
  ["unmarked store redirect", { url: canonicalOrigin + productPath }],
  ["credentials", { destination: "store", url: "https://user:password@canonical.example" + productPath }],
  ["another path", { destination: "store", url: canonicalOrigin + "/recover" }],
  ["query parameters", { destination: "store", url: canonicalOrigin + productPath + "?next=https://evil.example" }],
  ["fragment", { destination: "store", url: canonicalOrigin + productPath + "#unexpected" }],
  ["insecure URL", { destination: "store", url: "http://canonical.example" + productPath }],
] as const) {
  test(`Buy Now rejects a ${name} destination`, async ({ page }) => {
    await page.route("**/api/checkout", route => route.fulfill({ json: result }));
    await page.goto(productPath);
    await page.getByRole("button", { name: /TEST MODE — Buy/ }).click();
    await expect(page.getByText("Checkout could not open. Please wait a moment and try again.")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(productPath + "$"));
  });
}
