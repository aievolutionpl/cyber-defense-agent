import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StateStore } from '../tools/scope.mjs';
import { reportBrief, reportCatalog, reportSources, createComparison, renameConversation } from '../tools/workbench.mjs';
import { checkCodexConnection, launchAgentSession } from '../tools/ui.mjs';
import { collect, renderVisual } from '../tools/visual.mjs';
import { compareReports } from '../tools/comparison.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cda-workbench-')); t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const before={format:'cda.report.v1',source:'local-review',createdAt:'2026-11-15T12:00:00Z',scope:{rootKey:'a'.repeat(64),files:['private-file.js']},findings:[{ruleId:'CDA-SECRET-001',path:'private-file.js',line:1,severity:'high',priority:'P1',title:'PRIVATE-TITLE',evidence:'PRIVATE-EVIDENCE',summary:'PRIVATE-SUMMARY'}],checks:[{ruleId:'CDA-SECRET-001',path:'private-file.js',result:'finding',digest:'b'.repeat(64)}]};
  const after=structuredClone(before);after.findings=[];after.checks[0].result='clear';
  const store=new StateStore(root);store.write('reports','before',before);store.write('reports','after',after);return{root,store,before,after};
}
test('share preview is bounded and excludes raw evidence, names and paths',t=>{
  const {root}=fixture(t);const brief=reportBrief(root,'before');const serialized=JSON.stringify(brief);
  assert.equal(brief.total,1);assert.equal(brief.counts.P1,1);assert.doesNotMatch(serialized,/PRIVATE|private-file/);
  assert.throws(()=>reportBrief(root,'../before'),/INVALID_REPORT_NAME/);
  assert.equal(reportCatalog(root).filter(r=>r.comparable).length,2);
});
test('source selection is tied to the displayed HTML and preview digest changes with facts',t=>{
  const {root,store,before}=fixture(t);
  store.write('reports','selected',renderVisual(collect([['before',before]])),'html');
  assert.deepEqual(reportSources(root,'selected.html').map(item=>item.name),['before']);
  assert.throws(()=>reportSources(root,'../selected.html'),/INVALID_REPORT_NAME/);
  const digest=reportBrief(root,'before').digest;before.findings=[];store.write('reports','before',before);
  assert.notEqual(reportBrief(root,'before').digest,digest);
});
test('comparison preserves conservative semantics and rejects unrelated assets',t=>{
  const {root,store,after}=fixture(t);const result=createComparison(root,{before:'before',after:'after'});
  assert.equal(result.noLongerObserved.length,1);assert.equal(result.confirmedFixed,0);
  assert.match(fs.readFileSync(store.file('reports',result.name.slice(0,-5),'html'),'utf8'),/default-src 'none'/);
  store.write('reports','other',{...after,scope:{...after.scope,rootKey:'c'.repeat(64)}});
  assert.throws(()=>createComparison(root,{before:'before',after:'other'}),/INCOMPATIBLE_REPORT/);
});
test('owner report escapes source text and separates decision page',t=>{
  const {before}=fixture(t);before.findings[0].title='<script>alert(1)</script>';
  const html=renderVisual(collect([['before',before]]),{lang:'pl'});
  assert.match(html,/DLA WŁAŚCICIELA/);assert.match(html,/break-after:page/);assert.doesNotMatch(html,/<script>/);
});
test('only a retest bound to both exact snapshots contributes historical confirmations',t=>{
  const {root,store,before,after}=fixture(t), comparison=compareReports(before,after);
  const retest={format:'cda.retest.v1',scope:{rootKey:before.scope.rootKey},createdAt:'2026-11-15T12:02:00Z',baselineDigest:'0'.repeat(64),currentDigest:comparison.currentDigest,results:[{ruleId:'CDA-SECRET-001',path:'private-file.js',status:'confirmed_fixed'}]};
  store.write('reports','retest',retest);
  assert.equal(createComparison(root,{before:'before',after:'after'}).confirmedFixed,0);
  retest.baselineDigest=comparison.baselineDigest;store.write('reports','retest',retest);
  const result=createComparison(root,{before:'before',after:'after'});
  assert.equal(result.confirmedFixed,1);assert.equal(result.noLongerObserved.length,0);
});
test('connection checks require consent and expose status, not CLI output',async()=>{
  const agent={installed:true,executablePath:'codex',version:'test'};
  await assert.rejects(checkCodexConnection(agent),/CONSENT_REQUIRED/);
  const result=await checkCodexConnection(agent,{consent:true,run:(cmd,args,options,cb)=>{assert.deepEqual(args,['login','status']);cb(null,'Logged in using ChatGPT\nPRIVATE','');}});
  assert.equal(result.authenticated,true);assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);
});
test('report transmission rejects missing sharing consent and stale preview before spawning',t=>{
  const {root}=fixture(t);let spawned=false;
  const options={rootDir:root,agentsMap:{codex:{installed:true,executablePath:'codex'}},spawnImpl:()=>{spawned=true;throw new Error('must not spawn');}};
  const payload={host:'codex',message:'Explain',consent:true,reportName:'before'};
  assert.throws(()=>launchAgentSession(payload,options),/REPORT_SHARING_CONSENT_REQUIRED/);
  assert.throws(()=>launchAgentSession({...payload,shareReport:true,reportDigest:'stale'},options),/REPORT_CHANGED/);
  assert.equal(spawned,false);
});
test('conversation renaming validates identifiers and refuses active sessions',t=>{
  const {root,store}=fixture(t), id='agent-codex-20261115120000-123456abcdef';
  store.write('sessions',id,{sessionId:id,chat:true,status:'running'});
  assert.throws(()=>renameConversation(root,{sessionId:id,title:'Example'}),/CHAT_BUSY/);
  store.write('sessions',id,{sessionId:id,chat:true,status:'completed'});renameConversation(root,{sessionId:id,title:'Aurora'});
  assert.equal(store.read('sessions',id).title,'Aurora');
});
