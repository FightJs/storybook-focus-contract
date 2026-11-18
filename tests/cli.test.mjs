import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const cli=resolve('dist/cli.js');
test('CLI validates and exports a standalone package without overwriting existing files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'focus-cli-'));
 try {
 const file=join(dir,'contract.json'),out=join(dir,'nested','export');
 await writeFile(file,JSON.stringify({version:1,storyId:'demo--one',steps:[{action:'press',key:'Tab',expectFocus:'trigger'}]}));
 assert.match(execFileSync(process.execPath,[cli,'validate',file],{encoding:'utf8'}),/valid/i);
 execFileSync(process.execPath,[cli,'export',file,'--out',out]);
 const p=JSON.parse(await readFile(join(out,'package.json'),'utf8'));assert.equal(p.devDependencies['@playwright/test'],'1.65.1');
 assert.ok((await readFile(join(out,'focus.spec.ts'),'utf8')).includes('executeContract'));
 const before=await readFile(join(out,'focus.contract.json'),'utf8');
 assert.equal(spawnSync(process.execPath,[cli,'export',file,'--out',out]).status,1);
 assert.equal(await readFile(join(out,'focus.contract.json'),'utf8'),before);
 assert.equal(spawnSync(process.execPath,[cli,'run',file]).status,1);
 assert.equal(spawnSync(process.execPath,[cli,'validate',file,'--typo']).status,1);
 await writeFile(file,'{}');assert.equal(spawnSync(process.execPath,[cli,'validate',file]).status,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});
