<p align="center">
  <img src="docs/assets/product-preview.png" alt="Cyber Defense Agent — emerald hero with original 3D illustration and a four-stage defensive workflow" width="100%" />
</p>

<h1 align="center">Cyber Defense Agent</h1>
<p align="center"><strong>Turn your AI agent into a defensive security expert.</strong><br/>Your PC, your website, your code, your database, your network. Find the risk. Understand it. Verify the fix.</p>

<p align="center">
  <a href="https://aievolutionpl.github.io/cyber-defense-agent/"><img src="docs/assets/explore.svg" alt="Explore the interactive presentation — open the website and try the demo" width="640" /></a>
</p>
<p align="center">
  <a href="#start-in-one-minute">Quick start</a> ·
  <a href="examples/sample-audit.md">Example audit</a> ·
  <a href="skills/cyber-defense/SKILL.md">Read the skill</a> ·
  <a href="docs/VERIFICATION.md">Verification</a> ·
  <a href="https://aievolutionpl.github.io/cyber-defense-agent/pl/">Polski</a>
</p>

One inspectable skill for **Codex**, **Claude Code** and other skill-aware agents, backed by local Node tools and nine expert playbooks. Your agent learns to check what is installed on a computer and which of it has known vulnerabilities, review a website's security posture, find vulnerable dependencies and risky code, assess a database and a home or office network, and guide first response when something looks wrong. It asks before every step, explains findings in plain language, and proves each fix. The website includes a guided, static-data presentation; it does not scan your machine.

> **For experienced AI-agent operators.** Use only resources you are authorized to assess. You control host permissions, data disclosure and applied changes. Provided as is, without warranty; not a security certification or a replacement for professional judgment. Read [responsible use](docs/RESPONSIBLE_USE.md) and [privacy & cookies](PRIVACY.md).

## What your agent can do with it

| You say | The agent does | Evidence |
|---|---|---|
| "Check my computer - what should I update?" | Lists installed software and listening ports, checks known vulnerabilities and exploited-in-the-wild flaws, researches the riskiest desktop apps, builds an ordered update plan | `inventory` -> `advisories` -> report with P0-P3 and fixed versions |
| "Is my website OK?" | Passive check of HTTPS, HSTS, CSP, cookies, CORS, disclosure and certificate; then the code behind it | `web` report with plain-language fixes |
| "Review my project before release" | Vulnerable dependencies from the lockfile, secrets, risky configuration, triage of Semgrep/Trivy/Gitleaks output, optional deep code review | `deps`, `review`, `import`, `retest` |
| "Check my database" | Exposure, logins, privileges, row-level security (Supabase/Firebase), backups - with read-only queries | playbook-guided, read-only |
| "Check my network" | What this machine exposes, router and Wi-Fi checklist, device review | `inventory` listeners + guided checklist |
| "I think I've been hacked" | Containment steps in the right order, evidence to keep, who to call | incident first-response playbook |

**Every audit ends with a report you can hand to someone.** A dark, visual HTML and PDF report with the verdict, a priority chart, the three things to start with, every finding with impact, evidence, fix and verification, plus ideas worth improving. A live dashboard rebuilds itself while the agent works. [Sample PDF](examples/sample-audit-report.pdf) · [Polish sample](examples/sample-audit-report-pl.pdf)

```sh
node tools/cda.mjs report --name audit-report --from deps-vulns --from site --from expert --lang pl   # HTML + PDF
open .cda/reports/dashboard.html                                                              # live dashboard
```

Every step sits on a **consent ladder**: reading files, looking at the machine, sending package names to a vulnerability database and contacting a website each need your explicit yes. The agent never exploits, never tests what you do not own and never changes anything for you. [What v0.2 adds and where its boundaries are](docs/EXPERT_CAPABILITIES.md) · [knowledge base](skills/cyber-defense/references/knowledge/).

```sh
node tools/cda.mjs inventory --name pc --yes                                   # read-only, nothing leaves the machine
node tools/cda.mjs advisories --inventory pc --name pc-vulns --share-package-names   # names + versions -> OSV.dev
node tools/cda.mjs web --url https://your-site.example --name site --authorized      # a few passive GET requests
```

## How it works

![Scope approval, local review or import, redacted evidence, human remediation review, and three honest retest outcomes](docs/assets/workflow.svg)

1. **Orient:** a staged conversation establishes the goal, experience, desired outcome and data boundaries.
2. **Authorize:** approve the canonical root and exact files. No target content is read during the proposal.
3. **Inspect:** run four local rules or import supported JSON/SARIF. Review a Markdown report with location, redacted evidence, priority, confidence and suggested remediation.
4. **Decide:** assess the suggested fix in your normal development process. The tools do not change the target.
5. **Verify:** repeat the check. A confirmed fix needs fresh local evidence; missing data remains inconclusive.

