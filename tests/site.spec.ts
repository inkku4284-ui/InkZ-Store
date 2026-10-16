import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/products", "/products/combat-framework", "/docs", "/contact", "/terms", "/refund-policy", "/privacy"];

for (const route of routes) {
  test(`${route} renders accessibly without overflow or browser errors`, async ({page}) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.title()).toContain("INKZ");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    const accessibility = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("every internal link resolves, including documentation anchors", async ({page,request}) => {
  const links = new Set<string>();
  for (const route of routes) {
    await page.goto(route);
    for (const href of await page.locator("a[href]").evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).href))) {
      const url = new URL(href);
      if (url.origin === "http://127.0.0.1:3000") links.add(`${url.pathname}${url.hash}`);
    }
  }
  expect(links.size).toBeGreaterThan(routes.length);
  const documents = new Map<string,string>();
  for (const link of links) {
    const [path, hash] = link.split("#");
    let html = documents.get(path);
    if (!html) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      html = await response.text();
      documents.set(path,html);
    }
    if (hash) expect(html,link).toContain(`id="${hash}"`);
  }
});

test("mobile navigation supports keyboard, Escape, and route changes", async ({page},testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile disclosure navigation");
  await page.goto("/");
  const toggle = page.locator('button[aria-controls="main-nav"]');
  const navigation = page.getByRole("navigation",{name:"Main navigation"});
  await expect(navigation).not.toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link",{name:"Products"})).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(navigation).not.toBeVisible();
  await toggle.click();
  await navigation.getByRole("link",{name:"Products"}).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(navigation).not.toBeVisible();
  await expect(page.getByRole("button",{name:"Menu +"})).toHaveAttribute("aria-expanded","false");
});

test("FAQ is keyboard operable and purchasing stays disabled", async ({page}) => {
  await page.goto("/");
  const question = page.locator("summary").first();
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  await expect(page.locator(".faq-answer").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("details").first()).not.toHaveAttribute("open");
  await page.goto("/products/combat-framework");
  await expect(page.getByRole("button",{name:"Purchasing unavailable"})).toBeDisabled();
  await expect(page.locator("form,input,iframe")).toHaveCount(0);
  await page.goto("/contact");
  await expect(page.locator("form,input")).toHaveCount(0);
  await expect(page.getByText("There is no active contact form",{exact:false})).toBeVisible();
});

test("bundled assets load without third-party requests or tracking storage", async ({page}) => {
  const external: string[] = [];
  const failures: string[] = [];
  page.on("request",request => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== "http://127.0.0.1:3000") external.push(url.origin);
  });
  page.on("requestfailed",request => failures.push(request.url()));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('600 16px "Space Grotesk"'))).toBe(true);
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "webgl", {timeout:20_000});
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.context().cookies()).toEqual([]);
  expect(external).toEqual([]);
  expect(failures).toEqual([]);
});

test("unknown pages return 404 and social image is generated", async ({page,request}) => {
  const response = await page.goto("/no-such-system");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading",{name:"No system here."})).toBeVisible();
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("reduced motion and the skip link work", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
