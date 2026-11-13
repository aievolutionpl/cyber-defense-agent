# v0.2 expert capabilities: what was added and where the boundaries are

v0.2 extends the local review of v0.1 into a defensive expert for the operator's **own** assets. It adds a knowledge base, a consent ladder and four evidence commands. Everything remains read-only: nothing is installed, changed or executed in a target, and nothing offensive is implemented.

## Knowledge base

`skills/cyber-defense/references/knowledge/` holds ten original knowledge documents: triage and severity, installed-software vulnerabilities, endpoint hardening (Windows, macOS, Linux), web applications (OWASP Top 10:2025, API and LLM risks), code review (source-to-sink, CWE patterns, supply chain), agent security (skills, MCP, permissions, memory and data boundaries), databases (PostgreSQL, Supabase/Firebase, MySQL, MongoDB, Redis), home and small-office network, incident first response, and the list of standards and open repositories they were distilled from. They are guidance for the agent; they are not executable adapters, and naming a tool in them does not install or run it.

## Consent ladder

| Level | Action | Gate |
|---|---|---|
| L0 | Advice on text the user supplies | none |
| L1 | Read project files | approved exact-file scope in the CLI, or the user's explicit opt-in to host-tool reading (labelled model judgment) |
| L2 | Read-only look at this machine | `--yes` after the user agrees |
| L3 | Outbound lookups | `--share-package-names` after the user agrees to what is sent |
| L4 | Passive contact with an asset the user owns | `--authorized` after the user confirms ownership |
| L5 | Changes | not implemented; the operator applies them |

The flags are consent records enforced in code. They are not authentication and cannot verify ownership: that remains the operator's responsibility.

## New commands

| Command | What it does | Data leaving the machine |
|---|---|---|
| `inventory --name <n> --yes` | Runs fixed, argument-only, read-only OS queries without a shell: `dpkg-query`, `rpm`, `apk`, `flatpak`, `snap`; the Windows uninstall registry via PowerShell; `system_profiler` and `brew` on macOS; and a listening-port listing (`ss`/`netstat`). Records package name, version, source and port numbers. Does not record hostname, user names, paths or process names. | none |
| `deps --scope <s> --input <lockfile> --name <n>` | Parses one approved lockfile as data: `package-lock.json`, `npm-shrinkwrap.json`, pinned `requirements*.txt`, `poetry.lock`, `uv.lock`, `Cargo.lock`, `go.sum`, `composer.lock`, `Gemfile.lock`. | none |
| `advisories --inventory <n> --name <r> --share-package-names` | Queries OSV.dev (`/v1/querybatch`, `/v1/vulns/<id>`) for packages with a supported ecosystem and downloads the CISA Known Exploited Vulnerabilities feed. Merges aliases, computes CVSS v3 base scores, lists fixed versions and assigns P0-P3. Software without a machine-readable feed is listed as **manual lookup - not checked**. | package names, versions and ecosystem labels to `api.osv.dev`; a plain download from `www.cisa.gov` |
| `web --url <u> --name <r> --authorized` | Sends up to about three GET requests (the page with a bounded redirect chain, the plain-HTTP redirect, `/.well-known/security.txt`) and one TLS handshake. Reports HTTPS, HSTS, CSP, framing, nosniff, referrer and permissions policy, cookie flags (names only), version disclosure, CORS reflection, certificate validity and protocol. | ordinary web requests to the named site (and hosts it redirects to) |

| `finding --name <n> --priority ... --area ... --title ... --fix ...` | Records one expert-review finding or improvement idea from the agent (bounded, redacted, labelled `expert review - model judgment`) so that reasoning-based results reach the report. | none |
| `report --name <n> --from <report> [...]` | Merges evidence reports into one dark, self-contained HTML report (no scripts, no external resources, strict CSP, every string escaped) and, only with the explicit `--pdf` flag, prints it to PDF with a locally installed Chromium-based browser. Without the flag or without a browser it writes HTML only and says so. A confirmed fix closes a finding only for the same root, rule and file and only when the retest is newer; an incomplete advisory lookup is shown as incomplete and never as a clear verdict. | none; the browser opens only the generated local file |
| `dashboard` | Re-renders `.cda/reports/dashboard.html` from every stored report. Also runs automatically after each evidence command; the page refreshes itself every five seconds. | none |

Outbound evidence requests use the hosts above for `advisories` and the operator-authorized site for `web`. The operator panel listens on loopback. An explicit agent-session launch starts the selected installed CLI, whose provider settings govern its model access and data handling.

