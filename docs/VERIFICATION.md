# Verification record

## Evidence adapters, comparison and PR review — 10 November 2026

- Based on `e4bc7a4`, including the preceding report-correctness fixes from PR #11.
- Local Linux, Node 24.22.1. **71/71 tests**, zero skipped. Skill contracts, ESLint, TypeScript and static build pass. The existing synthetic demo passes. Tests exercise the normal CLI for import, comparison, SARIF and scoped dashboards.
- Regression coverage includes later uncertainty overriding an old fix, returning findings, standalone still-present retests, missing dates, separate roots, changed scopes, legacy fingerprints, importer-controlled identity, empty reports and path/bounds rejection.
- The PR runner was exercised against this repository's 12-file policy. It completed 36 local checks and reported zero new and two existing signals when comparing the checkout to itself. This is a functional check of the four-rule pipeline, not a security verdict for the repository.
- Gitleaks **8.30.1** ran on a synthetic directory with a custom fixture rule and `--redact=100`. One finding imported successfully without the raw test value. Release archive SHA-256 matched the publisher's checksum, `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`. The recorded JSON fixture normalizes File to `config.js`; remaining fields are the redacted exporter output. Trivy and OSV adapters were checked against documented source fields and synthetic fixtures. Their binaries were not run in this iteration.
- HTML content and escaping are tested in EN/PL. A fresh Chromium visual run was attempted but the process exited because this executor denies `socket()` with EPERM. Responsive screenshots and PDF rendering were therefore not revalidated here. The report's CSS and page layout were preserved.
- The PR workflow starts with an explicit adoption message while its runner is absent from the base branch. It becomes operational after the reviewed runner and file policy reach that branch. Remote CI evidence is recorded with the pull request. Live OSV/KEV calls, authenticated model-host sessions and end-to-end scanner installation remain unverified in this iteration.

## Report correctness fixes after review — 10 November 2026

An automated review of the visual-report change found six defects; each was reproduced in a test before the fix. **60/60 tests** now pass, with skill contracts, ESLint, TypeScript, build and demo.

- A confirmed fix closed any finding with the same rule and path, across projects and regardless of time. It now requires the same approved root and a retest newer than the report that raised the finding; retests without scope identity close nothing.
- Findings newly discovered by a retest (`added`) were dropped from the report. They are now open findings.
- Findings sharing a title in different files or lines were merged into one. Only exact duplicates collapse now.
- An incomplete advisory lookup could render as a clear verdict. It now renders as `incomplete` with a warning naming the report.
- PDF printing started a browser process without its own consent flag. It now runs only with `report --pdf` or `demo.mjs --pdf`.
- Two follow-ups from the review of these fixes: a retest addition and the same location in its after-report are now one finding (keyed by root, rule, path and line), and control characters are normalised before redaction so they cannot split a secret pattern.
- Expert-finding text was clipped before redaction, so a long private-key block could survive. Input is redacted first, and an unterminated key block is removed from its opening marker.

## Visual report, dashboard and build-from-empty presentation — 10 November 2026

- Linux (Ubuntu 24.04, Node 22) local: **54/54 tests**, skill contracts, ESLint, TypeScript, static build and synthetic demo pass. Five new tests cover expert-finding validation and redaction, merging of every report type, removal of confirmed fixes, HTML escaping and the absence of scripts or external resources in the report, PDF printing with an injected runner, and the state store's deliverable types.
- `report` produced a **real PDF** here through headless Chromium (five A4 pages for the synthetic sample; page 1 and 2 were rasterised and inspected). The committed `examples/sample-audit-report{,-pl}.pdf` are rebuilt by `node scripts/sample-report.mjs`. PDF printing through **Edge on Windows and Chrome/Edge on macOS was not run**; the browser path list for those systems is untested. Without a browser the command writes HTML only and says so.
- The dashboard was regenerated after evidence commands and opened as a file; its five-second refresh is a plain meta refresh.
- Browser acceptance on the static export (Chromium): **114/114** EN/PL, **18/18** hero and **10/10** motion checks pass. The hero reflow check now waits for the settled layout: with reduced motion every style change becomes a near-zero transition, and on this longer page the first frames after a resize still held the previous layout. Settled layouts were also scanned at 15 widths from 320 to 1200 px with no horizontal overflow.
- Build-from-empty effect: sections below the fold start as an empty frame and are assembled by the agent cursors; a probe confirmed that content on screen at load is never hidden, that a section waiting for busy agents reveals itself after about 1.3 s, and that nothing stays hidden after a fast scroll to the bottom. Without JavaScript, with reduced motion or with the pause control, content is shown immediately.
- Agent host marks come from LobeHub Icons (MIT); they are third-party trademarks shown for identification only. Full model-host sessions, physical devices, Safari and Firefox remain **unverified**.

