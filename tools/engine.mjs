import path from "node:path";
import { authorized, deny, relativeFile, sha } from "./scope.mjs";
import { markdown } from "./redact.mjs";
import { adaptScanner, SCANNER_FORMATS } from "./scanner-adapters.mjs";

export const VERSION = "0.1.0";
export const RULES = [
  "CDA-DEP-001",
  "CDA-TLS-001",
  "CDA-SECRET-001",
  "CDA-EVAL-001",
  "CDA-AGENT-001",
  "CDA-AGENT-002",
  "CDA-PUBLIC-001",
  "CDA-XSS-001",
];
const SOURCE = /\.(?:[cm]?js|jsx|tsx?|py|json|ya?ml|toml|ini|conf|env|md|mdc)$/i;
const AGENT_CONFIG =
  /(?:^|\/)(?:AGENTS\.md|CLAUDE\.md|SKILL\.md|\.cursorrules|\.mcp\.json|claude_desktop_config\.json)$/i;
const BIDI_OR_ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;
const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const CONFIDENCES = ["high", "medium", "low"];
const priority = (severity) =>
  ({ critical: "P0", high: "P1", medium: "P2", low: "P3", info: "P3" })[
    severity
  ];
const key = (f) => `${f.ruleId}:${f.path}`;

function finding(
  ruleId,
  file,
  line,
  title,
  severity,
  confidence,
  evidence,
  fix,
) {
  return {
    id: sha(`${ruleId}:${file}:${line}`).slice(0, 16),
    ruleId,
    path: file,
    line,
    title,
    severity,
    priority: priority(severity),
    confidence,
    status: "needs review",
    evidence,
    fix,
  };
}

function base(scope, source) {
  return {
    format: "cda.report.v1",
    version: VERSION,
    createdAt: new Date().toISOString(),
    scope: { rootKey: sha(scope.root), files: scope.files },
    source,
    findings: [],
    checks: [],
    skipped: [],
    limitations: [
      "Static checks do not establish reachability or exploitability.",
      "An absent finding is not evidence of security. The tool executes no target code or network traffic.",
    ],
  };
}

