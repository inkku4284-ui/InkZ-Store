import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/download", "/download?session_id=cs_test_a1B2c3D4e5F6g7H8i9J0"]) {
  test(`${path} unlocks nothing without a paid order`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "No order here." })).toBeVisible();
    await expect(page.locator('a[href^="/api/download"], a[download]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  });
}

test("closed store refuses checkout and downloads", async ({ request }) => {
  expect((await request.post("/api/checkout")).status()).toBe(503);
  expect((await request.get("/api/download?session_id=cs_test_a1B2c3D4e5F6g7H8i9J0")).status()).toBe(503);
});

test("cancelled checkout says nothing was charged", async ({ page }) => {
  await page.goto("/products/combat-framework?checkout=cancelled");
  await expect(page.getByText("Payment cancelled. You were not charged.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Launching soon" })).toBeDisabled();
});

test("recovery page stays private and does not offer email sending without configuration", async ({ page, request }) => {
  const response = await page.goto("/recover?sent=1");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Restore your download." })).toBeVisible();
  await expect(page.getByText("Email recovery is temporarily unavailable.", { exact: true })).toBeVisible();
  await expect(page.locator('form[action="/api/delivery/recovery"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  expect(response?.headers()["referrer-policy"]).toBe("same-origin");
  expect((await request.get("/api/delivery/recovery/confirm?token=not-a-proof")).status()).toBe(405);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
});

for (const path of ["/recover", "/download"]) {
  test(`${path} preserves the Origin on native same-origin verification forms`, async ({ page }) => {
    await page.goto(path);
    const origin = new URL(page.url()).origin;
    const submitted = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith("/api/delivery/recovery/confirm"));
    // Exercise the browser's navigation policy without enabling payments or email.
    await page.evaluate(() => {
      const form = document.createElement("form");
      form.method = "post";
      form.action = "/api/delivery/recovery/confirm";
      document.body.append(form);
      form.requestSubmit();
    });
    expect((await submitted).headers().origin).toBe(origin);
  });
}
