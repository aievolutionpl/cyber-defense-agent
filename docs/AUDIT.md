# Product audit — v0.3 "program mode"

Date: 18 November 2026. Scope: CLI (`tools/`), local panel (`tools/ui.mjs`), agent bridge, website (`apps/site`), documentation. Method: code reading, the full test suite, the synthetic demo, a live `claude -p` round trip with synthetic data, and Playwright checks of the panel and the static site export.

## Fixed in this release

| # | Area | Finding | Fix |
|---|---|---|---|
| 1 | Model connection | The agent could only be driven *by* a host; there was no way to plug in a Claude/ChatGPT subscription, an OpenRouter key or a local model and use the tool as a program. | New `tools/providers.mjs` (6 providers), commands `doctor`, `providers`, `connect`, `explain`, `ask`, `chat`, and panel card 04. One consent-gated exit point, bounded redacted brief, no tools for the model. See [MODEL_PROVIDERS.md](MODEL_PROVIDERS.md). |
| 2 | Agent bridge | `launch-agent` ran `codex "<prompt>"` with stdin ignored. That form opens Codex's interactive TUI, which needs a terminal, so background sessions could not complete. | Non-interactive `codex exec --skip-git-repo-check <prompt>`; model calls use `codex exec --sandbox read-only`. |
| 3 | Local panel security | Run titles (containing operator-typed URLs/paths), CLI error text and executable paths were inserted with `innerHTML` unescaped. The page holds the session token that can start agents, so injected markup could act with that token. | `esc()` applied to every dynamic value in the panel; new provider grid built escaped. |
| 4 | Website motion | The cursor choreography had been reduced to a simplified version: desktop ≥1000 px only, only three below-fold sections, no hero, no construction frame, no Bézier paths. The 18 `data-agent-target` markers on the page were unused. | Restored the full `agent-build-scroll` choreography (frame, blueprint lines, three independent cursors on randomized Bézier paths, single cursor on touch/narrow screens, focus/resize/reduced-motion cancellation). The lead cursor now takes the section's role name. Header pause button still controls it. |
| 5 | Truthfulness | `CLAUDE.md`, `AGENTS.md`, `PRIVACY.md` and `EXPERT_CAPABILITIES.md` said no command calls a model; the site said 72 tests. | Updated to describe the optional model connection precisely; test count updated. |
| 6 | Onboarding | No single command told a new user what works on their machine. | `doctor`: Node, Git, PDF browser, `.cda` ignore rule, skill entry points, CLIs and keys — local only. |

## Verified

- `npm test`: all unit tests pass, including 19 new provider tests (consent, missing key, URL/headers per provider, refusal mapping, key never echoed in errors, CLI sandbox + fixed args, Codex read-only exec, brief redaction, output sanitising, credentials outside the repo with 0600, doctor, panel consent).
- `node tools/demo.mjs`, then `explain --dry-run` and a live `explain --send-summary` through the logged-in Claude Code CLI on synthetic demo data: a Polish plain-language plan was written to `.cda/reports/` labelled model judgment.
- Panel: Playwright at 1440 px, no console errors, six provider cards render.
- Site: static export, Playwright at 1440 px (three cursors active on load, distinct routes, frame tracks sections, pause sets `data-motion=paused`) and 390 px touch (one cursor, no horizontal overflow).

## Recommended next steps (not done here)

1. **Panel i18n.** The EN switch translates prompts and API output, but static labels in `ui.mjs` stay Polish. Move strings to a dictionary like `welcome.mjs`.
2. **Non-blocking bounded actions.** `runBoundedAction` uses `execFileSync` (up to 35 s) inside the HTTP handler, freezing the panel during `advisories`. Reuse the async step runner from guided audits.
3. **Split `ui.mjs`.** ~2 000 lines with inline HTML/CSS/JS. Serve the page from a static file and keep the server logic small and testable.
4. **Streaming answers.** `chat` waits for the full answer. Streaming for the HTTP providers would improve perceived speed; keep the same caps and sanitising.
5. **Unused site components.** `protection-map`, `onboarding`, `guided-demo`, `skill-blueprint`, `live-session`, `trust-section` are no longer mounted. Either reuse them or remove them in a dedicated change; `scripts/motion-acceptance.js` still targets `#protection`.
6. **Default branch.** README and `lib/config.ts` point at `codex/node-v0.1`. Once merged to the default branch, update `BRANCH` in one place.
7. **Model evals.** Add a small fixed set of briefs with expected properties (priorities preserved, no exploit content, retest step present) and run it against each provider before release.
