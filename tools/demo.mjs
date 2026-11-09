#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StateStore, ScopedReader, propose, approve } from './scope.mjs';
import { review, importScan, retest, render } from './engine.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const store = new StateStore(root);
const files = ['package.json', 'reports/before.sarif', 'reports/partial.json'];
const fixture = new ScopedReader(path.join(root, 'examples/demo-repo'), files);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cda-demo-'));
// This command only modifies its own newly created demonstration copy.
for (const file of files) {
  const target = path.join(scratch, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, fixture.read(file), { flag: 'wx' });
}
const scope = approve(propose(scratch, files), scratch, true);
store.write('scopes', 'demo', scope);
const save = (name, data) => { store.write('reports', name, data); store.write('reports', name, render(data), 'md'); return data; };
const before = save('demo-before', review(scope));
const imported = save('demo-import', importScan(scope, 'reports/before.sarif'));
const pkg = JSON.parse(new ScopedReader(scratch, files).read('package.json'));
pkg.dependencies.lodash = '4.17.21';
fs.writeFileSync(path.join(scratch, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
const after = save('demo-after', review(scope));
const result = save('demo-retest', retest(scope, imported, after));
const partial = save('demo-partial', importScan(scope, 'reports/partial.json'));
const incomplete = save('demo-no-data', retest(scope, before, partial));
let blocked;
try { new ScopedReader(scratch, files).read('../private/.env'); } catch (error) { blocked = error.code; }
if (result.results[0]?.status !== 'confirmed_fixed' || incomplete.results[0]?.status !== 'insufficient_data' || !blocked) throw new Error('DEMO_FAILED');
process.stdout.write(`DEMO zaliczone: import SARIF → dowód → poprawka kopii → retest.\nPotwierdzona poprawka: ${result.results[0].status}\nNiepełny raport: ${incomplete.results[0].status}\nPoza zakresem: ${blocked}\nRaporty: .cda/reports/demo-{before,import,after,retest,no-data}.md\nZakres demonstracyjny: ${scratch}\nNie wykonano kodu fixture ani połączeń sieciowych.\n`);
