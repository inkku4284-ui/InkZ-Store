import { test, expect } from "@playwright/test";

test("the scene stops GPU draws at rest and returns exactly to neutral", async ({page}) => {
  // Allow software-GPU startup plus the finite idle interval on shared CI.
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const metrics = window as unknown as { inkzDraws: number };
    metrics.inkzDraws = 0;
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function(...args: Parameters<typeof original>) {
      metrics.inkzDraws++;
      return original.apply(this, args);
    };
    // Count indexed GLB meshes and any non-indexed procedural studio draws.
    const arrays = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function(...args: Parameters<typeof arrays>) {
      metrics.inkzDraws++;
      return arrays.apply(this, args);
    };
  });
  await page.goto("/");
  const host = page.locator(".artifact-webgl");
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "webgl", {timeout:20_000});
  await expect(host).toHaveAttribute("data-activity", "resting", {timeout:20_000});
  const count = () => page.evaluate(() => (window as unknown as {inkzDraws:number}).inkzDraws);
  const stopped = await count();
  expect(stopped).toBeGreaterThan(0);
  const neutral = await host.locator("canvas").screenshot();
  await page.waitForTimeout(300);
  expect(await count()).toBe(stopped);
  const stage = await page.locator(".artifact-stage").boundingBox();
  if (!stage) throw new Error("Missing identity stage");
  await page.mouse.move(stage.x + stage.width * 0.85, stage.y + stage.height * 0.2, {steps:8});
  await expect.poll(count).toBeGreaterThan(stopped);
  await page.mouse.move(0,0);
  await expect(host).toHaveAttribute("data-activity", "resting");
  expect((await host.locator("canvas").screenshot()).equals(neutral)).toBe(true);
});

test("critical homepage content is readable with JavaScript disabled", async ({browser,page}) => {
  const context = await browser.newContext({javaScriptEnabled:false,viewport:page.viewportSize() ?? {width:390,height:844}});
  try {
    const noJs = await context.newPage();
    await noJs.goto("http://127.0.0.1:3000");
    await expect(noJs.getByRole("heading",{name:"TOOLS FOR THE ONES WHO BUILD."})).toBeVisible();
    await expect(noJs.locator(".hero-copy")).toContainText("Original software for Roblox creators.");
    await expect(noJs.locator(".hero-copy")).toHaveCSS("opacity","1");
    await expect(noJs.locator(".artifact-poster")).toBeVisible();
    await noJs.getByRole("link",{name:"Browse products",exact:true}).click();
    await expect(noJs).toHaveURL(/\/products$/);
  } finally { await context.close(); }
});

test("product certainty, selected focus, and real-media omission remain explicit", async ({page}) => {
  await page.goto("/products/combat-framework");
  for (const name of ["Confirmed targets","Planned release","Pending verification"]) {
    await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  }
  await expect(page.locator(".concept-heading")).toContainText("Conceptual");
  const selected = page.getByRole("button",{name:"01 Intent"});
  await selected.focus();
  await expect(selected).toHaveCSS("outline-style","solid");
  await expect(selected).toHaveCSS("outline-color","rgb(10, 10, 11)");
  expect((await selected.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator("video,iframe")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Purchasing unavailable"})).toBeDisabled();
});

test("required viewport matrix has unclipped headings, usable controls and no overflow", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  for (const width of [320,375,390,430,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:1000});
    for (const route of ["/","/products/combat-framework"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${route} at ${width}`).toBe(false);
      if (route === "/") {
        expect(await page.locator(".hero-line").evaluateAll(lines => lines.every(line => line.scrollWidth <= line.clientWidth + 1)), `Headline at ${width}`).toBe(true);
        const cta = await page.getByRole("link",{name:"Browse products",exact:true}).boundingBox();
        expect(cta!.height).toBeGreaterThanOrEqual(44);
        expect(cta!.x + cta!.width).toBeLessThanOrEqual(width);
      }
    }
  }
});