## v0.2 expert skill and sales page — 10 November 2026

- Linux (Ubuntu 24.04, Node 22) local: **49/49 tests**, skill contracts (13 skill documents, all relative links resolve, nine playbooks present), ESLint, TypeScript, static build and synthetic demo pass. Eleven new tests cover the consent gates, fixed-command inventory collectors (Linux, Windows and macOS parsers with injected runners), lockfile parsers, CVSS v3 scoring, OSV/KEV lookup with host allowlisting and alias merging, and the passive website check including redirect bounds and absence of cookie values, query strings and bodies in reports.
- `inventory --yes` was run for real on the Linux build machine: 837 dpkg packages, no hostname or user name in the output. The Windows and macOS collectors are verified against parser fixtures only; **they were not run on real Windows or macOS machines**.
- `advisories` and `web` were **not exercised against live services**: the build sandbox blocks outbound traffic to api.osv.dev, www.cisa.gov and arbitrary sites. Request and response shapes were checked against the published OSV API documentation and one real OSV record. Both commands fail closed with a stable error when the network is unavailable. Treat the live integrations as unverified until run with network access.
- Browser acceptance on the static export (Chromium): **114/114** EN/PL checks, **18/18** hero checks and **10/10** motion checks pass with the new sections. Desktop 1440 px and mobile 390 px full-page captures were inspected. Physical devices, Safari and Firefox remain untested.
- The playbooks are original summaries of public standards. They were not evaluated against a benchmark of held-out vulnerable systems; a knowledge base does not by itself establish expert performance. Full model-host sessions remain **unverified**.
- CI for this branch and the public Pages deployment are recorded in RELEASE.md only after they are observed.

## Emerald illustrated hero — 9 November 2026

- Local `npm run check`: 38 tests, skill contracts, ESLint, TypeScript and production-prefix build pass. No CLI behavior or dependency changed.
- **114/114** EN/PL static-export acceptance checks pass after moving the report into the workflow section; no uncaught browser errors or failed assets. Keyboard, clipboard, full demo, policies, no-JS fallback and 320/390/768/1440 layouts included.
- **18/18** hero checks pass: automatic progression, four keyboard-selectable stages, manual hold, replay, global pause, offscreen timer stop, dynamic reduced motion, manual interaction without motion, reflow and image loading.
- **10/10** existing cursor/marquee checks pass. Desktop/mobile and four hero phases were captured; a browser recording documents the real sequence. Physical-device and sustained performance testing remain unverified.
- Original imagegen artwork: 1200×800 WebP, approximately 57 KB. Visual review confirmed coherent module geometry, green/graphite palette and no generated text/logos. The illustration is explicitly conceptual; network scanning remains on the roadmap, remediation remains human-controlled.
- Previous transitions-agent license/service results are historical. This iteration adds the requested original hero presentation; no additional hosted motion fix or Business license is claimed.

Public verification also passed **114/114 + 18/18 + 10/10**; Windows/Ubuntu/macOS CI and Pages deployment succeeded. Exact runs and commits are recorded in RELEASE.md. Full model-host sessions remain unverified.

## Command-center and update planning — 9 November 2026

