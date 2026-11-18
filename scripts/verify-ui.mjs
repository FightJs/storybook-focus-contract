import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006';
const out = 'results/ui';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const checks = [];
try {
 for (const width of [320, 375, 768, 1280, 1440, 1920]) {
  const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/iframe.html?id=demo-popover--working&viewMode=story`);
  const trigger=page.getByTestId('trigger');await expect(trigger).toBeVisible();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
  const size=await trigger.boundingBox();assert.ok(size.height>=44);
  if(width!==320)await page.screenshot({path:`${out}/working-${width}.png`,fullPage:true});
  await trigger.focus();await page.keyboard.press('Enter');await expect(page.getByTestId('close')).toBeFocused();
  await expect(page.getByTestId('focus-observation')).toHaveText('close');
  const dialog=await page.getByRole('dialog',{name:'示例设置'}).boundingBox();
  assert.ok(dialog.x>=0 && dialog.x+dialog.width<=width,`dialog outside ${width}: ${JSON.stringify(dialog)}`);
  if([375,768,1440].includes(width)) await page.screenshot({path:`${out}/open-${width}.png`,fullPage:true});
  await page.keyboard.press('Tab');await expect(page.getByTestId('secondary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.getByTestId('close')).toBeFocused();
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
  await expect(page.getByTestId('focus-observation')).toHaveText('trigger');
  await page.getByRole('link',{name:'错误示例',exact:true}).click();
  await expect(page.getByTestId('trigger')).toBeVisible();
  await page.getByTestId('trigger').click();await page.keyboard.press('Escape');
  await expect(page.getByTestId('focus-observation')).toHaveText('document.body');
  if(width===375 || width===1440)await page.screenshot({path:`${out}/broken-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);checks.push({width,keyboard:'passed',dialog:'within viewport',overflow:false,liveFocus:'truthful'});
  await page.close();
 }
 const page=await browser.newPage();await page.goto(`${base}/iframe.html?id=demo-popover--working&viewMode=story`);await expect(page.getByTestId('trigger')).toBeVisible();
 const contrast=await page.evaluate(()=>{
  const ctx=document.createElement('canvas').getContext('2d');
  const color=token=>{ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue(token);ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)};
  const l=rgb=>rgb.map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[0.2126,0.7152,0.0722][i],0);
  return [['--color-muted','--color-paper'],['--color-muted','--color-paper-2'],['--color-accent','--color-accent-soft'],['--color-ink','--color-paper']].map(([text,bg])=>{const a=l(color(text)),b=l(color(bg));return {text,bg,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)}});
 });
 for(const pair of contrast)assert.ok(pair.ratio>=4.5,JSON.stringify(pair));
 await writeFile(`${out}/checks.json`,JSON.stringify({checks,contrast},null,2)+'\n');
 console.log(JSON.stringify({viewports:checks.length,keyboard:'passed',dialog:'passed',contrast},null,2));
} finally {await browser.close()}
