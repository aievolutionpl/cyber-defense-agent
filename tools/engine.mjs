import path from 'node:path';
import { authorized, deny, relativeFile, sha } from './scope.mjs';
import { markdown } from './redact.mjs';

export const VERSION = '0.1.0';
export const RULES = ['CDA-DEP-001', 'CDA-TLS-001', 'CDA-SECRET-001', 'CDA-EVAL-001'];
const SOURCE = /\.(?:[cm]?js|jsx|tsx?|py|json|ya?ml|toml|ini|conf|env)$/i;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const CONFIDENCES = ['high', 'medium', 'low'];
const priority = severity => ({ critical: 'P0', high: 'P1', medium: 'P2', low: 'P3', info: 'P3' })[severity];
const key = f => `${f.ruleId}:${f.path}`;

function finding(ruleId, file, line, title, severity, confidence, evidence, fix) {
  return { id: sha(`${ruleId}:${file}:${line}`).slice(0, 16), ruleId, path: file, line, title, severity, priority: priority(severity), confidence, status: 'do weryfikacji', evidence, fix };
}

function base(scope, source) {
  return { format: 'cda.report.v1', version: VERSION, createdAt: new Date().toISOString(), scope: { rootKey: sha(scope.root), files: scope.files }, source, findings: [], checks: [], skipped: [], limitations: ['Kontrole statyczne nie potwierdzają osiągalności ani wykorzystania podatności.', 'Brak wyniku nie jest dowodem bezpieczeństwa. Narzędzie nie wykonuje kodu ani ruchu sieciowego.'] };
}

