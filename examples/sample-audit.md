# Cyber Defense Agent — report v0.1.0

Date: 2026-11-09T21:03:38.360Z

Source: local static rules

## Scope

- package.json
- reports/before.sarif
- reports/partial.json

## Findings (1)

### P1 · Lodash version affected by GHSA-35jh-r3h4-6jhm

- Rule: CDA-DEP-001
- Location: package.json:7
- Severity: high
- Confidence: high
- Status: needs review
- Redacted evidence: Manifest declares lodash 4.17.20; known fix: 4.17.21. Reachability of the template function was not assessed.
- Suggested fix: Update lodash to at least 4.17.21, refresh the lockfile in your workflow and check compatibility. The agent does not install dependencies.

## Coverage and limitations

Checks: 5; inconclusive: 0; skipped files: 1.

Static checks do not establish reachability or exploitability.

An absent finding is not evidence of security. The tool executes no target code or network traffic.
