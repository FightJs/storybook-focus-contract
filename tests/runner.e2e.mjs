import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { executeContract } from '../dist/runner.js';
const html = `<!doctype html><body><div id="storybook-root"><button data-testid="start">Start</button><button data-testid="next">Next</button><button data-testid="dup">A</button><button data-testid="dup">B</button><button data-testid="odd&quot;]">Odd</button><div data-testid="hidden" hidden></div></div><script>window.__STORYBOOK_PREVIEW__={channel:{last:()=>[{storyId:"demo--one",status:"success"}]}};document.querySelector('[data-testid="start"]').onclick=()=>{const b=document.createElement('button');b.dataset.testid='portal';b.textContent='Portal';document.body.append(b);b.focus();b.onkeydown=e=>{if(e.key==='Escape'){b.remove();document.querySelector('[data-testid="start"]').focus()}}};</script>`;
test('real keyboard navigation, portal, hidden waits and accurate first failure', async () => {
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(req.url.includes('missing-story')?'<div id="storybook-root"></div>':html)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const baseUrl=`http://127.0.0.1:${server.address().port}`;
 const dir=await mkdtemp(join(tmpdir(),'focus-runner-'));
 let browser;
 const run=async(steps, extra={})=>{const context=await browser.newContext();try{return await executeContract(await context.newPage(),{version:1,storyId:'demo--one',initialFocus:'start',steps,...extra},{baseUrl,outDir:dir,timeout:250})}finally{await context.close()}};
 try {
  browser=await chromium.launch();
  const success=await run([{action:'press',key:'Tab',expectFocus:'next'},{action:'press',key:'Shift+Tab',expectFocus:'start'},{action:'press',key:'Enter',expectFocus:'portal'},{action:'press',key:'Escape',expectFocus:'start'},{action:'wait',target:'portal',state:'hidden'},{action:'wait',target:'hidden',state:'hidden'}]);
  assert.equal(success.status,'passed');assert.equal(success.steps.length,6);
  assert.ok(success.focusHistory.some(x=>x.testId==='portal'));
  const failure=await run([{action:'press',key:'Tab',expectFocus:'start'},{action:'press',key:'Tab',expectFocus:'dup'}]);
  assert.equal(failure.status,'failed');assert.equal(failure.firstFailure,1);assert.equal(failure.steps.length,1);
  assert.equal(failure.steps[0].actual.testId,'next');assert.equal(failure.steps[0].expected,'start');
  assert.ok(failure.screenshot,failure.screenshotError);assert.ok((await readFile(join(dir,'failure.png'))).length>100);
  const report=JSON.parse(await readFile(join(dir,'report.json'),'utf8'));assert.equal(report.status,'failed');
  for(const target of ['absent','dup']) {const r=await run([{action:'click',target,expectFocus:'start'}]);assert.equal(r.status,'failed');assert.match(r.error,/unique|exactly one/i)}
  const hiddenDup=await run([{action:'wait',target:'dup',state:'hidden'}]);assert.equal(hiddenDup.status,'failed');
  const missing=await run([{action:'press',key:'Tab',expectFocus:'next'}],{storyId:'missing-story'});assert.equal(missing.status,'failed');assert.equal(missing.firstFailure,0);
  const initial=await run([{action:'press',key:'Tab',expectFocus:'next'}],{initialFocus:'dup'});assert.equal(initial.firstFailure,0);
  const offlineContext=await browser.newContext();try {const offline=await executeContract(await offlineContext.newPage(),{version:1,storyId:'demo--one',steps:[{action:'click',target:'x',expectFocus:'x'}]},{baseUrl:'http://127.0.0.1:1',outDir:dir,timeout:250});assert.equal(offline.status,'failed');assert.equal(offline.firstFailure,0)}finally{await offlineContext.close()}
 }finally{await browser?.close();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}
});
test('rejects delayed cross-document navigation including same-URL reloads',async()=>{
 const destination=`<div id="storybook-root"><button data-testid="next" autofocus>Next</button></div>`;
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(req.url.startsWith('/other')?destination:`<div id="storybook-root"><button data-testid="start">Start</button></div><script>window.__STORYBOOK_PREVIEW__={channel:{last:()=>[{storyId:new URLSearchParams(location.search).get('id'),status:'success'}]}};if(sessionStorage.reloaded){document.querySelector('#storybook-root').innerHTML='<button data-testid="next" autofocus>Next</button>';document.querySelector('button').focus()}else{document.querySelector('button').onclick=()=>setTimeout(()=>{if(location.search.includes('reload')){sessionStorage.reloaded='yes';location.reload()}else location.href='/other'},100)}</script>`)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const dir=await mkdtemp(join(tmpdir(),'focus-navigation-'));let browser;
 try {
  browser=await chromium.launch();
  for(const storyId of ['demo--nav','demo--reload']){
   const context=await browser.newContext();
   const r=await executeContract(await context.newPage(),{version:1,storyId,initialFocus:'start',steps:[{action:'click',target:'start',expectFocus:'next'}]},{baseUrl:`http://127.0.0.1:${server.address().port}`,outDir:join(dir,storyId),timeout:1000});
   assert.equal(r.status,'failed',`navigation must not pass: ${storyId}`);assert.equal(r.firstFailure,1);await context.close();
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}
});
test('portal-only stories require successful Storybook completion, not root children',async()=>{
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');const failed=req.url.includes('failed');res.end(`<div id="storybook-root"></div><button data-testid="portal">Portal</button><script>window.__STORYBOOK_PREVIEW__={channel:{last:()=>[{storyId:'${failed?'demo--failed':'demo--portal'}',status:'${failed?'error':'success'}'}]}};</script>`)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const dir=await mkdtemp(join(tmpdir(),'focus-ready-'));let browser;
 try{
  browser=await chromium.launch();
  for(const storyId of ['demo--portal','demo--failed']){
   const context=await browser.newContext();
   const r=await executeContract(await context.newPage(),{version:1,storyId,steps:[{action:'click',target:'portal',expectFocus:'portal'}]},{baseUrl:`http://127.0.0.1:${server.address().port}`,outDir:join(dir,storyId),timeout:1000});
   assert.equal(r.status,storyId==='demo--portal'?'passed':'failed',r.error);await context.close();
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}
});
