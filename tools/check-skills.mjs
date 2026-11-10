import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const canonical = 'skills/cyber-defense/SKILL.md';
assert.ok(fs.readFileSync(canonical, 'utf8').includes('single source'));
const skill = fs.readFileSync(canonical, 'utf8');
for (const marker of ['consent ladder', 'Hard lines', 'inventory --name', '--share-package-names', '--authorized', 'cda.mjs report --name', 'cda.mjs finding --name', 'dashboard.html']) assert.ok(skill.includes(marker), `Canonical skill must keep: ${marker}`);
// Every relative Markdown link in the skill and its references must resolve.
const docs = ['skills/cyber-defense/SKILL.md', ...fs.readdirSync('skills/cyber-defense/references', { recursive: true }).filter(f => String(f).endsWith('.md')).map(f => path.posix.join('skills/cyber-defense/references', String(f).replaceAll('\\', '/')))];
for (const doc of docs) for (const [, link] of fs.readFileSync(doc, 'utf8').matchAll(/\]\((\.{0,2}\/?[^)#\s]+\.md)\)/g)) {
  if (/^https?:/.test(link)) continue;
  assert.ok(fs.existsSync(path.posix.join(path.posix.dirname(doc), link)), `${doc}: broken link ${link}`);
}
for (const name of ['triage-and-severity', 'software-vulnerabilities', 'endpoint-hardening', 'web-application', 'code-review', 'databases', 'network', 'incident-first-response', 'sources']) assert.ok(fs.statSync(`skills/cyber-defense/references/knowledge/${name}.md`).size > 2000, `Missing playbook: ${name}`);
for (const base of ['.agents', '.claude', '.hermes']) {
  const entry = fs.readFileSync(`${base}/skills/cyber-defense/SKILL.md`, 'utf8');
  assert.ok(entry.includes('name: cyber-defense'));
  assert.ok(entry.includes(canonical));
  assert.ok(entry.length < 900, 'Entry point must stay thin');
}
for (const base of ['.agents', '.claude']) {
  assert.ok(fs.readFileSync(`${base}/skills/agent-build-scroll/SKILL.md`, 'utf8').includes('skills/agent-build-scroll/SKILL.md'));
}
console.log(`${docs.length} skill documents with resolving links and nine playbooks. `+'Codex + Claude Code + experimental Hermes reference the canonical defense skill. Motion entry points share one source.');
