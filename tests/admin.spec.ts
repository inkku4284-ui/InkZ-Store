import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("owner dashboard exposes no commerce data or login fallback without configuration", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Owner access." })).toBeVisible();
  await expect(page.getByText("Owner sign-in is not configured on this deployment.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with GitHub/ })).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
});

test("anonymous owner auth endpoints stay closed and never redirect to a supplied destination", async ({ request }) => {
  for (const path of ["/api/admin/auth/login", "/api/admin/auth/logout"]) {
    const response = await request.post(path, { headers: { origin: "https://attacker.example" } });
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["location"]).toBeUndefined();
  }
  const callback = await request.get("/api/admin/auth/callback?code=not-a-real-code&state=not-a-state&next=https://attacker.example", { maxRedirects: 0 });
  expect(callback.status()).toBe(503);
  expect(await callback.text()).toBe("Owner access is unavailable.");
  expect(callback.headers()["location"]).toBeUndefined();
});
