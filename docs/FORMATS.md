# Formats and implemented rules

## cda.scan.v1 JSON

```json
{
  "format": "cda.scan.v1",
  "findings": [{
    "ruleId": "CDA-DEP-001",
    "path": "package.json",
    "line": 7,
    "severity": "high",
    "confidence": "high",
    "evidence": "Local raw evidence; not forwarded by importer",
    "fix": "Local scanner recommendation; not forwarded"
  }]
}
```

Required: format, findings array, each ruleId/path/positive line/severity. Severity: critical/high/medium/low/info. Confidence: high/medium/low; default low. Unknown free-text fields are never copied to the model-facing report. A digest records the imported entry. Deduplication key: rule, path and line. 2,000 findings maximum.

## SARIF 2.1.0 subset

Input is a UTF-8 JSON file inside the approved root. Supports runs[].results[] with ruleId and first physical location: artifactLocation.uri and region.startLine (default 1). Levels error/warning/note/none map to high/medium/low/info. Missing level defaults to warning.

Only simple relative URIs naming exact approved files are accepted. External/file URLs, percent-encoded paths, uriBaseId and artifact indexes are rejected. Additional locations are not followed; only the primary location is reported. Rules metadata, snippets, Markdown, fix commands, properties and remote resources are never executed, rendered as HTML or fetched. Failed invocations are noted as incomplete. A valid empty imported result proves no coverage.

Other JSON schemas (raw npm audit, Trivy, Gitleaks, Semgrep JSON) require conversion to the documented format or SARIF outside the agent; they are not supported adapters in v0.1.

## Four built-in controls

| ID | Check | Limits |
|---|---|---|
| CDA-DEP-001 | Precisely pinned lodash declaration below 4.17.21, known advisory GHSA-35jh-r3h4-6jhm | package.json only; does not resolve ranges or a lockfile; no fresh vulnerability feed or reachability analysis |
| CDA-TLS-001 | rejectUnauthorized: false / NODE_TLS_REJECT_UNAUTHORIZED=0 | Line pattern; may detect comments/test settings; review context |
| CDA-SECRET-001 | Quoted credential-like assignment of at least 8 characters | Heuristic; no entropy/dictionary engine; whole value omitted |
| CDA-EVAL-001 | eval( in JS/TS | Heuristic; no taint analysis; comments may match |

Exact/ranged unresolved versions and malformed package.json return inconclusive. Skipped formats are listed separately. P0/P1/P2/P3 correspond to critical/high/medium/low-or-info; business priority still needs human context.

## Reports and retest

`cda.onboarding.v1` is an approved-filenames-only metadata response: technology hints, file count, expiry and three structured intake questions. It does not enumerate a target or read its content.

`cda.model-input.v1` is an optional local, bounded JSON summary of a validated `cda.report.v1`: at most 100 facts, severity/priority/confidence enums, numeric lines, opaque file/external-rule references and known local rule IDs only. Paths, arbitrary imported rule IDs and all free text are excluded. It includes total/included/omitted counts. See [schema](../schemas/cda.model-input.v1.schema.json). No provider call is made; the user reviews the summary before including it in model context. It is not a lossless replacement for the original report.

Local report schema cda.report.v1 records source, scope root fingerprint, paths, findings, rule versions and per-control content digest/result. No absolute target path is included in the report; it remains in local scope state.

Retest needs an unexpired approved scope and two reports for the same canonical root. A missing finding is confirmed_fixed only when after was a local review, the same supported rule was clear, the current file digest still matches, and rerunning that rule now is clear. Otherwise it is insufficient_data. Matching findings are still_present; new finding groups are reported separately. Rules with multiple findings in a file are treated conservatively as one rule/file group for retest. No absence in imported data is treated as verified remediation.

## Offline update inventories

`cda.updates.v1` input and `cda.update-plan.v1` output are separate from audit/retest reports. See [UPDATE_PLANNING.md](UPDATE_PLANNING.md) for the bounded fields, timestamp rules, supported OS/manager labels and conservative outcomes. `summary` and `retest` do not accept update plans.