- Windows local: **38/38 tests**, canonical skill contracts, ESLint, TypeScript, production-prefix static build and synthetic audit demo pass. Five update-inventory tests cover exact scope, untrusted fields, stale/missing/equal versions, invalid calendar/future dates, duplicate/bounded records and all seven documented OS/manager label pairs.
- The synthetic Windows inventory produced a local Markdown/JSON plan: two reported updates and one unknown available version. No network, target execution, installation or model calls. OS-manager labels are input metadata, not executing integrations.
- Production static export: **114/114 Chromium checks** for EN/PL, 320/390/768/1440 px, keyboard, clipboard, full audit demo, onboarding, policies, protection tabs, host-status disclosure, reduced motion and no-JS content. Zero uncaught errors or failed assets.
- Motion acceptance: **10/10 checks** for three independent changing cursor paths, left-to-right host strip, pause, compact single cursor, keyboard interaction during construction and dynamic reduced motion. Actual desktop/mobile, in-progress cursor and protection screenshots were inspected. This is simulated construction, not connected autonomous agents.
- transitions-agent **0.11.2**, source-only scan: **78 → 78** final score. Polish retained a valid reduced-motion guard; three incorrect decorative-loop speed changes were reverted. The intermediate service score of 81 is not the final result. Remaining menu/global recipe findings are unresolved; Business Revamp was refused by the Free license and is deferred. See [design provenance](COMMAND_CENTER_DESIGN.md).
- Codex, Claude Code, Cursor, Antigravity, Lovable and Hermes full model sessions remain **unverified**. Local tests, documented format support and CI are separate evidence. Physical phones, Safari/Firefox and sustained GPU/frame-rate measurements remain untested.

Public EN/PL acceptance also passed **114/114**. The three-OS Node 22 matrix passed **38/38 tests on each OS, zero skipped**; Pages deployment succeeded. See [RELEASE.md](RELEASE.md) for exact commits and runs. Older records below are historical.

## Unified release hardening — 9 November 2026

- Windows local: **33/33 security and workflow tests**, skill contracts, ESLint, TypeScript, static build and synthetic demo pass. Four new intake tests cover all 36 choice combinations, invalid input, cancellation/EOF and the absence of approval/transmission side effects.
- Node 22 CI: **Windows, Ubuntu and macOS all passed** `npm ci`, `npm run check`, demo, approved-filename onboarding and bounded model summary. [Run 42698960894](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42698960894), source `eeb1b57`.
- Real Windows terminal: completed the four-question `start` intake and received the expected retest plan. This is deterministic interaction, not a model session.
- Chromium static export at `/cyber-defense-agent/`: **106/106 acceptance checks pass**, EN/PL, 1440/768/390/320, keyboard, copying, demo, onboarding, policy navigation, reduced motion and no-JS fallback. No uncaught browser errors or failed assets. No application cookies/localStorage/sessionStorage were created in the tested flow.
- Visual inspection found an internal horizontal scroll offset in the hero after viewport resizing and focus changes. Replaced the backdrop's `overflow: hidden` with `overflow: clip` and added eight explicit hero-bound checks. Both mobile language layouts were inspected again after the fix.
- README infographic, large website button, actual product screenshot and new policy layout visually inspected. Production dependency audit: zero reported vulnerabilities at this check; this is not a comprehensive security assessment.
- Full model-host sessions remain **unverified** for Codex, Claude Code and Hermes. Earlier launcher/quota limitations below still apply; no unsupported integration claim was added.
- Physical phones, Safari/Firefox, OS-isolation guarantees, live hostile-filesystem races and professional legal review are not verified. The macOS result is GitHub-hosted CI, not an interactive Mac desktop session.

The deployed canonical EN/PL site also passed all **106/106** checks after publication. The final PR matrix on `9a3e2f4` passed all three OS jobs with no skipped tests. See [release evidence](RELEASE.md).

The older results below are retained as historical evidence. Deployment and final merge references are recorded in [RELEASE.md](RELEASE.md).

