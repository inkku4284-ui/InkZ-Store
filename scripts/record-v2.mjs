// Actual browser recording, not an animation render or edited concept sequence.
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const output=fileURLToPath(new URL("../docs/visual-review/v2/",import.meta.url));
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync("/usr/bin/chromium")?"/usr/bin/chromium":undefined),args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try {
  const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:mkdtempSync(join(tmpdir(),"inkz-v2-record-")),size:{width:1280,height:900}}});
  const page=await context.newPage();
  await page.goto(process.env.INKZ_REVIEW_ORIGIN || "http://127.0.0.1:3110");
  const host=page.locator(".artifact-webgl");
  await page.locator('.hero-artifact[data-renderer="webgl"]').waitFor({timeout:30_000});
  await page.locator('.artifact-webgl[data-activity="resting"]').waitFor({timeout:20_000});
  await page.getByRole("button",{name:"Inspect form",exact:true}).click();
  await page.locator('.artifact-webgl[data-assembly="open"][data-activity="resting"]').waitFor();
  await page.screenshot({path:join(output,"rings-inspected.png")});
  await page.waitForTimeout(700);
  await page.getByRole("button",{name:"Pause motion"}).click();
  await page.waitForTimeout(500);
  await page.getByRole("button",{name:"Resume motion"}).click();
  await page.getByRole("button",{name:"Reset form",exact:true}).click();
  await page.locator('.artifact-webgl[data-assembly="closed"][data-activity="resting"]').waitFor();
  const stage=await host.boundingBox();
  await page.mouse.move(stage.x+stage.width*.8,stage.y+stage.height*.25,{steps:20});
  await page.waitForTimeout(700);
  await page.mouse.move(0,0,{steps:10});
  await page.locator('.artifact-webgl[data-activity="resting"]').waitFor();
  await page.locator(".home-product").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const video=page.video(); await context.close();
  const result=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-i",await video.path(),"-c:v","libx264","-crf","24","-pix_fmt","yuv420p","-movflags","+faststart",join(output,"motion-review.mp4")],{stdio:"inherit"});
  if(result.status!==0) throw new Error("FFmpeg is required to convert the actual browser recording");
  console.log("Actual browser motion evidence saved; software WebGL, not a device benchmark.");
} finally { await browser.close(); }
