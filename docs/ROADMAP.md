# Roadmap

v0.1 is local-only: 4 simple static rules, bounded JSON/SARIF import, prioritized Markdown and conservative retest. The public demo is static.

## Next: better offline evidence

1. Evaluate pinned Semgrep, Gitleaks and Trivy SARIF exporters against adversarial fixtures. Keep running scanners external until execution isolation and resource limits are in place.
2. Add lockfile/SBOM adapters, tested advisory snapshots, clear supported versions and reachability distinctions.
3. Add held-out clean/vulnerable fixtures and measure false positives, false negatives, evidence completeness and missing coverage. A knowledge pack or popular repository does not establish expert performance.
4. Expand the implemented bounded `cda.model-input.v1` envelope with validated, versioned adapters. Keep raw logs outside model context. See [architecture](ARCHITECTURE.md).

## Planned agent platform

Provider-neutral model routing (local/small → explicitly authorized frontier analysis), separately scoped MCP adapters, episodic incident correlation and opt-in false-positive memory are designs, not available integrations. Sigma/YARA, LiteLLM/Ollama and SIEM/EDR remain candidate modules. Before shipping: schemas, quotas, timeouts, evaluation fixtures, provenance, retention, privacy review and independent authorization gates. External IOC lookups also need consent to transmit private indicators.

Active response stays disabled: reversible actions require preapproved policy, TTL, allowlists and rollback; disruptive production/IAM actions require authenticated human approval of the exact action digest. No Slack/Telegram approval or firewall/EDR executor exists in this release.

## Later: web / API

Do not ship until an independent, deny-by-default authorization gateway exists outside the model process: verified ownership + explicit Rules of Engagement, versioned scope, exact target/method registry, expiring/revocable consent, DNS/connect-time validation, blocked redirects by default, independent egress controls, budget/rate/time limits, audit log and operational STOP. Test all of these with isolated synthetic applications first.

## Later: network / cloud

A separate runner with a scoped identity, network enforcement, approved lab targets, read-only cloud connections and tested tenant isolation. No network scan or penetration-testing command is exposed by this release. Nmap, Nuclei, CALDERA and Atomic Red Team remain optional lab references, not bundled adapters.
