import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { COMMANDS } from './cda.mjs';

const canonical = 'skills/cyber-defense/SKILL.md';
const skill = fs.readFileSync(canonical, 'utf8');
assert.ok(skill.includes('single source'));
for (const marker of ['consent ladder', 'Hard lines', 'Hand-off gate', 'inventory --name', '--share-package-names', '--authorized', '--proposal <digest>', '--dry-run', '--send-summary', 'cda.mjs report --name', 'cda.mjs finding --name', 'dashboard.html']) assert.ok(skill.includes(marker), `Canonical skill must keep: ${marker}`);
assert.ok(skill.split('\n').length <= 220, 'Canonical skill should stay compact; move detail into references/');

const docs = ['skills/cyber-defense/SKILL.md', ...fs.readdirSync('skills/cyber-defense/references', { recursive: true }).filter(f => String(f).endsWith('.md')).map(f => path.posix.join('skills/cyber-defense/references', String(f).replaceAll('\\', '/')))];
const slug = (heading) => heading.trim().toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
const anchors = (file) => new Set([...fs.readFileSync(file, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map(([, h]) => slug(h)));

let commandSpans = 0;
for (const doc of docs) {
  const text = fs.readFileSync(doc, 'utf8');
  // Every relative Markdown link (and its #anchor, when given) must resolve.
  for (const [, link, anchor] of text.matchAll(/\]\((\.{0,2}\/?[^)#\s]+\.md)(?:#([^)\s]+))?\)/g)) {
    if (/^https?:/.test(link)) continue;
    const target = path.posix.join(path.posix.dirname(doc), link);
    assert.ok(fs.existsSync(target), `${doc}: broken link ${link}`);
    if (anchor) assert.ok(anchors(target).has(anchor), `${doc}: missing anchor ${link}#${anchor}`);
  }
  // Every documented CLI invocation must use a real command and only flags that command accepts.
  for (const [, span] of text.matchAll(/`([^`\n]+)`/g)) {
    const words = span.replace(/^node tools\/cda\.mjs\s+/, '').split(/\s+/);
    if (!Object.hasOwn(COMMANDS, words[0]) || !words.slice(1).some(w => w.startsWith('--'))) continue;
    commandSpans += 1;
    for (const flag of words.slice(1).filter(w => /^--[a-z]/.test(w)).map(w => w.slice(2).replace(/[^a-z-].*$/, ''))) {
      assert.ok(COMMANDS[words[0]].includes(flag), `${doc}: \`${span}\` uses --${flag}, which ${words[0]} does not accept`);
    }
  }
}

// Every refusal code the CLI can print must be explained to the agent.
const errors = fs.readFileSync('skills/cyber-defense/references/cli-errors.md', 'utf8');
const codes = new Set();
for (const file of fs.readdirSync('tools').filter(f => f.endsWith('.mjs'))) {
  for (const [, code] of fs.readFileSync(path.join('tools', file), 'utf8').matchAll(/(?:deny|fail|ProviderError)\(\s*['"]([A-Z][A-Z_]{3,})['"]/g)) codes.add(code);
}
for (const code of codes) assert.ok(errors.includes(`\`${code}\``), `cli-errors.md must explain ${code}`);

const playbooks = ['triage-and-severity', 'software-vulnerabilities', 'endpoint-hardening', 'web-application', 'code-review', 'agent-security', 'supply-chain-and-ci', 'containers-and-cloud', 'databases', 'network', 'incident-first-response', 'sources'];
for (const name of playbooks) assert.ok(fs.statSync(`skills/cyber-defense/references/knowledge/${name}.md`).size > 2000, `Missing playbook: ${name}`);
for (const name of playbooks) assert.ok(skill.includes(`knowledge/${name}.md`), `Canonical skill must route to playbook: ${name}`);

for (const base of ['.agents', '.claude', '.hermes']) {
  const entry = fs.readFileSync(`${base}/skills/cyber-defense/SKILL.md`, 'utf8');
  assert.ok(entry.includes('name: cyber-defense'));
  assert.ok(entry.includes(canonical));
  assert.ok(entry.length < 900, 'Entry point must stay thin');
}
for (const base of ['.agents', '.claude']) {
  assert.ok(fs.readFileSync(`${base}/skills/agent-build-scroll/SKILL.md`, 'utf8').includes('skills/agent-build-scroll/SKILL.md'));
}
console.log(`${docs.length} skill documents with resolving links and anchors, ${commandSpans} documented CLI invocations matching the CLI, ${codes.size} refusal codes explained, ${playbooks.length} knowledge documents. ` + 'Codex + Claude Code + experimental Hermes reference the canonical defense skill. Motion entry points share one source.');