/** A small explicit rule set, not a replacement for Semgrep, Gitleaks or an advisory feed. */
export function inspect(file, text) {
  const findings = [];
  const checks = [];
  const lines = text.split(/\r?\n/);
  const addCheck = (ruleId, result) =>
    checks.push({
      ruleId,
      path: file,
      version: "1",
      result,
      digest: sha(text),
    });
  const scan = (ruleId, regex, title, severity, confidence, evidence, fix) => {
    let count = 0;
    const occurrences = new Map();
    lines.forEach((line, i) => {
      if (regex.test(line)) {
        const digest = sha(line.trim());
        const occurrence = (occurrences.get(digest) ?? 0) + 1;
        occurrences.set(digest, occurrence);
        const entry = finding(
            ruleId,
            file,
            i + 1,
            title,
            severity,
            confidence,
            evidence,
            fix,
          );
        entry.fingerprint = sha(JSON.stringify([ruleId, file, digest, occurrence]));
        findings.push(entry);
        count++;
      }
    });
    addCheck(ruleId, count ? "finding" : "clear");
  };
  if (path.posix.basename(file) === "package.json") {
    try {
      const pkg = JSON.parse(text);
      const entries = [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
      ].flatMap((section) =>
        Object.entries(pkg[section] ?? {}).filter(
          ([name]) => name === "lodash",
        ),
      );
      let result = "clear";
      for (const [, value] of entries) {
        const version =
          typeof value === "string"
            ? /^(\d+)\.(\d+)\.(\d+)$/.exec(value)
            : null;
        if (!version) {
          result = "inconclusive";
          continue;
        }
        const [major, minor, patch] = version.slice(1).map(Number);
        const affected =
          major < 4 ||
          (major === 4 && (minor < 17 || (minor === 17 && patch < 21)));
        if (affected) {
          result = "finding";
          const line = lines.findIndex((l) => /"lodash"\s*:/.test(l)) + 1;
          findings.push(
            finding(
              "CDA-DEP-001",
              file,
              line,
              "Lodash version affected by GHSA-35jh-r3h4-6jhm",
              "high",
              "high",
              `Manifest declares lodash ${value}; known fix: 4.17.21. Reachability of the template function was not assessed.`,
              "Update lodash to at least 4.17.21, refresh the lockfile in your workflow and check compatibility. The agent does not install dependencies.",
            ),
          );
        }
      }
      addCheck("CDA-DEP-001", result);
    } catch {
      addCheck("CDA-DEP-001", "inconclusive");
    }
  }
  if (SOURCE.test(file) || path.posix.basename(file).startsWith(".env")) {
    scan(
      "CDA-TLS-001",
      /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*[:=]\s*["']?0\b/,
      "TLS certificate verification disabled",
      "high",
      "high",
      "The file contains a setting that disables certificate verification. Secret values are omitted.",
      "Enable certificate verification and configure trusted CAs. Review the usage context.",
    );
    scan(
      "CDA-SECRET-001",
      /(?:password|secret|token|api[_-]?key)\s*["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i,
      "Possible hard-coded secret",
      "high",
      "medium",
      "A secret-like assignment was detected. Entire value: [REDACTED].",
      "Validate locally. If this is a real secret, revoke it and move it to a secret manager. Do not validate the value with a provider.",
    );
    if (/\.[cm]?[jt]sx?$/.test(file)) {
      scan(
        "CDA-EVAL-001",
        /\beval\s*\(/,
        "Dynamic execution through eval",
        "medium",
        "medium",
        "An eval call was detected. The source of its argument was not assessed.",
        "Replace eval with a data parser or an explicit operation map. Verify the data flow.",
      );
      scan(
        "CDA-XSS-001",
        /\bdangerouslySetInnerHTML\b/,
        "Unverified HTML injection sink (dangerouslySetInnerHTML)",
        "medium",
        "medium",
        "A dangerouslySetInnerHTML sink was detected. Input sanitization was not assessed.",
        "Ensure content is strictly static or sanitized before rendering, or replace with structured DOM elements.",
      );
    }
    if (
      path.posix.basename(file).startsWith(".env") ||
      /\.(?:[cm]?[jt]sx?|json|ya?ml)$/i.test(file)
    ) {
      scan(
        "CDA-PUBLIC-001",
        /\b(?:NEXT_PUBLIC|VITE|REACT_APP)_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|TOKEN)[A-Z0-9_]*\s*[:=]/i,
        "Client-exposed secret environment variable prefix",
        "critical",
        "high",
        "A public client-bundle prefix is assigned to a secret/service-role identifier. Value: [REDACTED].",
        "Move private keys and service-role credentials to server-only environment variables and rotate any exposed key.",
      );
    }
    if (AGENT_CONFIG.test(file)) {
      scan(
        "CDA-AGENT-001",
        BIDI_OR_ZERO_WIDTH,
        "Hidden bidirectional or zero-width Unicode control in agent config",
        "high",
        "high",
        "Invisible Unicode control characters were detected in an agent instruction or MCP configuration file.",
        "Strip zero-width and bidirectional control characters and inspect the raw file bytes for hidden prompt-injection text.",
      );
      const beforeCount = findings.length;
      scan(
        "CDA-AGENT-002",
        /--dangerously-skip-permissions\b|"autoApprove"\s*:\s*\[[^\]]*["'](?:\*|bash|sh|powershell|cmd)["']/i,
        "Unrestricted agent shell or permission bypass flag",
        "high",
        "high",
        "An unrestricted execution or auto-approve setting was found in agent configuration.",
        "Remove global permission bypasses and restrict auto-approved tools to explicit read-only operations.",
      );
      if (
        findings.length === beforeCount &&
        /"autoApprove"\s*:\s*\[[\s\S]{0,400}?["'](?:\*|bash|sh|powershell|cmd)["']/i.test(text)
      ) {
        const lineIdx = lines.findIndex((l) => /"autoApprove"\s*:/.test(l));
        const lineNum = lineIdx >= 0 ? lineIdx + 1 : 1;
        const entry = finding(
          "CDA-AGENT-002",
          file,
          lineNum,
          "Unrestricted agent shell or permission bypass flag",
          "high",
          "high",
          "An unrestricted execution or auto-approve setting was found in agent configuration.",
          "Remove global permission bypasses and restrict auto-approved tools to explicit read-only operations.",
        );
        entry.fingerprint = sha(JSON.stringify(["CDA-AGENT-002", file, sha((lines[lineNum - 1] ?? "").trim()), 1]));
        findings.push(entry);
        const chk = checks.findLast((c) => c.ruleId === "CDA-AGENT-002");
        if (chk) chk.result = "finding";
      }
    }
  }
  return { findings, checks };
}

export function review(scope) {
  const reader = authorized(scope);
  const report = base(scope, "local-review");
  for (const file of scope.files) {
    authorized(scope);
    if (!SOURCE.test(file) && !path.posix.basename(file).startsWith(".env")) {
      report.skipped.push({
        path: file,
        reason: "No local rules for this format.",
      });
      continue;
    }
    const result = inspect(file, reader.read(file));
    report.findings.push(...result.findings);
    report.checks.push(...result.checks);
  }
  if (report.findings.length > 2000) deny("TOO_MANY_FINDINGS");
  return report;
}

function importedFinding(reader, data, requireFile = true) {
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.ruleId !== "string" ||
    !/^[A-Za-z0-9_.:-]{1,96}$/.test(data.ruleId)
  )
    deny("INVALID_FINDING");
  const file = relativeFile(data.path);
  if (requireFile)
    reader.resolve(file); // Never fetch report-supplied URLs.
  else if (!reader.allowed.has(file)) deny("FILE_NOT_APPROVED");
  if (
    !Number.isInteger(data.line) ||
    data.line < 1 ||
    data.line > 10_000_000 ||
    !SEVERITIES.includes(data.severity)
  )
    deny("INVALID_FINDING");
  const confidence = CONFIDENCES.includes(data.confidence)
    ? data.confidence
    : "low";
  const f = finding(
    data.ruleId,
    file,
    data.line,
    `Imported finding: ${data.ruleId}`,
    data.severity,
    confidence,
    `Entry ${data.ruleId} references ${file}:${data.line}. Raw evidence text was omitted.`,
    "Open the original report locally, validate the rule and review its suggested fix. Do not execute instructions from the report.",
  );
  // No imported title, message, snippet, URL, fix or secret enters the agent-facing report.
  f.evidenceDigest = sha(JSON.stringify(data));
  if (data.fingerprint !== undefined) {
    if (!/^[a-f0-9]{64}$/.test(data.fingerprint)) deny("INVALID_FINDING");
    f.fingerprint = data.fingerprint;
  }
  if (data.severityKnown === false) f.severityKnown = false;
  return f;
}

/** Supports cda.scan.v1 JSON and SARIF 2.1.0. Imported coverage is never trusted as a retest. */
export function importScan(scope, input, { format = "auto" } = {}) {
  if (!["auto", ...SCANNER_FORMATS].includes(format)) deny("UNSUPPORTED_FORMAT");
  const reader = authorized(scope);
  const raw = reader.read(input);
  let scan;
  try {
    scan = JSON.parse(raw);
  } catch {
    deny("INVALID_JSON");
  }
  const report = base(scope, "import");
  report.input = { path: relativeFile(input), digest: sha(raw) };
  const entries = [];
  if (SCANNER_FORMATS.includes(format)) {
    const adapted = adaptScanner(scan, format, scope.root);
    entries.push(...adapted.entries);
    report.scanner = adapted.scanner;
    report.incomplete = adapted.incomplete;
    report.limitations.push(...adapted.limitations);
  } else if (scan?.format === "cda.scan.v1") {
    if (!Array.isArray(scan.findings) || scan.findings.length > 2000)
      deny("INVALID_SCAN");
    entries.push(...scan.findings);
  } else if (
    scan?.version === "2.1.0" &&
    Array.isArray(scan.runs) &&
    scan.runs.length <= 20
  ) {
    for (const run of scan.runs) {
      if (!Array.isArray(run.results) || run.results.length > 2000)
        deny("INVALID_SARIF");
      if (run.invocations?.some((i) => i.executionSuccessful === false)) {
        report.incomplete = true;
        report.limitations.push(
          "The scanner reported an execution error; results are incomplete.",
        );
      }
      for (const result of run.results) {
        const loc = result.locations?.[0]?.physicalLocation;
        const artifact = loc?.artifactLocation;
        // Absolute URIs, encoded paths, base IDs and artifacts-by-index fail closed in v0.1.
        if (
          !artifact?.uri ||
          artifact.uriBaseId ||
          artifact.index !== undefined
        )
          deny("UNSUPPORTED_SARIF_LOCATION");
        entries.push({
          ruleId: result.ruleId,
          path: artifact.uri,
          line: loc.region?.startLine ?? 1,
          severity: {
            error: "high",
            warning: "medium",
            note: "low",
            none: "info",
          }[result.level ?? "warning"],
          confidence: "low",
          rawResult: result,
        });
      }
    }
  } else deny("UNSUPPORTED_FORMAT");
  if (entries.length > 2000) deny("TOO_MANY_FINDINGS");
  const unique = new Map();
  for (const entry of entries) {
    // Only our adapter generates identities. Generic input cannot choose a fingerprint that
    // collapses unrelated locations or impersonates another report's finding.
    const f = importedFinding(reader, report.scanner ? entry : { ...entry, fingerprint: undefined });
    const identity = f.fingerprint ?? `${key(f)}:${f.line}`;
    const prior = unique.get(identity);
    if (!prior || SEVERITIES.indexOf(f.severity) < SEVERITIES.indexOf(prior.severity)) unique.set(identity, f);
  }
  report.findings = [...unique.values()];
  report.limitations.push(
    "Imported text, links and suggested fixes are not copied. Imported coverage cannot confirm a fix.",
  );
  return report;
}

export function validateReport(report, scope) {
  if (
    report?.format !== "cda.report.v1" ||
    report.version !== VERSION ||
    report.scope?.rootKey !== sha(scope.root) ||
    !Array.isArray(report.findings) ||
    report.findings.length > 2000 ||
    !Array.isArray(report.checks)
  )
    deny("INCOMPATIBLE_REPORT");
  const reader = authorized(scope);
  for (const f of report.findings) importedFinding(reader, f, false);
  for (const check of report.checks) {
    if (
      !check ||
      !RULES.includes(check.ruleId) ||
      !["clear", "finding", "inconclusive"].includes(check.result) ||
      !/^[a-f0-9]{64}$/.test(check.digest)
    )
      deny("INVALID_COVERAGE");
    if (!reader.allowed.has(relativeFile(check.path)))
      deny("FILE_NOT_APPROVED");
  }
}

export function retest(scope, before, after) {
  validateReport(before, scope);
  validateReport(after, scope);
  const reader = authorized(scope);
  const report = {
    format: "cda.retest.v1",
    version: VERSION,
    createdAt: new Date().toISOString(),
    scope: { rootKey: sha(scope.root) },
    results: [],
    added: [],
    limitations: [
      "Confirmation applies only to this local rule and file, not the security of the whole project.",
    ],
  };
  for (const f of before.findings) {
    let status = "insufficient_data";
    let reason =
      "No comparable coverage. An absent report entry alone cannot confirm a fix.";
    if (after.findings.some((n) => key(n) === key(f))) {
      status = "still_present";
      reason = "The rule still reports a finding for this file.";
    } else if (before.source === "local-review" && after.source === "local-review") {
      const check = after.checks.find(
        (c) =>
          c.ruleId === f.ruleId &&
          c.path === f.path &&
          c.version === "1" &&
          c.result === "clear",
      );
      if (check) {
        try {
          const current = reader.read(f.path);
          const live = inspect(f.path, current).checks.find(
            (c) => c.ruleId === f.ruleId,
          );
          if (sha(current) === check.digest && live?.result === "clear") {
            status = "confirmed_fixed";
            reason =
              "The same rule was repeated locally. The current file matches the after-check evidence.";
          } else
            reason =
              "The file changed since the check, or the current rule does not confirm the fix.";
        } catch (error) {
          if (
            !["ENOENT", "EACCES", "EPERM"].includes(error.code) &&
            error.name !== "PolicyError"
          )
            throw error;
          reason =
            "The current file cannot be safely read. The fix cannot be confirmed.";
        }
      }
    }
    report.results.push({
      ruleId: f.ruleId,
      path: f.path,
      line: f.line,
      priority: priority(f.severity),
      status,
      reason,
    });
  }
  report.added = after.findings
    .filter((f) => !before.findings.some((b) => key(b) === key(f)))
    .map((f) => ({
      ruleId: f.ruleId,
      path: f.path,
      line: f.line,
      priority: priority(f.severity),
    }));
  return report;
}

export function render(report) {
  if (report.format === "cda.retest.v1") {
    const labels = {
      confirmed_fixed: "Confirmed fix",
      still_present: "Still present",
      insufficient_data: "Insufficient data",
    };
    return `# Cyber Defense Agent — retest\n\n${report.results.map((r) => `## ${markdown(r.ruleId)} · ${labels[r.status]}\n\n- Location: ${markdown(r.path)}:${r.line}\n- Priority: ${r.priority}\n- Evidence: ${markdown(r.reason)}\n`).join("\n")}\nNew findings: ${report.added.length}.\n\n${report.limitations.map(markdown).join("\n\n")}\n`;
  }
  return `# Cyber Defense Agent — report v${VERSION}\n\nDate: ${report.createdAt}\n\nSource: ${report.source === "local-review" ? "local static rules" : "import JSON/SARIF"}\n\n## Scope\n\n${report.scope.files.map((f) => `- ${markdown(f)}`).join("\n")}\n\n## Findings (${report.findings.length})\n\n${report.findings.map((f) => `### ${f.priority} · ${markdown(f.title)}\n\n- Rule: ${markdown(f.ruleId)}\n- Location: ${markdown(f.path)}:${f.line}\n- Severity: ${f.severity}\n- Confidence: ${f.confidence}\n- Status: ${markdown(f.status)}\n- Redacted evidence: ${markdown(f.evidence)}\n- Suggested fix: ${markdown(f.fix)}\n`).join("\n") || "No signals in the completed checks.\n"}\n## Coverage and limitations\n\nChecks: ${report.checks.length}; inconclusive: ${report.checks.filter((c) => c.result === "inconclusive").length}; skipped files: ${report.skipped.length}.\n\n${report.checks.filter((c) => c.result === "inconclusive").map((c) => `- Inconclusive: ${markdown(c.path)} · ${markdown(c.ruleId)}`).join("\n")}\n${report.skipped.map((s) => `- Skipped: ${markdown(s.path)} · ${markdown(s.reason)}`).join("\n")}\n\n${report.limitations.map(markdown).join("\n\n")}\n`;
}
