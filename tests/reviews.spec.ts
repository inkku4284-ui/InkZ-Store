import { test, expect } from "@playwright/test";

test("product reviews show actual approved ratings and escape user text", async ({ page }) => {
  await page.route("**/api/reviews?*", route => route.fulfill({ json: { total: 1, average: 4, page: 1, hasMore: false,
    reviews: [{ id: "review_fixture", rating: 4, displayName: "<img src=x onerror=alert(1)>",
      body: "A clear install guide and responsive combat. <script>window.reviewInjected=true</script>",
      createdAt: "2026-10-24T00:00:00.000Z", verified: true }] } }));
  await page.goto("/products/combat-framework");
  const section = page.getByRole("region", { name: "Customer reviews" });
  await expect(section.getByText("4.0 / 5")).toBeVisible();
  await expect(section.getByText("Verified purchase", { exact: true })).toBeVisible();
  await expect(section.getByText("<img src=x onerror=alert(1)>", { exact: true })).toBeVisible();
  await expect(section.locator("img, script")).toHaveCount(0);
  await expect(section.getByText("1 approved review", { exact: true })).toBeVisible();
});

test("unavailable review data does not invent zero ratings or customer reviews", async ({ page }) => {
  await page.route("**/api/reviews?*", route => route.fulfill({ status: 503, json: { message: "Unavailable" } }));
  await page.goto("/products/combat-framework");
  const section = page.getByRole("region", { name: "Customer reviews" });
  await expect(section.getByText("Reviews are not available right now.", { exact: true })).toBeVisible();
  await expect(section.getByText(/\/ 5/)).toHaveCount(0);
});

test("review pagination fetches the next real page", async ({ page }) => {
  await page.route("**/api/reviews?*", route => {
    const current = Number(new URL(route.request().url()).searchParams.get("page") ?? 1);
    return route.fulfill({ json: { total: 11, average: 5, page: current, hasMore: current === 1,
      reviews: [{ id: `review_page_${current}`, rating: 5, displayName: `Builder ${current}`,
        body: "Easy to install and the combat feels responsive.", createdAt: "2026-10-24T00:00:00.000Z", verified: true }] } });
  });
  await page.goto("/products/combat-framework");
  const section = page.getByRole("region", { name: "Customer reviews" });
  await expect(section.getByText("Builder 1", { exact: true })).toBeVisible();
  await section.getByRole("button", { name: "Load more reviews" }).click();
  await expect(section.getByText("Builder 2", { exact: true })).toBeVisible();
  await expect(section.getByRole("button", { name: "Load more reviews" })).toHaveCount(0);
});
