import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startMiniUi, startGuidedAudit, buildAgentBridge } from '../tools/ui.mjs';

test('computer workflow defaults to offline inventory and shares only with separate consent', async t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cda-center-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const options={rootDir:root,awaitCompletion:true,stepRunner:async()=>''};
  const offline=await startGuidedAudit({workflow:'pc',consent:true},options);
  assert.equal(offline.status, 'completed');
  assert.deepEqual(offline.steps.map(step => step.id), ['inventory', 'report']);
  assert.ok(!offline.steps.flatMap(s=>s.args).includes('--share-package-names'));
  const planned = await startGuidedAudit({workflow:'pc', consent:true, planAdvisories:true}, options);
  assert.equal(planned.status, 'awaiting_approval');
  assert.equal(planned.pendingApproval.kind, 'package_names');
  assert.equal(planned.steps.find(step => step.id === 'advisories').status, 'pending');
  const online=await startGuidedAudit({workflow:'pc',consent:true,sharePackageNames:true},options);
  assert.equal(online.status, 'completed');
  assert.deepEqual(online.steps.map(step => step.id), ['inventory', 'advisories', 'report']);
  assert.throws(()=>startGuidedAudit({workflow:'pc',sharePackageNames:true},options),/CONSENT_REQUIRED/);
});

test('project API rejects empty scope before executing or saving any run',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cda-center-api-'));
  const ui=await startMiniUi({port:0,openBrowser:false,rootDir:root});
  t.after(()=>{ui.server.close();fs.rmSync(root,{recursive:true,force:true});});
  for(const files of [undefined,[],[''],[42]]){
    const res=await fetch(ui.url+'api/workflows/start',{method:'POST',headers:{'Content-Type':'application/json','x-cda-token':ui.token},body:JSON.stringify({workflow:'project',target:root,consent:true,files})});
    assert.equal(res.status,400);assert.equal((await res.json()).error,'EXACT_FILE_SCOPE_REQUIRED');
  }
  const page=await fetch(ui.url);
  assert.equal(page.status,200);
  assert.match(await page.text(), /<script[^>]+src="\/panel\.js"/);
  assert.equal(fs.existsSync(path.join(root,'.cda','runs')),false);
});

test('new missions preserve planning and evidence boundaries in both languages',()=>{
  for(const lang of ['pl','en'])for(const host of ['claude','codex','hermes']){
    for(const mission of ['changes','retest','ocr'])assert.equal(buildAgentBridge({host,mission,lang}).mission,mission);
    const ocr=buildAgentBridge({host,mission:'ocr',lang}).prompt;
    assert.match(ocr,/nie jest wdrożony|not implemented/);
    assert.match(ocr,/Nie instaluj|Do not install/);
    assert.match(buildAgentBridge({host,mission:'retest',lang}).prompt,/insufficient_data/);
  }
});