/** A small explicit rule set, not a replacement for Semgrep, Gitleaks or an advisory feed. */
export function inspect(file, text) {
  const findings = [];
  const checks = [];
  const lines = text.split(/\r?\n/);
  const addCheck = (ruleId, result) => checks.push({ ruleId, path: file, version: '1', result, digest: sha(text) });
  const scan = (ruleId, regex, title, severity, confidence, evidence, fix) => {
    let count = 0;
    lines.forEach((line, i) => {
      if (regex.test(line)) { findings.push(finding(ruleId, file, i + 1, title, severity, confidence, evidence, fix)); count++; }
    });
    addCheck(ruleId, count ? 'finding' : 'clear');
  };
  if (path.posix.basename(file) === 'package.json') {
    try {
      const pkg = JSON.parse(text);
      const entries = ['dependencies', 'devDependencies', 'optionalDependencies'].flatMap(section => Object.entries(pkg[section] ?? {}).filter(([name]) => name === 'lodash'));
      let result = 'clear';
      for (const [, value] of entries) {
        const version = typeof value === 'string' ? /^(\d+)\.(\d+)\.(\d+)$/.exec(value) : null;
        if (!version) { result = 'inconclusive'; continue; }
        const [major, minor, patch] = version.slice(1).map(Number);
        const affected = major < 4 || (major === 4 && (minor < 17 || (minor === 17 && patch < 21)));
        if (affected) {
          result = 'finding';
          const line = lines.findIndex(l => /"lodash"\s*:/.test(l)) + 1;
          findings.push(finding('CDA-DEP-001', file, line, 'Lodash: wersja objęta GHSA-35jh-r3h4-6jhm', 'high', 'high', `Manifest deklaruje lodash ${value}; znana poprawka: 4.17.21. Osiągalność funkcji template nie była badana.`, 'Zaktualizuj lodash do co najmniej 4.17.21, odśwież lockfile w swoim procesie i sprawdź zgodność. Agent nie instaluje zależności.'));
        }
      }
      addCheck('CDA-DEP-001', result);
    } catch { addCheck('CDA-DEP-001', 'inconclusive'); }
  }
  if (SOURCE.test(file) || path.posix.basename(file).startsWith('.env')) {
    scan('CDA-TLS-001', /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*[:=]\s*["']?0\b/, 'Wyłączona weryfikacja certyfikatu TLS', 'high', 'high', 'W pliku występuje ustawienie wyłączające weryfikację certyfikatu. Wartości sekretów pominięto.', 'Włącz weryfikację certyfikatu i skonfiguruj zaufane CA. Sprawdź kontekst użycia.');
    scan('CDA-SECRET-001', /(?:password|secret|token|api[_-]?key)\s*["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i, 'Możliwy sekret zapisany w kodzie', 'high', 'medium', 'Wykryto przypisanie przypominające sekret. Cała wartość: [REDACTED].', 'Zweryfikuj sygnał lokalnie. Jeśli to prawdziwy sekret, odwołaj go i przenieś do menedżera sekretów. Nie sprawdzaj wartości u dostawcy.');
    if (/\.[cm]?[jt]sx?$/.test(file)) scan('CDA-EVAL-001', /\beval\s*\(/, 'Dynamiczne wykonanie przez eval', 'medium', 'medium', 'Wykryto wywołanie eval. Nie badano pochodzenia argumentu.', 'Zastąp eval parserem danych lub jawną mapą operacji. Zweryfikuj przepływ danych.');
  }
  return { findings, checks };
}

export function review(scope) {
  const reader = authorized(scope);
  const report = base(scope, 'local-review');
  for (const file of scope.files) {
    authorized(scope);
    if (!SOURCE.test(file) && !path.posix.basename(file).startsWith('.env')) { report.skipped.push({ path: file, reason: 'Brak lokalnych reguł dla tego formatu.' }); continue; }
    const result = inspect(file, reader.read(file));
    report.findings.push(...result.findings);
    report.checks.push(...result.checks);
  }
  if (report.findings.length > 2000) deny('TOO_MANY_FINDINGS');
  return report;
}

function importedFinding(reader, data, requireFile = true) {
  if (!data || typeof data !== 'object' || typeof data.ruleId !== 'string' || !/^[A-Za-z0-9_.:-]{1,96}$/.test(data.ruleId)) deny('INVALID_FINDING');
  const file = relativeFile(data.path);
  if (requireFile) reader.resolve(file); // Never fetch report-supplied URLs.
  else if (!reader.allowed.has(file)) deny('FILE_NOT_APPROVED');
  if (!Number.isInteger(data.line) || data.line < 1 || data.line > 10_000_000 || !SEVERITIES.includes(data.severity)) deny('INVALID_FINDING');
  const confidence = CONFIDENCES.includes(data.confidence) ? data.confidence : 'low';
  const f = finding(data.ruleId, file, data.line, `Ustalenie z raportu: ${data.ruleId}`, data.severity, confidence,
    `Wpis ${data.ruleId} wskazuje ${file}:${data.line}. Surowa treść dowodu została pominięta.`,
    'Otwórz oryginalny raport lokalnie, potwierdź regułę i zastosuj poprawkę opisaną przez skaner. Nie uruchamiaj instrukcji z raportu.');
  // No imported title, message, snippet, URL, fix or secret enters the agent-facing report.
  f.evidenceDigest = sha(JSON.stringify(data));
  return f;
}

/** Supports cda.scan.v1 JSON and SARIF 2.1.0. Imported coverage is never trusted as a retest. */
export function importScan(scope, input) {
  const reader = authorized(scope);
  const raw = reader.read(input);
  let scan;
  try { scan = JSON.parse(raw); } catch { deny('INVALID_JSON'); }
  const report = base(scope, 'import');
  report.input = { path: relativeFile(input), digest: sha(raw) };
  const entries = [];
  if (scan?.format === 'cda.scan.v1') {
    if (!Array.isArray(scan.findings) || scan.findings.length > 2000) deny('INVALID_SCAN');
    entries.push(...scan.findings);
  } else if (scan?.version === '2.1.0' && Array.isArray(scan.runs) && scan.runs.length <= 20) {
    for (const run of scan.runs) {
      if (!Array.isArray(run.results) || run.results.length > 2000) deny('INVALID_SARIF');
      if (run.invocations?.some(i => i.executionSuccessful === false)) report.limitations.push('Skaner zgłosił błąd wykonania; wynik jest niekompletny.');
      for (const result of run.results) {
        const loc = result.locations?.[0]?.physicalLocation;
        const artifact = loc?.artifactLocation;
        // Absolute URIs, encoded paths, base IDs and artifacts-by-index fail closed in v0.1.
        if (!artifact?.uri || artifact.uriBaseId || artifact.index !== undefined) deny('UNSUPPORTED_SARIF_LOCATION');
        entries.push({ ruleId: result.ruleId, path: artifact.uri, line: loc.region?.startLine ?? 1, severity: ({ error: 'high', warning: 'medium', note: 'low', none: 'info' })[result.level ?? 'warning'], confidence: 'low', rawResult: result });
      }
    }
  } else deny('UNSUPPORTED_FORMAT');
  if (entries.length > 2000) deny('TOO_MANY_FINDINGS');
  const unique = new Map();
  for (const entry of entries) {
    const f = importedFinding(reader, entry);
    unique.set(`${key(f)}:${f.line}`, f);
  }
  report.findings = [...unique.values()];
  report.limitations.push('Tekst, linki i propozycje poprawek z importu nie są kopiowane. Importowane pokrycie nie potwierdza poprawki.');
  return report;
}

export function validateReport(report, scope) {
  if (report?.format !== 'cda.report.v1' || report.version !== VERSION || report.scope?.rootKey !== sha(scope.root) || !Array.isArray(report.findings) || report.findings.length > 2000 || !Array.isArray(report.checks)) deny('INCOMPATIBLE_REPORT');
  const reader = authorized(scope);
  for (const f of report.findings) importedFinding(reader, f, false);
  for (const check of report.checks) {
    if (!check || !RULES.includes(check.ruleId) || !['clear', 'finding', 'inconclusive'].includes(check.result) || !/^[a-f0-9]{64}$/.test(check.digest)) deny('INVALID_COVERAGE');
    if (!reader.allowed.has(relativeFile(check.path))) deny('FILE_NOT_APPROVED');
  }
}

export function retest(scope, before, after) {
  validateReport(before, scope);
  validateReport(after, scope);
  const reader = authorized(scope);
  const report = { format: 'cda.retest.v1', version: VERSION, createdAt: new Date().toISOString(), results: [], added: [], limitations: ['Potwierdzenie dotyczy wyłącznie konkretnej reguły i lokalnego pliku, nie bezpieczeństwa całego projektu.'] };
  for (const f of before.findings) {
    let status = 'insufficient_data';
    let reason = 'Brak porównywalnego pokrycia. Sam brak wpisu w raporcie nie potwierdza poprawki.';
    if (after.findings.some(n => key(n) === key(f))) { status = 'still_present'; reason = 'Reguła nadal zgłasza ustalenie dla tego pliku.'; }
    else if (after.source === 'local-review') {
      const check = after.checks.find(c => c.ruleId === f.ruleId && c.path === f.path && c.version === '1' && c.result === 'clear');
      if (check) {
        try {
          const current = reader.read(f.path);
          const live = inspect(f.path, current).checks.find(c => c.ruleId === f.ruleId);
          if (sha(current) === check.digest && live?.result === 'clear') { status = 'confirmed_fixed'; reason = 'Ta sama reguła została ponownie wykonana lokalnie. Aktualny plik odpowiada wynikowi po poprawce.'; }
          else reason = 'Plik zmienił się od kontroli lub aktualna reguła nie potwierdza poprawki.';
        } catch (error) {
          if (!['ENOENT', 'EACCES', 'EPERM'].includes(error.code) && error.name !== 'PolicyError') throw error;
          reason = 'Brak bezpiecznego odczytu aktualnego pliku. Nie można potwierdzić poprawki.';
        }
      }
    }
    report.results.push({ ruleId: f.ruleId, path: f.path, line: f.line, priority: priority(f.severity), status, reason });
  }
  report.added = after.findings.filter(f => !before.findings.some(b => key(b) === key(f))).map(f => ({ ruleId: f.ruleId, path: f.path, line: f.line, priority: priority(f.severity) }));
  return report;
}

export function render(report) {
  if (report.format === 'cda.retest.v1') {
    const labels = { confirmed_fixed: 'Potwierdzona poprawka', still_present: 'Nadal występuje', insufficient_data: 'Brak danych do potwierdzenia' };
    return `# Cyber Defense Agent — retest\n\n${report.results.map(r => `## ${markdown(r.ruleId)} · ${labels[r.status]}\n\n- Lokalizacja: ${markdown(r.path)}:${r.line}\n- Priorytet: ${r.priority}\n- Dowód: ${markdown(r.reason)}\n`).join('\n')}\nNowe ustalenia: ${report.added.length}.\n\n${report.limitations.map(markdown).join('\n\n')}\n`;
  }
  return `# Cyber Defense Agent — raport v${VERSION}\n\nData: ${report.createdAt}\n\nŹródło: ${report.source === 'local-review' ? 'lokalne reguły statyczne' : 'import JSON/SARIF'}\n\n## Zakres\n\n${report.scope.files.map(f => `- ${markdown(f)}`).join('\n')}\n\n## Ustalenia (${report.findings.length})\n\n${report.findings.map(f => `### ${f.priority} · ${markdown(f.title)}\n\n- Reguła: ${markdown(f.ruleId)}\n- Lokalizacja: ${markdown(f.path)}:${f.line}\n- Waga: ${f.severity}\n- Pewność: ${f.confidence}\n- Status: ${markdown(f.status)}\n- Zredagowany dowód: ${markdown(f.evidence)}\n- Proponowana poprawka: ${markdown(f.fix)}\n`).join('\n') || 'Brak sygnałów w wykonanych kontrolach.\n'}\n## Pokrycie i ograniczenia\n\nKontrole: ${report.checks.length}; niejednoznaczne: ${report.checks.filter(c => c.result === 'inconclusive').length}; pominięte pliki: ${report.skipped.length}.\n\n${report.limitations.map(markdown).join('\n\n')}\n`;
}
