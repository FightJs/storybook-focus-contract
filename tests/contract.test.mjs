import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContract, storyUrl } from '../dist/contract.js';
const good = () => ({version:1,storyId:'demo-popover--working',initialFocus:'trigger',steps:[{action:'click',target:'trigger',expectFocus:'close'},{action:'press',key:'Escape',expectFocus:'trigger'}]});
test('accepts the limited keyboard and wait vocabulary', () => {
  const c=good();
  for(const key of ['Tab','Shift+Tab','Enter','Escape']) c.steps.push({action:'press',key,expectFocus:'trigger'});
  c.steps.push({action:'wait',target:'panel',state:'hidden'});
  assert.deepEqual(validateContract(c),c);
});
test('rejects malformed and ambiguous contracts', () => {
  for(const change of [c=>c.version=2,c=>c.storyId='../x',c=>c.unknown=true,c=>c.steps=[],c=>c.steps=Array(21).fill(c.steps[0]),c=>c.steps[0].expectFocus='',c=>c.steps[0].extra=true,c=>c.steps[1].key='Space',c=>c.steps[0].target=null,c=>c.initialFocus=3,c=>c.steps[0]={action:'wait',target:'x',state:'gone'},c=>c.steps[0]={action:'press',key:'Tab'}]) {
    const c=good();change(c);assert.throws(()=>validateContract(c));
  }
  for(const value of [null,[],true,'{}']) assert.throws(()=>validateContract(value));
});
test('builds standalone URLs including deployed subpaths and rejects unsafe protocols', () => {
  assert.equal(storyUrl('http://localhost:6006/','demo--one'),'http://localhost:6006/iframe.html?id=demo--one&viewMode=story');
  assert.equal(storyUrl('https://example.com/demo','demo--one'),'https://example.com/demo/iframe.html?id=demo--one&viewMode=story');
  assert.throws(()=>storyUrl('file:///tmp/index.html','demo--one'));
  assert.throws(()=>storyUrl('https://u:p@example.com','demo--one'));
});
