# Sources and further depth

The playbooks in this folder are original summaries written for this skill. They are distilled from the public standards and open repositories below. Consult these when a task needs more depth than a playbook gives. None of them is bundled, installed or executed by this skill, and mentioning a tool is not permission to run it.

## Agent review sources checked on 13 November 2026

- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/): official resource page, published 9 December 2025. Used to frame the review of authority, tools, memory and trust boundaries.
- [OWASP ASVS 5.0.0](https://asvs.owasp.org/): the official site identifies 5.0.0 as its downloadable release. Used for testable application controls; no claim of full ASVS coverage.
- [MCP security best practices, revision 2026-07-28](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices): current documentation reached from the latest-security URL. Used for token audience, proxy consent, state ownership, local server trust and outbound-request boundaries. Apply the revision supported by the reviewed target.

These are public documentation reads, not checks of a user asset. The [agent playbook](agent-security.md) is original guidance, not a bundled scanner. Recheck sources when a version-specific decision depends on them.

## Standards and catalogues

| Source | Use it for |
|---|---|
| OWASP Top 10:2025 - owasp.org/Top10 | web risk categories used in `web-application.md` |
| OWASP ASVS 5.0 - github.com/OWASP/ASVS | precise, testable web security requirements |
| OWASP Web Security Testing Guide - github.com/OWASP/wstg | methodology for authorized web testing |
| OWASP Cheat Sheet Series - github.com/OWASP/CheatSheetSeries | concrete secure patterns per topic |
| OWASP API Security Top 10 (2023) - github.com/OWASP/API-Security | API authorization and resource risks |
| OWASP Top 10 for LLM Applications (2025) | applications that call a model |
| OWASP Secure Headers Project | header values and rationale |
| CWE Top 25 - cwe.mitre.org | weakness identifiers in `code-review.md` |
| MITRE ATT&CK - github.com/mitre/cti | attacker techniques; mapping detections |
| CIS Controls v8 and CIS Benchmarks | prioritised safeguards; OS and database baselines |
| NIST CSF 2.0, SP 800-61, SP 800-115 | programme structure; incident handling; test planning |
| CVSS (first.org/cvss), EPSS (first.org/epss), SSVC (CISA) | severity, likelihood and decision models in `triage-and-severity.md` |

## Vulnerability and lifecycle data

| Source | Use it for |
|---|---|
| OSV.dev - github.com/google/osv.dev | machine-readable advisories; queried by `advisories` |
| GitHub Advisory Database - github.com/github/advisory-database | reviewed advisories for package ecosystems |
| NVD - nvd.nist.gov | CVE details and affected product ranges |
| CISA Known Exploited Vulnerabilities catalog | what is exploited in the wild; used by `advisories` |
| endoflife.date - github.com/endoflife-date/endoflife.date | support and end-of-life dates |
| Vendor advisories (Microsoft MSRC, Apple security releases, Debian/Ubuntu/Red Hat trackers, Chrome/Firefox release notes) | the authoritative word on a product |

## Agent skills and review methods on GitHub

| Repository | What it contributes |
|---|---|
| trailofbits/skills | audit-grade review workflows, differential review, sink catalogues |
| anthropics/claude-code-security-review | diff-focused security review with false-positive filtering |
| agamm/claude-code-owasp | compact OWASP Top 10:2025 / ASVS 5.0 reference for coding agents |
| mukul975/Anthropic-Cybersecurity-Skills | a large community library of analyst playbooks mapped to ATT&CK and NIST CSF (includes dual-use material: stay within this skill's hard lines) |
| OWASP Top 10 for Agentic Applications 2026 | trust boundaries, tools and agent authority; see the checked primary sources above |

## Open-source tools a user may already run

Reports from these can be triaged with `import` when exported as SARIF or `cda.scan.v1` JSON.

| Tool | Finds |
|---|---|
| google/osv-scanner | vulnerable dependencies in lockfiles and images |
| aquasecurity/trivy | vulnerabilities, misconfiguration and secrets in images, filesystems, IaC |
| anchore/grype, anchore/syft | image/filesystem vulnerabilities; SBOMs |
| semgrep/semgrep, github/codeql | code patterns and data-flow findings |
| gitleaks/gitleaks, trufflesecurity/trufflehog | secrets in files and Git history |
| PyCQA/bandit, securego/gosec, eslint security plugins | language-specific code checks |
| bridgecrewio/checkov, tfsec | infrastructure-as-code misconfiguration |
| ossf/scorecard | supply-chain health of a repository |
| CISOfy/lynis | Linux and macOS host hardening audit |
| drwetter/testssl.sh | TLS configuration detail |
| OWASP ZAP (baseline scan), projectdiscovery/nuclei | web checks - active tools: authorized targets and a lab only |
| nmap | network discovery - the user's own network only |

## Keeping knowledge current

Standards are revised and advisories change daily. When a fact matters to a decision (an affected version range, a support date, a recommended header value), verify it against the primary source at the time of use and cite the URL and date. Prefer saying "I could not confirm this" to repeating a remembered detail.
