import { test, expect } from "@playwright/test";
import { gunzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";

test("the catalog searches real product data and recovers from an empty selection", async ({page}) => {
  await page.goto("/products");
  await expect(page.getByRole("heading",{name:"Combat Framework",exact:true})).toBeVisible();
  const search=page.getByRole("searchbox",{name:"Search products"});
  await search.fill("nonexistent-framework");
  await expect(page.getByRole("heading",{name:"Nothing in this selection."})).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(0);
  await page.getByRole("button",{name:"Clear selection"}).click();
  await expect(search).toHaveValue("");
  await page.getByRole("button",{name:"Combat System",exact:true}).click();
  await expect(page.getByRole("button",{name:"Combat System",exact:true})).toHaveAttribute("aria-pressed","true");
  await search.fill("Luau");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await search.fill("nothing");
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze()).violations).toEqual([]);
});

test("product presentation does not overlap navigation or pretend a demo exists", async ({page}) => {
  await page.goto("/products/combat-framework");
  await expect(page.getByText("No approved footage available.",{exact:true})).toBeVisible();
  await expect(page.locator("video,iframe")).toHaveCount(0);
  const media=await page.locator(".media-pending").boundingBox();
  const navigation=await page.getByRole("navigation",{name:"Product sections"}).boundingBox();
  expect(media!.y+media!.height).toBeLessThanOrEqual(navigation!.y);
  await expect(page.getByRole("button",{name:"Launching soon"})).toBeDisabled();
});

test("THE RINGS is loaded as a measured named GLB model", async ({page,request}) => {
  const response=await request.get("/models/inkz-rings.glb");
  expect(response.status()).toBe(200);
  const bytes=await response.body();
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  expect(bytes.length).toBeLessThan(1_500_000);
  const studio=await request.get("/models/inkz-studio.bin.gz");
  expect(studio.status()).toBe(200);
  const environment=gunzipSync(await studio.body());
  expect(environment.length).toBe(1572880);
  expect(environment.toString("ascii",0,4)).toBe("INKZ");
  expect(environment.readUInt32LE(8)).toBe(384);
  expect(environment.readUInt32LE(12)).toBe(512);
  await page.goto("/");
  const host=page.locator(".artifact-webgl");
  await expect(host).toHaveAttribute("data-load","ready",{timeout:20_000});
  await expect(host).toHaveAttribute("data-model","/models/inkz-rings.glb");
  await expect(host).toHaveAttribute("data-rings","3");
  expect(Number(await host.getAttribute("data-triangles"))).toBeGreaterThan(1000);
  expect(Number(await host.getAttribute("data-triangles"))).toBeLessThan(100000);
});

for (const asset of ["inkz-rings.glb","inkz-studio.bin.gz","inkz-core-studio.bin.gz"]) test(`a failed ${asset} request restores the genuine model poster and useful navigation`, async ({page}) => {
  await page.route(`**/models/${asset}`,route=>route.fulfill({status:404,body:"Unavailable"}));
  await page.goto("/");
  await expect(page.locator(".artifact-webgl")).toHaveAttribute("data-load","failed",{timeout:20_000});
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer","static");
  await expect(page.locator(".artifact-poster")).toHaveCSS("opacity","1");
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(0);
  await expect(page.getByText("Interactive model unavailable. Rendered view shown.")).toBeVisible();
  await page.getByRole("link",{name:"Browse products",exact:true}).click();
  await expect(page).toHaveURL(/\/products$/);
});

test("reduced motion avoids model transfer and returning to the homepage never duplicates canvases", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  let modelRequests=0;
  page.on("request",request=>{ if(request.url().endsWith("/models/inkz-rings.glb")) modelRequests++; });
  await page.goto("/");
  await expect(page.locator(".artifact-poster")).toBeVisible();
  expect(modelRequests).toBe(0);
  await page.emulateMedia({reducedMotion:"no-preference"});
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer","webgl",{timeout:20_000});
  await page.getByRole("link",{name:"Browse products",exact:true}).click();
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(0);
  await page.locator(".site-header").getByRole("link",{name:"INKZ home"}).click();
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer","webgl",{timeout:20_000});
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(1);
});

test("brand colors and all existing public routes retain their release boundaries", async ({page}) => {
  await page.goto("/");
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--accent").trim())).toBe("#d61f35");
  const header=page.getByRole("heading",{name:"TOOLS FOR THE ONES WHO BUILD."});
  await expect(header).toBeVisible();
  await page.goto("/contact");
  await expect(page.getByRole("heading",{name:"Add inkz_xko on Discord."})).toBeVisible();
  await expect(page.locator('a[href^="mailto:"],form')).toHaveCount(0);
  for(const route of ["/terms","/refund-policy","/privacy"]) {
    await page.goto(route);
    await expect(page.locator(".policy-summary")).toBeVisible();
    await expect(page.getByRole("navigation",{name:"On this page"})).toBeVisible();
  }
});


test("embedded PBR images close once when the sculpture unmounts", async ({page}) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const metrics=window as unknown as {inkzClosedImages:number;inkzDecodedImages:number};
    metrics.inkzClosedImages=0;metrics.inkzDecodedImages=0;
    const decode=window.createImageBitmap.bind(window);
    window.createImageBitmap=(async (...args:unknown[])=>{
      const image:ImageBitmap=await Reflect.apply(decode,window,args);
      metrics.inkzDecodedImages++;return image;
    }) as typeof createImageBitmap;
    const close=ImageBitmap.prototype.close;
    ImageBitmap.prototype.close=function(){metrics.inkzClosedImages++;return close.call(this);};
  });
  await page.goto("/");
  await expect(page.locator(".artifact-webgl")).toHaveAttribute("data-load","ready",{timeout:20_000});
  expect(await page.evaluate(()=>(window as unknown as {inkzDecodedImages:number}).inkzDecodedImages)).toBe(1);
  await page.getByRole("link",{name:"Browse products",exact:true}).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {inkzClosedImages:number}).inkzClosedImages),{timeout:20_000}).toBe(1);
  await page.locator(".site-header").getByRole("link",{name:"INKZ home"}).click();
  await expect(page.locator(".artifact-webgl")).toHaveAttribute("data-load","ready",{timeout:20_000});
  await page.getByRole("link",{name:"Browse products",exact:true}).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {inkzClosedImages:number}).inkzClosedImages),{timeout:20_000}).toBe(2);
  expect(await page.evaluate(()=>(window as unknown as {inkzDecodedImages:number}).inkzDecodedImages)).toBe(2);
});


test("a failed PBR image decode retains the genuine rendered poster", async ({page}) => {
  await page.addInitScript(()=>{window.createImageBitmap=()=>Promise.reject(new Error("Simulated image decode failure"));});
  await page.goto("/");
  await expect(page.locator(".artifact-webgl")).toHaveAttribute("data-load","failed",{timeout:20_000});
  await expect(page.locator(".hero-artifact")).toHaveAttribute("data-renderer","static");
  await expect(page.locator(".artifact-webgl canvas")).toHaveCount(0);
  await expect(page.locator(".artifact-poster")).toHaveCSS("opacity","1");
});
