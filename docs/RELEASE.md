# Unified product release

## Emerald illustrated hero — 9 November 2026

- [PR #6](https://github.com/aievolutionpl/cyber-defense-agent/pull/6) merged the graphite/emerald presentation, original generated artwork, four-stage hero and relocated report. Source merge: `9e9c2ab44c3ce97788cabf98728234d468e6d3e9`.
- [Node 22 CI 42711732123](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42711732123): Windows, Ubuntu and macOS **success**, including 38 tests, skill contracts, lint, TypeScript, build and synthetic CLI demo.
- Pages artifact: `c6eaae85c08ca3e3d2072930717bb080f4d27fcf`; [deployment 42712068730](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42712068730) **success**. Canonical EN/PL URLs and previous comparison redirects remain intact.
- Public Chromium acceptance: **114/114** page checks, **18/18** new hero checks and **10/10** cursor checks. No uncaught browser errors or failed same-origin assets. The production site was inspected at desktop/mobile sizes; keyboard, reduced motion, manual stages, replay, offscreen pause and image loading passed.
- **12/12** unique page GitHub destinations returned HTTP 200. **54** README/docs relative references resolved locally. Artwork/provenance is public in [EMERALD_HERO.md](EMERALD_HERO.md).
- A formatter added a trailing semicolon to the browser callback file, which the Playwright CLI expression runner rejected. The callback's trailing semicolon was removed, then all 18 hero checks passed on the public release. No website-runtime change was needed.

Local evidence: `output/release/emerald-public-{ui,hero,cursors}.json`, `emerald-links.json`, desktop/mobile/stage screenshots and a real browser recording in `output/playwright/`. The WebP delivery asset is about 57 KB; no real-time 3D engine, remote model call or video player is needed. The infrastructure picture is conceptual: v0.1 reads approved local files, network scanning remains roadmap work, and remediation remains human-controlled. Full model-host sessions and physical-device performance remain unverified.

## Command-center iteration — 9 November 2026

Published and checked:

- [PR #4](https://github.com/aievolutionpl/cyber-defense-agent/pull/4) merged into the default source branch; merge commit `99bf974260390967b148c6658c7f943bd3ea351c`.
- [Node 22 CI run 42706796021](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42706796021): Windows, Ubuntu and macOS **success**; each ran **38 tests, 38 passed, zero skipped**, plus skills/lint/typecheck/build/demo checks.
- Pages artifact `55f45411b454e3e2763bfd45842b6a8f519f5e1a`; [deployment 42707107861](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42707107861) **success**.
- Public canonical EN/PL: **114/114 Chromium checks pass**, no uncaught browser errors or failed same-origin requests. An initial harness assertion raced the public policy-return navigation; the test now awaits the landing URL and visible hero before asserting. No runtime change was needed.
- **12/12** unique GitHub destinations returned HTTP 200; **58** relative documentation references resolve. All four README graphics returned HTTP 200 and match the committed assets (SVG comparison normalizes Git line endings).
- Previous comparison redirects and artifact history are preserved. Full model-host sessions and live OS update collection remain unverified/unimplemented as documented.

Evidence: local `output/release/command-center-public.json`, `command-center-github-links.json`, `command-center-readme-assets.json`, screenshots and motion recording. Reproducible checks are in `scripts/ui-acceptance.js` and `scripts/motion-acceptance.js`.

Review branch: `codex/defense-command-center`, targeting `codex/node-v0.1`. This iteration adds the navy command-center presentation, randomized cursor construction, six-host compatibility strip and scoped offline update-inventory planning. Local verification: 38 tests, 114 browser checks, 10 motion checks, build/lint/typecheck/skills and demo pass. Canonical EN/PL URLs remain unchanged. Remote evidence is recorded above; older deployments below refer to the previous release.

The release consolidates the skill, Node tools, English-first EN/PL site, terminal intake, public policies and illustrated README into the existing default source branch `codex/node-v0.1`, through a reviewed pull request from `codex/premium-unified`. GitHub merge is explicitly authorized by the owner for this iteration. No original blocked historical parent is reintroduced.

Canonical presentation: https://aievolutionpl.github.io/cyber-defense-agent/ (English), with `/pl/` for Polish and `/policies/` for privacy and responsible use. The old comparison landing URLs redirect to the canonical presentation. The static artifact remains on `codex/node-v01-preview`; source and artifacts remain in the same repository.

Current verification and remaining host-model limitations: [VERIFICATION.md](VERIFICATION.md). ## Observed final outcome — 9 November 2026

- [PR #2](https://github.com/aievolutionpl/cyber-defense-agent/pull/2) **merged** into the default branch `codex/node-v0.1` at 21:13:42 UTC. Merge commit: `a7faf6591a47fd807438f51ac1afb05d9c1bc294`.
- Final source head before merge: `9a3e2f44c58a53bbaddfe9741c30e2af95fe7f7a`. Both [PR matrix 42700193596](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42700193596) and [push matrix 42700185284](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42700185284) passed Windows, Ubuntu and macOS. Each ran all 33 tests with zero skipped, plus lint, types, build, demo, onboarding and summary.
- Pages artifact: `7cefeae` on `codex/node-v01-preview`. [Deployment 42700510683](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42700510683) completed **success**.
- Canonical public EN/PL static pages: **106/106 Chromium acceptance checks passed**; zero uncaught errors or failed same-origin assets. Policies, clipboard, demo, keyboard, reduced motion and 320–1440 px behavior included.
- Both previous comparison landing URLs redirect to the appropriate canonical language page. GitHub repository homepage metadata points to the new presentation.
- All four README graphics loaded on the actual default-branch GitHub page, including the large presentation button. Twelve unique repository/document destinations returned HTTP 200. Forty-one relative documentation links resolved locally.
- Source and deployment use ordinary commits and review-based merges. No force push or push-protection bypass occurred.

Local evidence: `output/release/public-acceptance-final.json`, `output/release/final-links.json`, `output/playwright/` screenshots and the reproducible `scripts/ui-acceptance.js`. CLI/host verification boundaries remain documented in VERIFICATION.md; a successful CI matrix does not establish an authenticated model session.

## Previous comparison release (historical)

### Unified premium v0.1 comparison release

Source: `codex/premium-unified`. The earlier Node-only branch remains available. AntyGravity's history and the initial merge are preserved locally on `codex/premium-unified-local-history`; the public unified branch carries the reviewed final code without the history rejected by GitHub push protection. The original AntyGravity working directory and its pre-integration snapshot were not overwritten.

- EN page: https://aievolutionpl.github.io/cyber-defense-agent/compare/node-v0.1/
- PL page: https://aievolutionpl.github.io/cyber-defense-agent/compare/node-v0.1/pl/
- Unified source: https://github.com/aievolutionpl/cyber-defense-agent/tree/codex/premium-unified
- Repository: https://github.com/aievolutionpl/cyber-defense-agent
- Pages artifact branch: `codex/node-v01-preview`, scoped to `compare/node-v0.1/`.

Local release checks: 29 unit/security tests, 80 browser checks for EN/PL under the production prefix, lint, TypeScript, build, demo, skill contracts and JSON schemas pass. `npm audit` reports zero vulnerabilities. Public deployment and remote run IDs are appended after observation; see [VERIFICATION.md](VERIFICATION.md) for the full scope and host/model limits.

## Observed public outcome

Published successfully on 2026-11-09:

- Reviewed source tree: `ddae6c4efa1a63e4637e4f76e6e861de7abe4d8e`.
- Node 22 / Linux CI: [42695577415](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42695577415), completed **success** (`npm ci`, checks, demo, onboarding and model summary).
- Pages artifact commit: `a7aa35d3c66ede1f4938facfb9a4fcc1ab580069`.
- Pages build/deployment: [42695744477](https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42695744477), completed **success**.
- Public EN and PL pages: HTTP 200; English is the default document.
- Public Chromium acceptance: **80/80 PASS**, zero uncaught/hydration errors, zero failed same-origin assets; console zero errors/warnings.
- Unique GitHub destinations (anchors deduplicated): **10/10 HTTP 200**. All visible repo buttons and copied clone commands target the actual unified branch.

Local evidence: `output/playwright/public-acceptance.json`, `production-acceptance.json`, `github-links.json`, screenshots and motion recording. The source tree contains the reproducible browser procedure; private local evidence/state is not published.

The existing public comparison URL is upgraded in place as requested; this does not overwrite a `main` branch or create an unreviewed root-site rollout. All page GitHub buttons point to the actual unified source branch. Both code and artifact changes use ordinary commits, with no force push.

## Rebuild

```powershell
$env:SITE_BASE_PATH='/cyber-defense-agent/compare/node-v0.1'
$env:NEXT_PUBLIC_SITE_URL='https://aievolutionpl.github.io/cyber-defense-agent/compare/node-v0.1/'
npm ci
npm run build
```

Copy `apps/site/out/` into the Pages artifact's `compare/node-v0.1/`, preserving all other paths and `.nojekyll`. Do not publish `.cda`, private scope files, secrets or local logs. Font license notices are included in `THIRD_PARTY_LICENSES.txt`. For `/` local development, omit the two deployment variables and use `npm run dev`.

No Vercel account/DNS changes or paid hosting resources are required. No model session, network scanner, IOC reputation service or active containment capability is implied by a successful website deployment.
