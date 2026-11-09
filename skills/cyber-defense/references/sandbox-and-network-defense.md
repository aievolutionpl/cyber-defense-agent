# Lab and network defense planning

Adapted from AntyGravity's sandbox guide. This is guidance, not a network executor. v0.1 sends no traffic, installs no scanner and executes no target code. It accepts only the offline formats described in `docs/FORMATS.md`; a product name does not guarantee compatible SARIF export.

For an authorized lab plan, discuss:

- Separate synthetic data and credentials, isolated namespaces/networks, explicit ingress and egress, and a tested recovery path. A single Docker flag is not complete isolation.
- Rules of Engagement: owners, exact hosts and ports, test accounts, time window, rate budget, excluded infrastructure and a working STOP mechanism.
- Local configuration posture: exposed database ports, service segmentation, firewall policy, TLS validation and trusted CAs.
- HTTP posture: CSP, HSTS where appropriate, content-type protection, secure cookie flags, and proxy trust configuration. These are human review topics; the four local rules do not cover them all.
- API roles and object ownership: build a user/resource/action matrix from separately approved artifacts. A static review cannot prove runtime authorization.
- Webhook signature verification, replay protection and JWT algorithm/key boundaries. Never paste real tokens into model context.

Use OWASP WSTG, OWASP API Security and NIST SP 800-115 as methodology references (see `docs/RESEARCH.md`). Plan a separate runner and independent authorization/egress controls before any future active testing. Scanners such as Semgrep, Trivy or Gitleaks are external references, not bundled or automatically executed integrations.

For IOC enrichment, external reputation services can learn the submitted IP, domain, URL or hash. Even read-only API calls need explicit data-sharing consent, least-privilege credentials, quotas, logging and provider terms review. Do not equate enrichment with remediation.
