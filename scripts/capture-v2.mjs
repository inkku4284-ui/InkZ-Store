// Capture actual production-build pages; start site on 3110 and local GLB viewer on 3112.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("../docs/visual-review/v2",import.meta.url));
const origin=process.env.INKZ_REVIEW_ORIGIN || "http://127.0.0.1:3110";
const routes=[['home','/'],['products','/products'],['product','/products/combat-framework'],['docs','/docs'],['contact','/contact'],['terms','/terms'],['refunds','/refund-policy'],['privacy','/privacy'],['sandbox','/sandbox/checkout'],['success','/sandbox/checkout/success'],['cancel','/sandbox/checkout/cancel'],['404','/no-such-system']];
(async()=>{
 fs.mkdirSync(root,{recursive:true}); const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const review=[];
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for(const [slug,route] of routes){const response=await page.goto(origin+route);await page.evaluate(()=>document.fonts.ready);
   if(slug==='home'){await page.locator('.hero-artifact[data-renderer="webgl"]').waitFor({timeout:30000});await page.locator('.artifact-webgl[data-activity="resting"]').waitFor({timeout:20000});await page.screenshot({path:`${root}/${name}-hero.png`});}
   await page.screenshot({path:`${root}/${name}-${slug}.png`,fullPage:true});
   review.push({viewport:name,width,route,status:response.status(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  }
  await page.goto(origin+'/products');await page.getByRole('searchbox',{name:'Search products'}).fill('not-in-this-collection');await page.screenshot({path:`${root}/${name}-empty.png`,fullPage:true});
  if(name==='mobile'){await page.locator('button[aria-controls="main-nav"]').click();await page.screenshot({path:`${root}/mobile-menu.png`});}
  review.push({viewport:name,errors});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto('http://127.0.0.1:3112');await page.locator('body[data-ready="true"]').waitFor();await page.screenshot({path:`${root}/standalone-model.png`});await page.getByRole('button',{name:'Toggle wireframe'}).click();await page.screenshot({path:`${root}/standalone-wireframe.png`});await page.close();
 const fallback=await browser.newPage({viewport:{width:1440,height:1000}});await fallback.route('**/models/inkz-rings.glb',r=>r.fulfill({status:404,body:'Unavailable'}));await fallback.goto(origin);await fallback.getByText('Interactive model unavailable. Rendered view shown.').waitFor();await fallback.screenshot({path:`${root}/model-unavailable.png`});await fallback.close();
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.goto(origin);await reduced.evaluate(()=>document.fonts.ready);await reduced.screenshot({path:`${root}/mobile-reduced-motion.png`,fullPage:true});await reduced.close();
 // The all-route matrix supplements the dedicated real-WebGL desktop/mobile run.
 const matrix=await browser.newPage({reducedMotion:'reduce'});
 for(const width of [320,375,390,768,1280,1440]){await matrix.setViewportSize({width,height:1000});for(const [,route] of routes){await matrix.goto(origin+route);await matrix.evaluate(()=>document.fonts.ready);review.push({width,route,overflow:await matrix.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});}if([320,768,1280].includes(width)){await matrix.goto(origin);await matrix.evaluate(()=>document.fonts.ready);await matrix.screenshot({path:`${root}/home-${width}.png`,fullPage:true});}}
 await matrix.close(); fs.writeFileSync(`${root}/render-review.json`,JSON.stringify(review,null,2)); console.log(JSON.stringify({screenshots:fs.readdirSync(root).filter(x=>x.endsWith('.png')).length,reviewCount:review.length,problems:review.filter(x=>x.overflow||x.errors?.length)}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