PDF printing starts a child process, so it has its own consent flag (`report --pdf`, `demo.mjs --pdf`): the first existing browser from a fixed path list (or `CDA_BROWSER`), with fixed headless arguments and the `file://` URL of the report this tool just wrote. On Linux as root it adds `--no-sandbox`, which is acceptable only because the page is our own script-free HTML. The verdict line in the report ("Act today", "Needs attention", "Routine", "No findings in the checked scope") is derived from priority counts; it is a reading aid, not a score or a certification.

## What these results do and do not prove

- A version match is evidence that a published affected range contains the installed version string. It does not establish reachability or exploitability. Distributions backport fixes.
- No match is not evidence of safety. Desktop applications on Windows and macOS generally have no feed and are **not checked** automatically; the agent researches the riskiest ones with the lookup protocol and cites sources.
- The website check is passive and covers response headers, cookies flags and TLS of one URL. It cannot see injection, access-control or logic flaws, or anything behind a login.
- Listening ports are questions, not findings of compromise.
- Findings from host-tool reading are model judgment and must be labelled as such.

## Not implemented

Exploitation, credential testing, crawling or authenticated web scans, port or network scanning, automatic remediation, package installation, live Windows Update / winget / Homebrew catalogue queries, SIEM/EDR connectors, and anything directed at assets the operator does not own.

## Verification status

Unit tests cover consent gates, parsers, host allowlisting, alias merging, CVSS scoring, redirect bounds and that secrets (cookie values, query strings, response bodies) never enter reports - all with injected command runners and network doubles. See [VERIFICATION.md](VERIFICATION.md) for what was and was not exercised against live services.

## Scanner and CI evidence update

The CLI now imports native Gitleaks, Trivy and OSV-Scanner JSON within the existing approved file scope. It compares stored snapshots and exports bounded SARIF locally. Project dashboards show current retest state and label returning findings. These commands make no outbound requests and start no scanners.

The separate PR runner uses an explicitly authorized base-branch policy to read two checkouts and writes JSON, Markdown, HTML and SARIF. The shipped GitHub workflow installs Node and checks out repository content using pinned actions. It publishes an Actions summary, uses read-only contents permission and runs no candidate scripts. See [formats, coverage and limits](SCANNER_INTEGRATIONS.md).

## Local operator panel and guided audits

`node tools/cda.mjs ui --lang pl` opens the local panel on `127.0.0.1:3109`. It checks the actual listener port in Host, Origin and Referer headers. POST actions require the session token. Reports, prompts, sessions and run state use guarded local paths. Session and run JSON use the same atomic state store as evidence reports. Linked state files and directories are rejected.

A project audit requires an explicit list of relative files. The panel displays the CLI's canonical root and complete proposed list before approval. The approval passes the proposal digest to the CLI. Replacing a proposal invalidates that approval. A computer audit first inventories locally, then asks separately before sharing package names and versions with OSV.dev and downloading CISA KEV.

Each run has its own report names and step history. Cancellation is retained when child processes close. Resume waits for the previous attempt to settle and continues from the first unfinished step. Each local evidence step has a five-minute timeout and a two-megabyte combined output limit. Existing interrupted computer audits retain the separate data-sharing gate when resumed.

The Windows catalog supplies official vendor download URLs and winget identifiers. Registry entries remain in manual lookup until supported advisory evidence is available. Inventory counts distinguish packages eligible for OSV lookup from completed vulnerability checks. Legacy reports based on fixed catalog thresholds contribute an incomplete-coverage warning.

Agent sessions submit one prompt using Claude Code print mode or `codex exec`. The panel shows redacted process output, authentication diagnostics and cancellation. Secret redaction is applied to the accumulated stream before the display limit. It remains heuristic. Detection and invocation share the resolved executable path. Supported npm Windows shims run through Node with literal argument arrays. Copyable PowerShell commands preserve the skill prefix and embedded quotes. Interactive follow-up uses the operator's host chat or terminal.

## Agent review and website planner

The agent-security playbook adds a read-only review route for AI applications, skills and MCP configuration, informed by OWASP Agentic 2026, ASVS 5.0.0 and the MCP security documentation checked on 13 November 2026. It is expert guidance, not a new scanner or connector. Existing local agent rules remain bounded pattern checks. No network destination, OS collector, dependency or implicit permission was added.

The website's seven-scenario planner generates a localized brief for Codex or Claude Code, with expected evidence and explicit limits. It runs entirely in the browser without target inputs, persistence or audit requests; copying a brief does not grant consent. The evidence-review method adds coverage, counter-evidence and decision framing to the skill. Host/model behavioral acceptance remains separate from document and browser validation.
