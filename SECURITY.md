# Security policy

v0.1 supports authorized **offline local review only**. It performs no web, API or network audit, exploitation, credential validation or target execution.

## Reporting a vulnerability

Do not post live credentials, private reports or exploit details in public issues. Use GitHub's private vulnerability reporting for this repository if enabled: https://github.com/aievolutionpl/cyber-defense-agent/security/advisories/new . If unavailable, first open a minimal issue asking for a private reporting channel, with no sensitive payload. No private reporting address has been invented.

## Supported release and guardrails

Only the current v0.1 comparison branch is maintained here. See docs/THREAT_MODEL.md for the precise trust boundary.

- Exact approved file allowlist, 24-hour expiry and explicit revocation.
- Canonical root, traversal/URI/NTFS-stream rejection, symbolic-link/junction and hardlink rejection; checks repeated during reads.
- Regular UTF-8 files only; 4 MiB each; at most 160 files and 2,000 findings.
- No project execution, installs, network client or model SDK in the audit CLI.
- Imported free text never enters normalized reports. Metadata remains potentially private.
- Retest verifies current local rule coverage and content; imported absence cannot establish remediation.
- Separate local .cda state, private file modes where supported, ignored by Git.

This is not an OS sandbox, a certification, or a substitute for professional security review. Approval state is locally editable by its owner. Use trusted tools outside the target, an immutable snapshot, and OS isolation for adversarial filesystems. Do not run the tools against a directory being modified concurrently.

Security research references, lab software and penetration-testing frameworks are optional learning resources, not capabilities or authorization granted by this product.
