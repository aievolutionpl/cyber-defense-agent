import fs from 'node:fs';
import assert from 'node:assert/strict';
const canonical = 'skills/cyber-defense/SKILL.md';
assert.ok(fs.readFileSync(canonical, 'utf8').includes('single source'));
for (const base of ['.agents', '.claude']) {
  const entry = fs.readFileSync(`${base}/skills/cyber-defense/SKILL.md`, 'utf8');
  assert.ok(entry.includes('name: cyber-defense'));
  assert.ok(entry.includes(canonical));
  assert.ok(entry.length < 900, 'Entry point must stay thin');
}
console.log('Codex + Claude Code entry points reference the same canonical skill.');
