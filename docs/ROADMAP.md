# Roadmap

v0.1 is local-only: 4 simple static rules, bounded JSON/SARIF import, prioritized Markdown and conservative retest. The public demo is static.

## Next: better offline evidence

1. Evaluate pinned Semgrep, Gitleaks and Trivy SARIF exporters against adversarial fixtures. Keep running scanners external until execution isolation and resource limits are in place.
2. Add lockfile/SBOM adapters, tested advisory snapshots, clear supported versions and reachability distinctions.
3. Add held-out clean/vulnerable fixtures and measure false positives, false negatives, evidence completeness and missing coverage. A knowledge pack or popular repository does not establish expert performance.

## Later: web / API

Do not ship until an independent, deny-by-default authorization gateway exists outside the model process: verified ownership + explicit Rules of Engagement, versioned scope, exact target/method registry, expiring/revocable consent, DNS/connect-time validation, blocked redirects by default, independent egress controls, budget/rate/time limits, audit log and operational STOP. Test all of these with isolated synthetic applications first.

## Later: network / cloud

A separate runner with a scoped identity, network enforcement, approved lab targets, read-only cloud connections and tested tenant isolation. No network scan or penetration-testing command is exposed by this release. Nmap, Nuclei, CALDERA and Atomic Red Team remain optional lab references, not bundled adapters.
