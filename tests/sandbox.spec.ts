import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/sandbox/checkout", "/sandbox/checkout/success", "/sandbox/checkout/cancel"]) {
  test(`${path} stays test-only, responsive and accessible`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByText("TEST MODE", { exact: true })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  });
}
test("unconfigured sandbox is closed and production control remains disabled", async ({ page, request }) => {
  await page.goto("/sandbox/checkout");
  await expect(page.getByRole("button", { name: "TEST MODE — Checkout unavailable" })).toBeDisabled();
  await expect(page.getByText("99 THB expected · not verified")).toBeVisible();
  expect((await request.post("/api/sandbox/checkout")).status()).toBe(503);
  expect((await request.post("/api/stripe/webhook", { data: '{}' })).status()).toBe(503);
  await page.goto("/products/combat-framework");
  await expect(page.getByRole("button", { name: "Purchasing unavailable" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "TEST MODE — Sandbox checkout" })).toHaveAttribute("href", "/sandbox/checkout");
});
test("success query strings cannot claim payment or unlock files", async ({ page }) => {
  await page.goto("/sandbox/checkout/success?payment_status=paid&session_id=cs_test_fake");
  await expect(page.getByRole("heading", { name: "No product unlocked." })).toBeVisible();
  await expect(page.getByText("This return page is informational. Visiting it does not confirm a payment.")).toBeVisible();
  await expect(page.locator('a[download], form, input')).toHaveCount(0);
});