# Unified v0.1 verification · 2026-11-09

Source branch: `codex/premium-unified`. Local checkout: `projects/cyber-defense-agent-release`. Both previous source histories are preserved locally; the published tree excludes a historical parent rejected by push protection. Integration decisions are in [INTEGRATION.md](INTEGRATION.md).

## Code and CLI

| Check | Observed result |
|---|---|
| `npm run check:skills` | PASS: Codex, Claude and experimental Hermes share the canonical defense instruction; motion wrappers share one source |
| `npm test` | PASS: 29 tests, zero failures/skips on Windows |
| `npm run lint` | PASS: zero warnings |
| `npm run typecheck` | PASS: current Next route types regenerated, TypeScript clean |
| `npm run build` | PASS: EN `/` and PL `/pl/` static routes |
| Pages-prefix build | PASS with `/cyber-defense-agent/compare/node-v0.1` and configured public URL |
| `npm audit --json` | Zero reported production/development vulnerabilities at check time |
| `npm run demo` | PASS: SARIF import, local evidence, copy-only remediation, confirmed fix, insufficient data and out-of-scope denial |
| `onboarding --scope demo` | PASS: structured questions and filename-only Node hint, no target content read |
| `summary --scope demo --report demo-before --name model-summary` | PASS: bounded local JSON, providerCalled=false |
| Generated JSON schema checks | PASS: actual model summary and Motion Project IR validated with JSON Schema |
| Skill quick validation | PASS: repository skill and installed user skill in `.codex/skills/agent-build-scroll` |
| `git diff --check` | PASS |

The original 25 security tests cover consent, expiry/revocation, mutated scopes, exact paths, traversal/UNC/URL/NTFS, symbolic links/junctions/hardlinks, path replacement, binary/oversized files, state guards, redaction, malicious imports, SARIF validation, missing/stale coverage, deleted files, different roots and non-execution of target scripts. Four new tests cover approved-filename onboarding and bounded model summaries, including hostile report text/rule names, removal of paths, recomputed priorities and invalid consent/report rejection.

Local runtime: Node 26.12.1; minimum supported is Node 22. Linux/Node 22 is checked by `.github/workflows/node-v01-check.yml` on the unified branch; the actual remote run is recorded in [RELEASE.md](RELEASE.md). macOS is untested. No retained Python audit CLI is advertised as part of the verified runtime.

## Browser acceptance

**80/80 PASS** in Chromium on both the development page and the production static export under the exact Pages prefix. `scripts/ui-acceptance.js` exercises EN and PL:

- Server-rendered document language, single main headline, report tabs and keyboard arrows, evidence disclosure and retest.
- Onboarding with local-repo and lab-planning branches; the plan reflects choices and keeps active tests on the roadmap.
- Full guided audit, required scope consent, blocked `../private/.env`, evidence-first progression, confirmed fix, incomplete data and reset.
- Clipboard commands/prompts for Codex, Claude and experimental Hermes; installation keyboard Home key.
- FAQ keyboard interaction, section anchors, actual unified repository URLs.
- Reflow at 1440, 768, 390 and 320 px; mobile menu keyboard, Escape/focus restoration and close-after-navigation.
- Dynamic reduced motion, cursor/video pause and resume, pointer-transparent overlay, EN/PL navigation and readable no-JS content.
- Zero uncaught browser/hydration errors and zero failing same-origin asset requests in the passing run.

Actual desktop/mobile/Polish screenshots, incomplete-retest states, defense overview and a motion recording were captured in local `output/playwright/` (ignored by Git) and visually inspected. Opaque contrast samples: body text 8.538:1, primary-button text 10.624:1 and installation note text 6.705:1. These samples and keyboard tests are not a full WCAG audit.

