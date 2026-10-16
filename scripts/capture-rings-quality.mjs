// Evidence from the actual production build + independent GLTF viewer.
// Start the app on 3110 and scripts/view-rings.mjs on 3112 first.
import { chromium, devices } from '@playwright/test';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out=fileURLToPath(new URL('../docs/visual-review/rings-quality/',import.meta.url));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={source:'Local Next.js production build; actual GLB, no concept-image substitution',browser:browser.version(),views:[]};
try{
  for(const [name,options] of [['desktop',{viewport:{width:1440,height:1000}}],['mobile',{...devices['iPhone 13'],viewport:{width:390,height:844},defaultBrowserType:undefined}]]){
    const context=await browser.newContext(options),page=await context.newPage();
    page.setDefaultTimeout(30_000);
    await page.addInitScript(()=>{
      window.inkzReviewMetrics={draws:0,frames:[]};
      const draw=WebGL2RenderingContext.prototype.drawElements;
      WebGL2RenderingContext.prototype.drawElements=function(...args){window.inkzReviewMetrics.draws++;return draw.apply(this,args);};
      const clear=WebGL2RenderingContext.prototype.clear;
      WebGL2RenderingContext.prototype.clear=function(...args){window.inkzReviewMetrics.frames.push(performance.now());return clear.apply(this,args);};
    });
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:3110');await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);
    const host=page.locator('.artifact-webgl');
    await host.locator('canvas').waitFor();
    await page.locator('.hero-artifact').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.artifact-webgl')?.dataset.activity==='resting',null,{timeout:30000});
    const restingDraws=await page.evaluate(()=>window.inkzReviewMetrics.draws);
    await page.waitForTimeout(300);
    const performanceObservation=await page.evaluate(before=>({
      indexedDrawCalls:window.inkzReviewMetrics.draws,
      frameClears:window.inkzReviewMetrics.frames.length,
      firstClearMs:window.inkzReviewMetrics.frames[0],
      drawsDuring300msAtRest:window.inkzReviewMetrics.draws-before,
      assets:performance.getEntriesByType('resource').filter(x=>x.name.includes('/models/')).map(x=>({name:new URL(x.name).pathname,encodedBytes:x.encodedBodySize,durationMs:x.duration})),
      note:'Single local software-WebGL observation; not a hardware-device benchmark.'
    }),restingDraws);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:out+name+'-hero.png'});
    if(name==='mobile')await page.locator('.hero').screenshot({path:out+'mobile-full-hero.png'});
    await page.locator('.hero-artifact').screenshot({path:out+name+'-artifact.png'});
    report.views.push({view:name,viewport:page.viewportSize(),model:await host.evaluate(x=>({...x.dataset})),horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),performance:performanceObservation,errors});
    await page.getByRole('button',{name:'Inspect form',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.artifact-webgl')?.dataset.assembly==='open');
    await page.locator('.hero-artifact').screenshot({path:out+name+'-inspect.png'});
    await page.getByRole('button',{name:'Reset form',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.artifact-webgl')?.dataset.assembly==='closed');
    await page.getByRole('button',{name:'Pause motion',exact:true}).click();
    if(await page.locator('.hero-artifact').getAttribute('data-motion')!=='paused')throw Error('Pause did not apply');
    await page.getByRole('button',{name:'Resume motion',exact:true}).click();
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('.hero-artifact')?.dataset.renderer==='static');
    await page.locator('.hero-artifact').screenshot({path:out+name+'-reduced-motion.png'});
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1000,height:1000},deviceScaleFactor:1});
  const page=await context.newPage();await page.goto('http://127.0.0.1:3112');await page.waitForFunction(()=>document.body.dataset.ready==='true');
  await page.locator('header').evaluate(x=>x.style.display='none');
  for(const [name,position] of [['matching-main',[3.4,2.5,7]],['quarter-left',[-3.4,2.5,7]],['side',[7,1.5,1.8]]]){
    await page.evaluate(position=>window.review.pose(...position),position);
    await page.screenshot({path:out+'webgl-'+name+'.png'});
  }
  await page.evaluate(()=>{window.review.pose(3.4,2.5,7);window.review.model.traverse(o=>{if(o.isMesh)o.material.wireframe=true});window.review.renderer.render(window.review.scene,window.review.camera)});
  await page.screenshot({path:out+'webgl-wireframe.png'});await context.close();
  await copyFile(fileURLToPath(new URL('../assets/source/inkz-rings-poster.png',import.meta.url)),out+'blender-matching-main.png');
  await writeFile(out+'render-review.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