The skill is the workflow; the CLI enforces file access and validates reports; the human controls permissions and changes. [Architecture and trust boundaries](docs/ARCHITECTURE.md).

## See it before you run it

[![AI cursors assembling a security workflow: dependency, configuration and update planning](docs/assets/protection-preview.png)](https://aievolutionpl.github.io/cyber-defense-agent/#protection)

The animated hero illustrates **inspect → find → human-reviewed fix → verify** using original graphite/emerald artwork. Its infrastructure map is conceptual: live network scanning remains on the roadmap. [Artwork and motion implementation](docs/EMERALD_HERO.md).

The [interactive presentation](https://aievolutionpl.github.io/cyber-defense-agent/) walks through one synthetic dependency finding, the blocked out-of-scope action, its remediation and a retest. English by default, Polish available, with keyboard navigation, reduced motion and an optional agent-cursor build effect. Website buttons never grant access to your local files.

## Start in one minute

**Node.js 22+ and Git.** The local CLI has no npm dependencies. No provider account or paid model call is needed for the demo.

```sh
git clone --branch codex/node-v0.1 https://github.com/aievolutionpl/cyber-defense-agent.git
cd cyber-defense-agent
node tools/demo.mjs
```

For a guided terminal introduction:

```sh
node tools/cda.mjs start
```

```text
+-----------------------------------------+
| CYBER DEFENSE AGENT / OPERATOR INTAKE    |
| Consent first. Read-only. Evidence.     |
+-----------------------------------------+
01 / YOUR WORKSPACE  → experience & authorization
02 / YOUR GOAL       → files, report, lab, this machine or a website
03 / YOUR OUTCOME    → review, prioritise or retest
04 / YOUR DATA       → local-only or ask before sharing
                       ↓
                A concrete next-step plan
```

The intake does not save answers, approve a scope, read a target or call a model. Type `q` to leave. In a noninteractive host, the skill conducts the same staged conversation directly.

## Platform and host support

| Environment | What is supported | Evidence |
|---|---|---|
| Windows / PowerShell | Node CLI, synthetic demo and static-site build | Local checks plus the CI matrix |
| Linux | Same Node CLI and site | Ubuntu Node 22 CI |
| macOS | Same Node CLI and site | macOS Node 22 CI; see latest run below |
| Codex | Thin skill entry → shared instructions | Contract verified; full model session **unverified** |
| Claude Code | Thin skill entry → shared instructions | Contract verified; full model session **unverified** |
| Hermes | Experimental thin entry | Discovery and full session **unverified** |

[Latest platform checks](https://github.com/aievolutionpl/cyber-defense-agent/actions/workflows/node-v01-check.yml) · [Exact results and limitations](docs/VERIFICATION.md). A passing local tool test is not proof of an authenticated model-host session. Node commands work in PowerShell, Bash and zsh; quote absolute paths containing spaces. OS isolation and permission configuration belong to your host and operating system.

## Keep maintenance in the loop

Review an operator-supplied Windows, Linux or macOS update inventory with `node tools/cda.mjs updates`. Get a local Markdown plan with priorities, stale/unknown data, backup, rollback and health checks. This is **offline inventory review**, not a live OS scan or an automatic installer. [Format, commands and boundaries](docs/UPDATE_PLANNING.md).

## Choose your host

The `.agents/skills` entry is compatible with the documented skill format in Codex, Cursor and Google Antigravity. Claude Code has its own thin entry into the same canonical instructions. Lovable documents importing Markdown skills, but our local CLI is not established there; use planning guidance or a separate local host. Hermes remains experimental. All end-to-end model sessions are still unverified. [Exact host matrix and official sources](docs/HOST_COMPATIBILITY.md).

## What works

- Nine expert playbooks: triage, software vulnerabilities, endpoint hardening, web applications, code review, databases, network, incident first response and sources.
- Machine inventory (Windows, macOS, Linux) through fixed read-only OS queries, and dependency inventories from npm, PyPI, Cargo, Go, Composer and RubyGems lockfiles.
- Known-vulnerability lookup against OSV.dev with CISA KEV, CVSS v3 scoring, merged aliases, fixed versions and an explicit not-checked list.
- Visual deliverables: `finding` (agent-recorded expert findings and ideas), `report` (dark HTML + PDF) and a self-refreshing `dashboard`. PDF needs a locally installed Edge, Chrome, Chromium or Brave; otherwise print the HTML.
- Passive website posture check: HTTPS, HSTS, CSP, framing, cookies, CORS, disclosure, TLS certificate.
- Exact file allowlist, separate approval, 24-hour expiry and revocation.
- Canonical directory and file/link guards; no project code execution or dependency installation. Network use only in `advisories` and `web`, each behind an explicit flag.
- Four small local rules: pinned affected lodash, disabled TLS verification, possible quoted secrets and `eval`. This is not a full SAST engine or live advisory feed.
- `cda.scan.v1` JSON and a bounded subset of SARIF 2.1.0; validated local locations, deduplication and no imported free-form instructions in generated reports.
- Markdown findings with location, redacted evidence, priority, confidence and suggested fix.
- Conservative `confirmed_fixed`, `still_present`, `insufficient_data` retest results. Missing imported findings are not proof of a fix.
- Filename-based onboarding from the approved file list and a bounded, data-only `cda.model-input.v1` summary (no model API).
- Dark EN/PL site with synthetic report, defense overview, onboarding, full audit demo and an original reusable agent-cursor scroll effect.

Exploitation, crawling or authenticated web scans, port scanning, IOC enrichment, model routing, MCP connectors, incident graphs and automatic response are [planned or out of scope](docs/ROADMAP.md), not shipped capabilities. The current [architecture](docs/ARCHITECTURE.md) separates working controls from future adapters.

## Inspect the demo outputs

The demo copies known synthetic files into a new temporary directory. It changes only that copy, never executes fixture code and writes:

- `.cda/reports/demo-before.md`: lodash 4.17.20, `CDA-DEP-001`.
- `.cda/reports/demo-import.md`: safe metadata from a SARIF fixture.
- `.cda/reports/demo-retest.md`: live local-rule confirmation after changing the copy to 4.17.21.
- `.cda/reports/demo-no-data.md`: incomplete import → `insufficient_data`.

An attempted `../private/.env` read is blocked. The synthetic scratch directory stays available for inspection. Local reports/state are excluded from Git.

```sh
node tools/cda.mjs onboarding --scope demo
node tools/cda.mjs summary --scope demo --report demo-before --name model-summary
```

The summary writes local JSON; it sends nothing to a model. Review it before sharing. Opaque references need the original report locally.

## Codex

Install and sign in using the [official quickstart](https://developers.openai.com/codex/quickstart). Open the cloned trusted repository in the Codex app, or from its root run:

```sh
codex
```

Then ask:

```text
$cyber-defense demo
```

[Entry point](.agents/skills/cyber-defense/SKILL.md) → [canonical instruction](skills/cyber-defense/SKILL.md). No global defense-skill installation is needed. Invoke it explicitly for an audit. The local tools are verified separately from the host/model session; see [verification](docs/VERIFICATION.md).

## Claude Code

Install and authenticate using the [official quickstart](https://code.claude.com/docs/en/quickstart). From the trusted repository root run:

```sh
claude
```

Then ask:

```text
/cyber-defense demo
```

[Entry point](.claude/skills/cyber-defense/SKILL.md) loads the same canonical instruction. Model access is your separate provider service. An end-to-end authenticated model session is not established by a passing CLI test.

For your next conversation, use the [copy-ready prompts](skills/cyber-defense/references/prompt-recipes.md): check my computer, check my website, review my project, check my database, check my network, something is wrong, verify a fix. The agent asks only what is missing, explains the next step and waits at real scope and data-sharing boundaries.

## Hermes (experimental)

[The thin Hermes entry](.hermes/skills/cyber-defense/SKILL.md) points to the same instruction. Automatic skill discovery, its installation path and an end-to-end model session are **unverified**. Open this trusted repository in your configured Hermes environment and explicitly ask it to read `skills/cyber-defense/SKILL.md` and follow only the bundled demo. No guessed installation command or automatic network action is provided.

## Your first own audit

Keep the trusted agent tools **outside** the reviewed project. Use a stable copy of the target. Specify exact relative files that you are authorized to inspect; the tool does not enumerate a target to guess its scope.

```sh
node tools/cda.mjs scope --root /path/to/project --allow package.json --allow src/config.ts --name audit
```

Review the canonical root and returned file list. Only after explicit approval of that exact proposal:

```sh
node tools/cda.mjs approve --scope audit --root /path/to/project --yes
node tools/cda.mjs show --scope audit
node tools/cda.mjs onboarding --scope audit
node tools/cda.mjs review --scope audit --name before
node tools/cda.mjs summary --scope audit --report before --name model-summary
```

Review `.cda/reports/before.md` and any summary locally before sharing with a model. Remediate in your normal workflow, then:

```sh
node tools/cda.mjs review --scope audit --name after
node tools/cda.mjs retest --scope audit --before before --after after --name retest
node tools/cda.mjs revoke --scope audit
```

For imports, approve the report itself and each referenced local source file. Example using synthetic files:

```sh
node tools/cda.mjs scope --root examples/demo-repo --allow package.json --allow reports/before.sarif --name imported
node tools/cda.mjs approve --scope imported --root examples/demo-repo --yes
node tools/cda.mjs import --scope imported --input reports/before.sarif --name imported-before
```

A denied read or unsupported format does not authorize another reader or an expanded scope. [Supported formats](docs/FORMATS.md).

## Data flow and limits

| Layer | Data processed | Provider/network exposure |
|---|---|---|
| Local CLI (files) | Approved files and private `.cda/` state | No network, LLM SDK or telemetry |
| `inventory` | Installed package names, versions, listening port numbers | None; no hostname, user or path recorded |
| `advisories` | Package names, versions, ecosystem labels | Sent to api.osv.dev; public KEV list downloaded from cisa.gov |
| `web` | Response headers, cookie flags, TLS details of the site you name | A few GET requests to that site; bodies and cookie values not stored |
| Importer | JSON/SARIF and scoped locations | Does not fetch URLs; omits imported free text, snippets and fixes |
| Model summary | Up to 100 facts, validated enums, opaque file/rule references | Local JSON only; no provider call |
| Codex / Claude / Hermes host | Prompt, tool output and content included in chat | May reach the host's model provider according to its settings |
| Public site | Static assets and synthetic interaction state | Hosting receives page requests; no code/domain uploads, analytics or model connection |

Redaction is heuristic and cannot detect every secret. Filenames can be sensitive. Instructions and tags do not provide OS isolation or guaranteed prompt-injection prevention. For hostile targets use independent OS-level containment. [Threat model](docs/THREAT_MODEL.md).

## Reuse the agent-build effect

The separate [agent-build-scroll skill](skills/agent-build-scroll/SKILL.md) ships original React/CSS assets and repo entry points for Codex and Claude. Invoke `$agent-build-scroll` or `/agent-build-scroll` to add staged cursor choreography to another page. Copy the skill folder to your host's documented user-skill location if needed. It has no browser-extension or paid service dependency. Reduced motion, pause, touch mode and a readable no-JS fallback are part of its contract.

`DhvanilPatel/swarm-cursors` is an inspiration link only. Its code was not copied. [Asset/motion provenance](motion/README.md).

## Develop the site

```sh
npm ci
npm run dev
# http://localhost:3107
npm run check
npm run demo
```

Next.js 16 / React / TypeScript / Tailwind 4. Static routes: `/` (English) and `/pl/` (Polish), each with a matching document language. `SITE_BASE_PATH` and `NEXT_PUBLIC_SITE_URL` configure static hosting; `npm run build` exports to `apps/site/out/`. All repository links derive from `apps/site/lib/config.ts`.

Browser acceptance uses `scripts/ui-acceptance.js` with the existing Playwright CLI. See exact commands and results in [VERIFICATION.md](docs/VERIFICATION.md). A desktop viewport is not a physical phone test.

```text
apps/site/                      EN/PL site, static interactive demos
skills/cyber-defense/           canonical defense workflow + expert knowledge base
skills/agent-build-scroll/      reusable original motion workflow + assets
.agents/ .claude/ .hermes/      thin host entry points
tools/                          local Node CLI: guards, parsers, inventory, advisories, web check
schemas/                        model input contract
examples/                       synthetic source, SARIF and sample audit
tests/                          scope, import, retest and triage checks
docs/                           architecture, research, integration, verification
motion/                         direction, IR, source graphic and provenance
```

First-party code: [MIT](LICENSE). Research includes [curated external repositories](docs/RESEARCH.md) for defensive methodology and authorized labs; they are not automatically installed, executed or relicensed here.

## Trust, maintenance and contribution

All first-party tools, prompts, examples, site source and tests are public. There is no model SDK, telemetry or target-code executor in the CLI, and network use is confined to two consent-gated commands. Dependencies for the site are pinned in the lockfile. Inspect source and history; public code does not guarantee the absence of defects or supply-chain risk. [Security policy](SECURITY.md) · [Threat model](docs/THREAT_MODEL.md) · [Responsible use](docs/RESPONSIBLE_USE.md).

To contribute, use a branch and pull request, keep target reads behind `ScopedReader`, add meaningful regression tests for changed trust boundaries, and run `npm run check` plus `npm run demo`. Never attach private `.cda/` state or real secrets. Skill changes belong in the canonical folder; entry points remain thin. See [AGENTS.md](AGENTS.md) for engineering guidance and [CLAUDE.md](CLAUDE.md) for the Claude entry.

The site has no application cookies or analytics. Hosting still receives normal requests. The CLI is local; content placed in an AI-host conversation may reach that host's provider. [Privacy & cookies](PRIVACY.md).