The hero media was verified with ffprobe: silent H.264, 1600×800, 30 fps, 8 seconds, approximately 451 kB; WebP poster approximately 48 kB. A still was generated and then animated locally; no generative video model was claimed. Cursor frame/label behavior was reviewed from the real browser output. Mobile uses one cursor/no content translation; coarse pointers use the static hero poster. Physical phones, Safari, Firefox, battery use and sustained GPU/frame-rate benchmarks are untested.

An initial local `serve` attempt treated the dotted preview directory as a file/listing instead of serving its index. It did not reveal an application error. The reproducible loopback-only static server below fixes preview routing; the complete 80-check production run then passed.

```powershell
$env:SITE_BASE_PATH='/cyber-defense-agent/compare/node-v0.1'
$env:NEXT_PUBLIC_SITE_URL='https://aievolutionpl.github.io/cyber-defense-agent/compare/node-v0.1/'
npm run build
node scripts/preview.mjs --port 3112 --base-path /cyber-defense-agent/compare/node-v0.1
# In another terminal:
npx --yes --package @playwright/cli playwright-cli --session cda-premium open http://127.0.0.1:3112/cyber-defense-agent/compare/node-v0.1/
npx --yes --package @playwright/cli playwright-cli --session cda-premium --raw run-code --filename scripts/ui-acceptance.js
```

## Host/model integrations

| Environment | Status | Evidence/limit |
|---|---|---|
| Codex defense entry | Static contract PASS; model session **unverified** | Earlier Codex CLI 0.163.0 attempt failed to launch its shell: `registered Core launch requires an installed app`. The full revised skill was not run end-to-end in that host. |
| Claude Code defense entry | Static contract PASS; model session **unverified** | Earlier Claude Code 2.1.314 attempt returned HTTP 429 `usage_limit_reached`. No successful revised-skill model session is claimed. |
| Hermes defense entry | **Experimental / unverified** | Thin canonical pointer only. Automatic discovery/installation behavior and model session not tested. |
| Agent-build-scroll | Implemented and browser-tested | Repo entry points validated; user skill installed locally. Discovery in a future host session may need a reload. |
| CLI, imports, onboarding and summary | Verified deterministically | These passing checks do not establish host/model integration success. |
| Sigma/YARA, LiteLLM/Ollama, MCP, SIEM/EDR, incident memory, IOC enrichment | **Not integrated** | Researched architecture candidates only; no provider/scanner installs or calls. |

Prior local host-attempt evidence remains in `output/integrations/`. Repeating a blocked or quota-limited model call was not necessary to validate these deterministic changes. [Architecture](ARCHITECTURE.md) makes the authority, privacy and implementation boundaries explicit.

## Public release

Current public URLs, unique-link HTTP checks, remote CI and public-browser results are recorded in [RELEASE.md](RELEASE.md) after deployment. Historical Node-only branch checks remain historical; they are not substituted for unified-release results.

Observed unified release: Node 22/Linux CI **success**, Pages build **success**, public EN/PL acceptance **80/80 PASS**, console 0 errors/warnings and 10/10 unique GitHub destination checks HTTP 200. Source: `ddae6c4`; artifact: `a7aa35d`. The public-browser run used the same committed acceptance script as the production export.

## Website storytelling update (10 November 2026)

Adds a bilingual skill explanation, an original CSS/vector architecture illustration, three selectable synthetic task examples, outcome-led hero copy and petrol/ice/mint/amber surfaces. Existing installation, demo, reports, policy links and routes are preserved. No dependencies, telemetry, scanner calls or model integrations were added.

The new illustration is static without JavaScript. Its decorative flow and orbit run only when the global motion controller is running, reduced motion is off, the illustration is in view and the document is visible. Native radios provide keyboard selection and the result is a polite live region.

Observed: current public desktop presentation inspected in Chromium; local ESLint, TypeScript and static export passed. The cloud browser could not reach the local export (connection refused). New desktop/mobile screenshots, 320/390/768/1440 reflow, clipboard, interactive keyboard and reduced-motion acceptance remain pending. Source-level motion guards are not browser-test evidence. This source change is a review candidate, not an observed Pages deployment.
