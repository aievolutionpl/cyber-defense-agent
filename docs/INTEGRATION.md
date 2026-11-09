# Unified release integration

The `codex/premium-unified` branch combines the tested Node v0.1 release (`cf1caea`) with the useful parts of AntyGravity's local work (committed parent `57f0930` plus its unfinished local drafts). The original merge and both source histories are preserved locally on `codex/premium-unified-local-history`; no existing remote branch is force-pushed. GitHub push protection rejected the AntyGravity parent because historical demo fixtures contain Stripe-shaped values. The public unified branch retains the reviewed final tree on the clean Node parent without importing that blocked history. No push-protection override was used. The AntyGravity working directory is left intact. A full tracked/untracked source snapshot and binary diff were saved locally under workspace task `20261109T195123Z-cyber-defense-agent-unified-premium-en-pl-redesign-a-cf21923e` before integration.

| Source | Integrated result |
|---|---|
| Node v0.1 | Scope approvals, path/link guards, conservative importer/retest and security fixtures retained |
| AntyGravity persona | Friendly three-question onboarding and practical next-step guidance, without guarantees of expertise or injection immunity |
| AntyGravity onboarding command | Ported to `tools/onboarding.mjs`, using approved filenames only and existing Node authorization |
| AntyGravity lab/network guide | Revised as planning guidance, with truthful execution and format limits |
| AntyGravity Hermes entry | Thin wrapper to the canonical skill; discovery/model session explicitly unverified |
| Incomplete light UI | Replaced by shared EN/PL dark Next.js pages; synthetic report/onboarding/defense overview |
| User architecture review | Added bounded model input and documented OODA, injection boundaries, risk tiers, MCP, routing and incident memory |

The second Python audit engine was not exposed as an alternative production CLI. Its broad default file selection, less complete link handling and simplistic dependency range matching would weaken the verified Node boundary. Its useful onboarding behavior was ported instead. Historical source remains in the local history branch, original checkout and local snapshot. No claim is made that the unshipped Python engine or its six tests are part of this release's verified runtime.

`DhvanilPatel/swarm-cursors` is an inspiration reference for choreography, not a code dependency. It is a browser extension with no reuse license declared in its README at review time. All scroll cursor code and supplied skill assets here are original. No extension snapshot/DOM replay code was copied.
