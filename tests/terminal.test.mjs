import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchAgentSession, getAgentSessions } from '../tools/ui.mjs';

test('Codex chat validates consent, preserves bounded context and reads fragmented JSON events', t => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cda-chat-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  let args, child, prompt;
  const options = { rootDir, agentsMap: { codex: { installed: true, name: 'Codex', executablePath: 'codex' } }, spawnImpl: (_, values) => {
    args = values; child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = new EventEmitter(); child.stdin.end = value => { prompt = value; }; child.kill = () => {}; return child;
  } };
  assert.throws(() => launchAgentSession({ host: 'codex', message: 'Hi' }, options), /CONSENT_REQUIRED/);
  assert.throws(() => launchAgentSession({ host: 'codex', message: ' ', consent: true }, options), /INVALID_MESSAGE/);
  assert.throws(() => launchAgentSession({ host: 'codex', message: 'Hi', consent: true, parentId: '../secret' }, options), /INVALID_SESSION/);
  const first = launchAgentSession({ host: 'codex', message: 'Explain scope', consent: true }, options);
  assert.deepEqual(args.slice(0, 6), ['exec', '--sandbox', 'read-only', '--json', '--color', 'never']);
  assert.equal(args.at(-1), '-');
  assert.match(prompt, /skills\/cyber-defense\/SKILL.md/);
  assert.match(prompt, /Canonical skill \(already loaded/);
  child.stdout.emit('data', JSON.stringify({type:'thread.started',thread_id:'12345678-1234-1234-1234-123456789abc'})+'\n');
  assert.throws(() => launchAgentSession({ host: 'codex', message: 'Concurrent', consent: true }, options), /CHAT_BUSY/);
  const event = JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Scope is explicit.' } }) + '\n';
  child.stdout.emit('data', event.slice(0, 30)); child.stdout.emit('data', event.slice(30)); child.emit('close', 0);
  assert.equal(getAgentSessions(rootDir)[0].answer, 'Scope is explicit.');
  const next = launchAgentSession({ host: 'codex', message: 'What next?', consent: true, parentId: first.session.sessionId }, options);
  assert.equal(next.session.conversation.length, 3);
  assert.ok(args.includes('resume'));
  assert.ok(args.includes('12345678-1234-1234-1234-123456789abc'));
  assert.match(prompt, /What next/);
  assert.doesNotMatch(prompt, /Scope is explicit/);
  child.emit('close', 0);
});

test('transient Windows rename lock retries the final session without crashing', async t => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cda-chat-lock-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
  child.stdin = new EventEmitter(); child.stdin.end = () => {};
  launchAgentSession({ host: 'codex', message: 'Hi', consent: true }, { rootDir, agentsMap: { codex: { installed: true, executablePath: 'codex' } }, spawnImpl: () => child });
  const rename = fs.renameSync; let failures = 2;
  const mock = t.mock.method(fs, 'renameSync', (...args) => { if (failures-- > 0) throw Object.assign(new Error('locked'), { code: 'EPERM' }); return rename(...args); });
  child.stdout.emit('data', JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Ready' } }) + '\n');
  child.emit('close', 0);
  await new Promise(resolve => setTimeout(resolve, 350));
  mock.mock.restore();
  const saved = getAgentSessions(rootDir)[0];
  assert.equal(saved.status, 'completed'); assert.equal(saved.answer, 'Ready');
});
