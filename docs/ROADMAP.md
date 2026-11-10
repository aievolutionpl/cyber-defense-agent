# Development path

Updated 10 November 2026. The first product milestone is a reproducible repository review that explains what changed, why it matters and what evidence confirms a fix. Existing computer, website, database and incident-response playbooks remain available.

## Implemented in the evidence and CI update

| Capability | Result | Verification |
| --- | --- | --- |
| Current finding status | Latest retest wins. Reappearance is labelled. Legacy data cannot close unrelated findings. | Regression cases for stale fixes, later uncertainty, missing dates and separate roots. |
| Project views | File reports and retests can be filtered by approved root. | CLI dashboard and scope-isolation tests. |
| Scanner evidence | Original Gitleaks, Trivy and OSV-Scanner JSON adapters with bounded input and redacted output. | Real Gitleaks 8.30.1 synthetic export plus Trivy/OSV shape fixtures, path rejection, unknown severity and empty-report tests. |
| Snapshot comparison | New, existing and no-longer-observed findings with coverage. | Inserted-line identity, incompatible assets/scanners and missing-file tests. |
| SARIF export | Validated locations and deterministic fingerprints. | Export/redaction tests. GitHub upload remains opt-in. |
| PR review | Trusted base tools and policy review candidate files, then write an Actions summary. | Local end-to-end runner plus cross-platform CLI tests. Remote run evidence belongs in VERIFICATION.md. |
| CI hardening | Pinned action SHAs, disabled checkout credential persistence and job timeouts. | Workflow inspection and GitHub checks. |

Usage and current adapter limits are in [scanner integrations](SCANNER_INTEGRATIONS.md).

## Next milestones

| Order | Milestone | Definition of done | Dependencies |
| --- | --- | --- | --- |
| 1 | Exporter compatibility matrix | Capture clean, vulnerable, malformed and incomplete output from pinned Gitleaks, OSV-Scanner and Trivy releases on Linux. Record versions and digests. Repeat supported cases on Windows/macOS. | Current adapters and fixture suite. |
| 2 | Host acceptance | Complete one clean-install Codex session and one Claude Code session, from scope approval to report and retest. Record where each host sends data and whether every boundary held. | Installed/authenticated hosts and a synthetic project. |
| 3 | Detection benchmark | Separate held-out clean/vulnerable fixtures from regression fixtures. Publish false positives, missed findings and evidence completeness per scanner/rule. | Ground-truth labels and exporter matrix. |
| 4 | Full PR scanner jobs | Run pinned external scanners in isolated jobs with bounded runtime and report sizes. Preserve source/commit identity, expose coverage failures and use opt-in SARIF upload. | Exporter matrix and isolation tests. |
| 5 | Finding history across versions | Persist validated events per asset, scanner and rule version. Retain source digests, first/last seen and fixed/reopened transitions. Add alias-aware vulnerability grouping without losing package locations. | Stable scanner identities and migration tests for existing reports. |
| 6 | Desktop coverage | Add consented vendor-catalogue adapters and firewall/encryption/update-setting collectors. Every unsupported app is counted. | Real-device tests and declared outbound data. |
| 7 | Prioritization | Add EPSS with observation time, exposure context and inventory-to-inventory retest. Show the reason for each priority. | Recorded feed fixtures and existing OSV/KEV coverage. |
| 8 | AI skill review | Evaluate importing SkillSpector evidence for agent skills and MCP configuration. Show concrete source locations and permissions requiring review. | A supported exporter schema and held-out fixtures. |

These are acceptance-driven milestones. Dates follow measured integration work. Full host sessions and real exporter runs are tracked separately from local tests.

## How upstream projects inform the implementation

- Gitleaks informs the explicit handling of secret evidence. CDA records identifiers and locations while omitting raw values and report instructions.
- Trivy informs the common report across dependency and configuration findings. Each adapter category retains its declared scope.
- OSV-Scanner informs package/source identities and the comparison of dependency evidence.
- OpenSSF Scorecard informs immutable workflow references and least-privilege automation. A Scorecard integration is a future independent check.
- SkillSpector informs a focused future audit of agent skills before installation. That adapter is not shipped.

The code is an original implementation of documented interchange formats. No upstream source code was copied into the project. Links and field references are in [scanner integrations](SCANNER_INTEGRATIONS.md).

## Later platform work

Provider-neutral routing, local model runtimes, MCP connections, SIEM/EDR correlation and false-positive memory require separate schemas, budgets, retention rules and evaluation. Start with one measured workflow after host acceptance.

Read-only cloud connections need scoped identities and tested tenant isolation. Active web/API/network testing requires an independent authorization gateway, verified target scope, request/time budgets, egress enforcement and STOP. Any future remediation needs an exact reviewed action, rollback and a fresh verification step. These capabilities remain separate projects beyond the current release.
