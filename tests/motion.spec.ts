import { test, expect } from "@playwright/test";

test("the production hero renders real geometry and supports pausing", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const artifact = page.locator(".hero-artifact");
  await expect(artifact).toHaveAttribute("data-renderer", "webgl", {timeout:20_000});
  await expect(artifact.locator("canvas")).toBeVisible();
  expect(await artifact.locator("canvas").evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2");
    return canvas.width > 0 && canvas.height > 0 && !!gl && !gl.isContextLost();
  })).toBe(true);
  await page.getByRole("button", {name:"Pause motion"}).click();
  await expect(artifact).toHaveAttribute("data-motion", "paused");
  await expect(page.getByRole("button", {name:"Resume motion"})).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", {name:"Resume motion"}).click();
  await expect(artifact).toHaveAttribute("data-motion", "running");
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await expect(artifact).toHaveAttribute("data-motion", "suspended");
  expect(errors).toEqual([]);
});

test("reduced motion keeps the designed poster and skips WebGL", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "static");
  await expect(page.locator(".artifact-poster")).toBeVisible();
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(0);
  await expect(page.getByRole("button", {name:"Pause motion"})).toHaveCount(0);
  expect(await page.locator(".hero-line > span").first().evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await page.emulateMedia({reducedMotion:"no-preference"});
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "webgl", {timeout:20_000});
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(0);
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "static");
});

test("unavailable WebGL leaves the full hero and catalog usable", async ({page}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {value:function(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind === "webgl" || kind === "webgl2" || kind === "experimental-webgl") {
        document.documentElement.dataset.webglAttempted = "true";
        return null;
      }
      return Reflect.apply(original, this, [kind, ...args]);
    }});
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-webgl-attempted", "true", {timeout:20_000});
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "static");
  await expect(page.locator(".artifact-poster")).toBeVisible();
  await expect(page.getByRole("heading", {name:"TOOLS FOR THE ONES WHO BUILD."})).toBeVisible();
  await page.getByRole("link", {name:"Browse products", exact:true}).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", {name:"Combat Framework"})).toBeVisible();
});

test("a lost WebGL context restores the designed poster", async ({page}) => {
  await page.goto("/");
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "webgl", {timeout:20_000});
  await page.locator(".artifact-webgl canvas").evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "static");
  await expect(page.locator(".artifact-poster")).toHaveCSS("opacity", "1");
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(0);
});

test("the conceptual product diagram supports keyboard selection", async ({page}) => {
  await page.goto("/products/combat-framework");
  const controls = page.getByRole("group", {name:"Conceptual interaction stages"});
  const rules = controls.getByRole("button", {name:"02 Rules"});
  await rules.focus();
  await page.keyboard.press("Enter");
  await expect(rules).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#concept-description")).toContainText("authority boundaries still require source review");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(controls.getByRole("button", {name:"03 State"})).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#concept-description")).toContainText("not yet verified");
  await expect(page.getByRole("button", {name:"Purchasing unavailable"})).toBeDisabled();
});

test("the identity assembly can be inspected by keyboard and returns to its exact resting form", async ({page}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const host = page.locator(".artifact-webgl");
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer", "webgl", {timeout:20_000});
  await expect(host).toHaveAttribute("data-activity", "resting", {timeout:20_000});
  const inspect = page.getByRole("button", {name:"Inspect form", exact:true});
  await inspect.focus();
  // Match keyboard focus and scroll state in the two pixel comparisons.
  const closed = await host.locator("canvas").screenshot();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", {name:"Reset form", exact:true})).toHaveAttribute("aria-pressed", "true");
  await expect(host).toHaveAttribute("data-assembly", "open", {timeout:10_000});
  await expect(host).toHaveAttribute("data-activity", "resting");
  expect((await host.locator("canvas").screenshot()).equals(closed)).toBe(false);
  await page.keyboard.press("Enter");
  await expect(host).toHaveAttribute("data-assembly", "closed", {timeout:10_000});
  await expect(host).toHaveAttribute("data-activity", "resting");
  expect((await host.locator("canvas").screenshot()).equals(closed)).toBe(true);
});
