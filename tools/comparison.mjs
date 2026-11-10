import { deny, relativeFile, sha } from "./scope.mjs";
import { markdown } from "./redact.mjs";

const LEVELS = ["critical", "high", "medium", "low", "info"];
const priority = { critical: "P0", high: "P1", medium: "P2", low: "P3", info: "P3" };

/** Compare stored evidence without reading a target or claiming that disappearance proves a fix. */
export function validateSnapshot(report) {
  if (report?.format !== "cda.report.v1" || !/^[a-f0-9]{64}$/.test(report.scope?.rootKey ?? "") ||
      !Array.isArray(report.scope?.files) || report.scope.files.length > 160 ||
      !Array.isArray(report.findings) || report.findings.length > 2000 ||
      !Array.isArray(report.checks) || report.checks.length > 10000) deny("INVALID_SNAPSHOT");
  const allowed = new Set(report.scope.files.map(relativeFile));
  for (const f of report.findings) {
    if (!f || !/^[A-Za-z0-9_.:-]{1,96}$/.test(f.ruleId ?? "") ||
        !allowed.has(relativeFile(f.path)) || !Number.isInteger(f.line) || f.line < 1 || f.line > 10_000_000 ||
        !LEVELS.includes(f.severity) || (f.fingerprint !== undefined && !/^[a-f0-9]{64}$/.test(f.fingerprint))) deny("INVALID_FINDING");
  }
  for (const c of report.checks) {
    if (!c || !/^[A-Za-z0-9_.:-]{1,96}$/.test(c.ruleId ?? "") || !allowed.has(relativeFile(c.path)) ||
        !["clear", "finding", "inconclusive"].includes(c.result) || !/^[a-f0-9]{64}$/.test(c.digest ?? "")) deny("INVALID_COVERAGE");
  }
  return report;
}

export function findingFingerprint(f) {
  return sha(JSON.stringify([f.ruleId, f.path, f.fingerprint ?? f.line]));
}

export function coverageOf(report) {
  const reasons = [];
  if (report.source !== "local-review") reasons.push("external_coverage_unverified");
  if (report.incomplete) reasons.push("incomplete_report");
  if (!report.checks?.length) reasons.push("no_completed_checks");
  if (report.checks?.some((c) => c.result === "inconclusive")) reasons.push("inconclusive_checks");
  if (report.skipped?.length) reasons.push("skipped_files");
  const checked = new Set(report.checks?.map((c) => c.path));
  if (report.scope?.files?.some((file) => !checked.has(file))) reasons.push("files_without_checks");
  return { status: reasons.length ? "incomplete" : "complete", reasons };
}

const locationKey = (f) => JSON.stringify([f.ruleId, f.path, f.line]);

function entries(report, legacyLocations = new Set()) {
  const result = new Map();
  for (const f of report.findings) {
    const fingerprint = findingFingerprint(legacyLocations.has(locationKey(f)) ? { ...f, fingerprint: undefined } : f);
    const entry = { fingerprint, ruleId: f.ruleId, path: f.path, line: f.line, severity: f.severity, priority: priority[f.severity] };
    const prior = result.get(fingerprint);
    if (!prior || LEVELS.indexOf(f.severity) < LEVELS.indexOf(prior.severity)) result.set(fingerprint, entry);
  }
  return result;
}

export function compareReports(before, after) {
  validateSnapshot(before);
  validateSnapshot(after);
  if (before.scope.rootKey !== after.scope.rootKey) deny("INCOMPATIBLE_REPORT");
  if (before.source !== after.source || (before.scanner?.name ?? null) !== (after.scanner?.name ?? null) ||
      (before.scanner?.adapterVersion ?? null) !== (after.scanner?.adapterVersion ?? null)) deny("INCOMPATIBLE_SCANNER");
  const legacyLocations = new Set([...before.findings, ...after.findings].filter((f) => !f.fingerprint).map(locationKey));
  const previous = entries(before, legacyLocations);
  const current = entries(after, legacyLocations);
  const coverage = { before: coverageOf(before), after: coverageOf(after) };
  if (JSON.stringify([...before.scope.files].sort()) !== JSON.stringify([...after.scope.files].sort())) {
    coverage.after.status = "incomplete";
    coverage.after.reasons.push("scope_changed");
  }
  const added = [...current.values()].filter((f) => !previous.has(f.fingerprint));
  const existing = [...current.values()].filter((f) => previous.has(f.fingerprint));
  const noLongerObserved = [...previous.values()].filter((f) => !current.has(f.fingerprint));
  return {
    format: "cda.comparison.v1", createdAt: new Date().toISOString(), scope: after.scope,
    baselineDigest: sha(JSON.stringify(before)), currentDigest: sha(JSON.stringify(after)),
    coverage, added, existing, noLongerObserved,
    incomplete: Object.values(coverage).some((c) => c.status === "incomplete"),
    limitations: ["No longer observed is not a confirmed fix. Use a fresh local retest to verify remediation.",
      "Comparison includes only the selected files and scanner. Legacy findings use rule, path and line identity."],
  };
}

export function renderComparison(report) {
  const section = (title, items) => `## ${title} (${items.length})\n\n${items.map((f) => `- ${f.priority} · ${markdown(f.ruleId)} · ${markdown(f.path)}:${f.line}`).join("\n") || "None."}\n`;
  return `# Cyber Defense Agent PR review\n\nCoverage ${report.incomplete ? "INCOMPLETE" : "complete for the selected local checks"}.\n\n` +
    section("New findings", report.added) + "\n" + section("Existing findings", report.existing) + "\n" +
    section("No longer observed, verification required", report.noLongerObserved) +
    `\n## Coverage\n\n${Object.entries(report.coverage).map(([side, c]) => `- ${side}: ${c.status}${c.reasons.length ? ` (${c.reasons.join(", ")})` : ""}`).join("\n")}\n\n${report.limitations.map(markdown).join("\n\n")}\n`;
}

/** SARIF contains bounded identifiers and locations, never imported messages, snippets or fixes. */
export function toSarif(report) {
  validateSnapshot(report);
  const coverage = coverageOf(report);
  const rules = [...new Set(report.findings.map((f) => f.ruleId))].sort().map((id) => ({ id }));
  return {
    version: "2.1.0", $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: { driver: { name: "Cyber Defense Agent", version: "0.2.0", rules } },
      automationDetails: { id: "cda/local-review/" },
      invocations: [{ executionSuccessful: coverage.status === "complete",
        toolExecutionNotifications: coverage.status === "complete" ? [] : [{ level: "warning", message: { text: "Coverage is incomplete or unverified. Review the source report before interpreting missing results." } }],
      }],
      properties: { coverage: coverage.status, coverageReasons: coverage.reasons },
      results: [...entries(report).values()].map((f) => ({
        ruleId: f.ruleId,
        level: { critical: "error", high: "error", medium: "warning", low: "note", info: "note" }[f.severity],
        message: { text: `Security signal ${f.ruleId}. Review the local evidence. Exploitability has not been established.` },
        locations: [{ physicalLocation: { artifactLocation: { uri: f.path.split("/").map(encodeURIComponent).join("/") }, region: { startLine: f.line } } }],
        partialFingerprints: { "cdaFinding/v1": f.fingerprint },
        properties: { priority: f.priority },
      })),
    }],
  };
}
