import path from "node:path";
import { deny, relativeFile, sha, within } from "./scope.mjs";
import { cvss3 } from "./advisories.mjs";

export const SCANNER_FORMATS = ["gitleaks", "trivy", "osv"];
const MAX_ENTRIES = 2000;
const list = (value) => {
  if (!Array.isArray(value) || value.length > MAX_ENTRIES) deny("INVALID_SCANNER_REPORT");
  return value;
};
const id = (value) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]{1,80}$/.test(value)) deny("INVALID_SCANNER_ID");
  return value;
};
const coordinate = (value) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9@._+:/~-]{1,200}$/.test(value)) deny("INVALID_PACKAGE_COORDINATE");
  return value;
};

function localPath(value, root) {
  if (typeof value !== "string") deny("INVALID_PATH");
  // Some exporters use absolute local paths. Translate only paths inside this approved root.
  if (path.isAbsolute(value)) {
    if (!within(root, value)) deny("OUT_OF_SCOPE");
    value = path.relative(root, value);
  }
  return relativeFile(value);
}

function severity(value) {
  const label = typeof value === "string" ? value.toLowerCase() : "unknown";
  return { severity: { critical: "critical", high: "high", moderate: "medium", medium: "medium", low: "low", info: "info" }[label] ?? "medium",
    severityKnown: ["critical", "high", "moderate", "medium", "low", "info"].includes(label) };
}

/** Original, bounded mappings of documented exporter fields. No scanner code or messages are executed. */
export function adaptScanner(scan, format, root) {
  if (!SCANNER_FORMATS.includes(format)) deny("UNSUPPORTED_FORMAT");
  const entries = [];
  const limitations = ["External scanner coverage is unverified. Missing findings cannot establish a fix."];
  const add = (rule, file, line, level, identity) => {
    if (entries.length >= MAX_ENTRIES) deny("TOO_MANY_FINDINGS");
    const ruleId = `${format}:${id(rule)}`;
    const location = localPath(file, root);
    const entry = { ruleId, path: location, line: line ?? 1, ...severity(level), confidence: "low" };
    entry.fingerprint = sha(JSON.stringify([format, ruleId, location, identity ?? entry.line]));
    entries.push(entry);
  };
  if (format === "gitleaks") {
    for (const f of list(scan)) {
      // Secret, Match, Fragment, commit metadata and free-form descriptions are deliberately omitted.
      add(f?.RuleID, f?.File, f?.StartLine, "high");
    }
    limitations.push("Gitleaks history-only files must exist in the approved scope. This adapter does not inspect Git history.");
  }
  if (format === "trivy") {
    if (scan?.SchemaVersion !== 2 || !["filesystem", "repository"].includes(scan.ArtifactType)) deny("UNSUPPORTED_TRIVY_REPORT");
    for (const result of list(scan.Results ?? [])) {
      localPath(result?.Target, root);
      if (!["lang-pkgs", "config", "secret"].includes(result.Class)) deny("UNSUPPORTED_TRIVY_CLASS");
      if (result.ExperimentalModifiedFindings?.length || result.Licenses?.length || result.CustomResources?.length || result.CryptoFindings?.length)
        limitations.push("Additional Trivy result categories were not imported.");
      for (const f of list(result.Vulnerabilities ?? [])) {
        add(f.VulnerabilityID, result.Target, 1, f.Severity, [coordinate(f.PkgName), coordinate(f.InstalledVersion)]);
      }
      for (const f of list(result.Misconfigurations ?? [])) {
        if (!["FAIL", "PASS", "EXCEPTION"].includes(f.Status)) deny("INVALID_SCANNER_REPORT");
        if (f.Status === "PASS") continue;
        if (f.Status === "EXCEPTION") {
          limitations.push("Trivy reported a policy exception. Review it in the original report.");
          continue;
        }
        add(f.ID, result.Target, f.CauseMetadata?.StartLine || 1, f.Severity);
      }
      for (const f of list(result.Secrets ?? [])) add(f.RuleID, result.Target, f.StartLine, f.Severity);
    }
  }
  if (format === "osv") {
    if (!scan || scan.image_metadata) deny("UNSUPPORTED_OSV_REPORT");
    if (scan.experimental_generic_findings?.length) limitations.push("Experimental OSV findings were not imported.");
    let packages = 0;
    for (const result of list(scan.results)) {
      if (!["lockfile", "sbom"].includes(result?.source?.type)) deny("UNSUPPORTED_OSV_SOURCE");
      localPath(result.source.path, root);
      for (const pkg of list(result.packages)) {
        if (++packages > MAX_ENTRIES) deny("TOO_MANY_PACKAGES");
        const name = coordinate(pkg.package?.name);
        const version = coordinate(pkg.package?.version);
        const ecosystem = coordinate(pkg.package?.ecosystem);
        for (const vuln of list(pkg.vulnerabilities ?? [])) {
          const scores = list(vuln.severity ?? []).map((s) => cvss3(s?.score)).filter((s) => s !== null);
          const score = scores.length ? Math.max(...scores) : null;
          const label = score === null ? vuln.database_specific?.severity : score >= 9 ? "critical" : score >= 7 ? "high" : score >= 4 ? "medium" : score > 0 ? "low" : "info";
          add(vuln.id, result.source.path, 1, label, [ecosystem, name, version]);
        }
      }
    }
    limitations.push("OSV aliases are retained as separate IDs. Call analysis and license findings are not imported.");
  }
  if (entries.some((f) => !f.severityKnown)) limitations.push("Unknown severity is queued at P2 for review, with low confidence.");
  return { entries, scanner: { name: format, adapterVersion: 1 }, limitations: [...new Set(limitations)], incomplete: true };
}
