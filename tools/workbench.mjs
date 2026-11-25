import { StateStore, ScopedReader } from './scope.mjs';
import path from 'node:path';
import { collect, renderVisual } from './visual.mjs';
import { compareReports, validateSnapshot } from './comparison.mjs';
import crypto from 'node:crypto';

const validName = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
const RULE_GUIDANCE = {
  'CDA-DEP-001': 'A dependency version matches a known vulnerable range. Review whether the affected functionality is used, update to a fixed version and retest.',
  'CDA-TLS-001': 'Certificate verification appears disabled. Restore verification and test the connection without bypasses.',
  'CDA-SECRET-001': 'A possible embedded credential was detected. Verify without sharing its value; revoke and rotate a real exposed credential.',
  'CDA-EVAL-001': 'Dynamic code execution needs review. Determine whether untrusted input reaches it and prefer constrained parsing.',
  'CDA-AGENT-001': 'An agent configuration signal requires review of permissions and instruction boundaries.',
  'CDA-AGENT-002': 'An agent configuration signal requires review of permissions and instruction boundaries.',
  'CDA-PUBLIC-001': 'A service may be exposed beyond localhost. Verify the intended audience and access controls.',
  'CDA-XSS-001': 'Potential HTML injection needs review. Trace untrusted data to the output and use appropriate escaping or sanitization.',
};
export function reportSources(rootDir, htmlName) {
  if (typeof htmlName !== 'string' || !/^[A-Za-z0-9_-]{1,64}\.html$/.test(htmlName)) throw new Error('INVALID_REPORT_NAME');
  const file = new StateStore(rootDir).file('reports', htmlName.slice(0,-5), 'html');
  const html = new ScopedReader(path.dirname(file), [path.basename(file)]).read(path.basename(file));
  const manifest = html.match(/<meta name="cda-report-sources" content="([A-Za-z0-9_,-]*)">/);
  const names = manifest ? new Set(manifest[1].split(',').filter(Boolean)) : new Set([...html.matchAll(/<td class="mono">([A-Za-z0-9_-]{1,64})<\/td>/g)].map(match=>match[1]));
  return reportCatalog(rootDir, [...names].filter(validName));
}
export function reportCatalog(rootDir, names) {
  const store = new StateStore(rootDir);
  return (names || store.list('reports')).flatMap(name => {
    try { const report = store.read('reports', name); const data = collect([[name, report]]);
      if (!data.sources.length) return [];
      let comparable = false; try { validateSnapshot(report); comparable = true; } catch { /* other report kind */ }
      return [{ name, format: report.format, comparable, createdAt: report.createdAt || report.observedAt || '', counts: data.counts }];
    } catch { return []; }
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

/** Local preview excludes evidence, filenames, package names, commands and imported prose. */
export function reportBrief(rootDir, name) {
  if (!validName(name)) throw new Error('INVALID_REPORT_NAME');
  const data = collect([[name, new StateStore(rootDir).read('reports', name)]]);
  if (!data.sources.length) throw new Error('NO_SUPPORTED_REPORTS');
  const brief = { format: 'cda.chat-brief.v1', trust: 'untrusted-observations', verdict: data.verdict,
    counts: data.counts, total: data.total, checked: data.stats.checked, notChecked: data.stats.notChecked,
    coverageIncomplete: Boolean(data.incomplete.length),
    findings: data.findings.slice(0, 30).map((finding,index) => {
      const rule=Object.keys(RULE_GUIDANCE).find(key=>finding.ref?.includes(`:${key}:`));
      return { ref: `finding_${index+1}`, priority: finding.priority, area: finding.area, basis: finding.basis === 'tool evidence' ? 'tool evidence' : 'model judgment', ...(rule ? {rule, guidance:RULE_GUIDANCE[rule]} : {}) };
    }),
    omitted: Math.max(0,data.total-30),
    limitations: ['No raw evidence is shared. Use the local report for precise details.', 'Missing findings are not proof of safety.'] };
  return {...brief, digest:crypto.createHash('sha256').update(JSON.stringify(brief)).digest('hex')};
}

export function createComparison(rootDir, { before, after, lang = 'pl' } = {}) {
  if (!validName(before) || !validName(after) || before === after) throw new Error('INVALID_COMPARISON');
  const store = new StateStore(rootDir);
  const result = compareReports(store.read('reports', before), store.read('reports', after));
  const confirmations = [];
  for (const candidate of store.list('reports').slice(-250)) {
    try {
      const retest = store.read('reports', candidate);
      if (retest.format !== 'cda.retest.v1' || retest.baselineDigest !== result.baselineDigest || retest.currentDigest !== result.currentDigest || retest.scope?.rootKey !== result.scope.rootKey || !Array.isArray(retest.results)) continue;
      for (const finding of result.noLongerObserved) {
        if (retest.results.some(item=>item.status === 'confirmed_fixed' && item.ruleId === finding.ruleId && item.path === finding.path) && !confirmations.some(item=>item.fingerprint === finding.fingerprint)) confirmations.push({...finding, source:candidate, verifiedAt:retest.createdAt});
      }
    } catch { /* Unsupported or unreadable evidence cannot confirm a fix. */ }
  }
  const unverified = result.noLongerObserved.filter(item=>!confirmations.some(finding=>finding.fingerprint === item.fingerprint));
  const pl = lang !== 'en';
  const name = `comparison-${crypto.randomBytes(8).toString('hex')}`;
  const data = collect([[after, store.read('reports', after)]]);
  const labels = pl ? ['Nowe ustalenia', 'Nadal obecne', 'Nieobserwowane — wymagają weryfikacji', 'Potwierdzone w zapisanym reteście'] : ['New findings', 'Still present', 'No longer observed — verification required', 'Confirmed in the saved retest'];
  const groups = [result.added, result.existing, unverified, confirmations];
  data.verified = confirmations.map(item=>({label:`${item.ruleId} · ${item.path}`,status:'confirmed_fixed',source:item.source,at:Date.parse(item.verifiedAt)}));
  data.limitations.push(pl ? 'Potwierdzenia dotyczą wyłącznie czasu i zakresu zapisanego retestu.' : 'Confirmations apply only to the time and scope of the saved retest.');
  data.limitations = [...result.limitations, ...data.limitations];
  // Comparison sections carry their own counts; suppress a misleading open-findings verdict.
  data.verdict = 'incomplete'; data.incomplete = [pl ? 'Porównanie historyczne, bez nowego retestu' : 'Historical comparison, no fresh retest'];
  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const changes = `<section><h2>${pl ? 'Zmiany między wynikami' : 'Changes between results'}</h2>${groups.map((items,i)=>`<div class="card"><h3>${escape(labels[i])} · ${items.length}</h3><ul>${items.map(item=>`<li>${escape(item.priority)} · ${escape(item.ruleId)} · ${escape(item.path)}:${item.line}</li>`).join('')}</ul></div>`).join('')}</section>`;
  store.write('reports', name, result);
  store.write('reports', name, renderVisual(data, { lang, mode:'comparison', title: pl ? 'Zakres i ograniczenia porównania' : 'Comparison scope and limitations' }).replace('</header>', '</header>' + changes), 'html');
  return { ok: true, name: name + '.html', before, after, added: result.added, existing: result.existing, noLongerObserved: unverified, coverage: result.coverage, confirmedFixed: confirmations.length, confirmations };
}

export function renameConversation(rootDir, { sessionId, title }) {
  if (typeof sessionId !== 'string' || !/^agent-codex-[0-9]{14}-[a-f0-9]{12}$/.test(sessionId) || typeof title !== 'string' || !title.trim() || title.length > 80) throw new Error('INVALID_SESSION');
  const store = new StateStore(rootDir); const session = store.read('sessions', sessionId);
  if (!session.chat || session.status === 'running') throw new Error('CHAT_BUSY');
  session.title = title.trim(); store.write('sessions', sessionId, session);
  return { ok: true };
}
