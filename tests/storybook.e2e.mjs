import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';
import { executeContract } from '../dist/runner.js';
import { exportContract } from '../dist/export.js';
import { localViteUrl } from './vite-output.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function command(file,args,cwd,env={}) {
 return await new Promise((resolve,reject)=>{
  const child=spawn(file,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  child.on('error',reject);child.on('close',code=>resolve({code,output}));
 });
}
test('Storybook fixtures and independently installed exports agree with CLI results', {timeout:180000}, async()=>{
 const dir=await mkdtemp(join(tmpdir(),'focus-storybook-'));
 // Vite serves the actual static Storybook build. Port 0 lets the OS choose a free port.
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','storybook-static','--host','127.0.0.1','--port','0'],{stdio:['ignore','pipe','pipe']});
 let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 let browser;
 try {
  let baseUrl;
  for(let i=0;i<200;i++){baseUrl=localViteUrl(output);if(baseUrl)break;await sleep(100)}
  assert.ok(baseUrl,output);
  browser=await chromium.launch();
  for(const mode of ['working','broken']){
   const contract=JSON.parse(await readFile(`contracts/${mode}.json`,'utf8'));
   const context=await browser.newContext({viewport:{width:1280,height:720}});
   const report=await executeContract(await context.newPage(),contract,{baseUrl,outDir:join(dir,mode)});
   await context.close();
   assert.equal(report.status,mode==='working'?'passed':'failed',report.error);
   if(mode==='broken'){assert.equal(report.firstFailure,5);assert.equal(report.steps.at(-1).actual.tag,'body')}
   const cli=await command(process.execPath,[resolve('dist/cli.js'),'run',resolve(`contracts/${mode}.json`),'--base-url',baseUrl],dir);
   assert.equal(cli.code,mode==='working'?0:1,cli.output);
   const exported=join(dir,`export-${mode}`);
   await exportContract(contract,exported);
   const installed=await command('npm',['install','--no-audit','--no-fund'],exported);
   assert.equal(installed.code,0,installed.output);
   const result=await command('npm',['test'],exported,{STORYBOOK_URL:baseUrl});
   assert.equal(result.code,mode==='working'?0:1,result.output);
   // Read the actual generated test's report, rather than trusting only its exit status.
   const entries=await readdir(join(exported,'test-results'),{withFileTypes:true});
   const testDir=entries.find(e=>e.isDirectory());assert.ok(testDir,result.output);
   const exportedReport=JSON.parse(await readFile(join(exported,'test-results',testDir.name,'focus','report.json'),'utf8'));
   assert.equal(exportedReport.status,report.status);assert.equal(exportedReport.firstFailure,report.firstFailure);
  }
  const portalContext=await browser.newContext();
  const portal=await executeContract(await portalContext.newPage(),{version:1,storyId:'demo-popover--portal-only',initialFocus:'portal-only',steps:[{action:'click',target:'portal-only',expectFocus:'portal-only'}]},{baseUrl,outDir:join(dir,'portal-only')});
  assert.equal(portal.status,'passed',portal.error);await portalContext.close();
  const missingContext=await browser.newContext();
  const missing=await executeContract(await missingContext.newPage(),{version:1,storyId:'does-not-exist--missing',steps:[{action:'press',key:'Tab',expectFocus:'x'}]},{baseUrl,outDir:join(dir,'missing'),timeout:1000});
  assert.equal(missing.status,'failed');assert.equal(missing.firstFailure,0);await missingContext.close();
 }finally{await browser?.close();server.kill();await new Promise(r=>server.once('close',r));await rm(dir,{recursive:true,force:true})}
});
