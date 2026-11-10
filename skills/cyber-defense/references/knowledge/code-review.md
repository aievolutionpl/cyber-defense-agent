# Code, dependencies and configuration

For a project the user is building. Combine deterministic tools (repeatable evidence) with expert reading (context the tools lack).

## Order of work

1. **Dependencies** - cheapest, highest hit rate. Scope the lockfile, then `deps` and `advisories`. Report direct dependencies first; for transitive ones name the direct parent to upgrade. No lockfile is itself a P2: builds are not reproducible.
2. **Secrets** - `review` flags obvious assignments. Also ask about: `.env` committed to Git, keys in CI logs, tokens in front-end bundles, credentials in container images and in shell history. A leaked secret is fixed by **rotating it**; deleting the line does not remove it from Git history.
3. **Existing scanner output** - if the user runs Semgrep, CodeQL, Trivy, Gitleaks, Bandit, ESLint security rules or `npm audit`, `import` the SARIF or JSON and triage instead of re-inventing checks. Suggest those tools where they are missing; do not install or run them yourself.
4. **Expert review** (opt-in lane) - read for the classes below. Start at the trust boundary: every place external input enters (HTTP handlers, webhooks, file uploads, queues, CLI args, environment, third-party API responses, LLM output) and follow it to a dangerous sink.
5. **Configuration and delivery** - Dockerfiles, compose, CI workflows, infrastructure definitions, CORS, cookies, debug flags.

## Source-to-sink method

For each entry point ask: Who can call this? What do they control? Where does that value go? What stops it? Record the path `source -> transformations -> sink` with file and line. A finding without a traceable path is medium confidence at best.

| Sink | Weakness (CWE) | Safe pattern |
|---|---|---|
| SQL built with `+`, template strings or f-strings | SQL injection (CWE-89) | parameterised queries, ORM bind parameters; allowlist identifiers |
| `exec`, `system`, `child_process.exec`, `shell=True`, backticks | command injection (CWE-78) | argument arrays without a shell; allowlist values |
| `eval`, `Function`, `pickle.loads`, `yaml.load`, Java/PHP unserialize | code execution, unsafe deserialisation (CWE-94, CWE-502) | parse data formats only (`JSON.parse`, `yaml.safe_load`) |
| `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, unescaped templates | XSS (CWE-79) | text nodes, auto-escaping templates, a sanitiser for rich text |
| file paths from input: `open`, `sendFile`, `path.join(root, input)` | path traversal (CWE-22) | resolve, then verify the result stays inside the root |
| outbound requests to a user-supplied URL | SSRF (CWE-918) | allowlist hosts; block private and metadata ranges after DNS resolution |
| redirects to a user-supplied URL | open redirect (CWE-601) | relative paths or an allowlist |
| object lookups by client-supplied ID | broken access control / IDOR (CWE-639) | check ownership or role on the server for every request |
| request body spread into a model or update | mass assignment (CWE-915) | explicit field allowlist |
| `verify=False`, `rejectUnauthorized: false`, `InsecureSkipVerify` | disabled TLS validation (CWE-295) | keep verification on; add the CA instead |
| MD5/SHA-1 for passwords, `Math.random` for tokens, ECB, static IVs | weak cryptography (CWE-327, CWE-330) | Argon2id/bcrypt; CSPRNG; AEAD modes from a vetted library |
| JWT decoding without verification, `alg: none`, secret in code | broken authentication (CWE-347) | verify signature, pin the algorithm, validate `exp`, `aud`, `iss` |
| regular expressions on untrusted input with nested quantifiers | ReDoS (CWE-1333) | bounded input, linear-time patterns |
| logs containing tokens, passwords, personal data | sensitive data exposure (CWE-532) | structured logging with redaction |

Authorization deserves its own pass: list the roles, the resources and the actions, and check that each route enforces the matrix on the server. Most serious web flaws today are missing checks, not exotic injections.

## Language quick notes

- **JavaScript / TypeScript:** prototype pollution through recursive merges; `child_process.exec`; NoSQL operator injection (`{$gt: ""}`) when a body goes straight into a query; secrets in `NEXT_PUBLIC_*`/`VITE_*` variables (shipped to browsers); server actions and API routes without their own auth check.
- **Python:** `subprocess(..., shell=True)`; `pickle`, `yaml.load`; Jinja2 with autoescape off or `render_template_string` on input; Django `DEBUG=True`, `ALLOWED_HOSTS=['*']`, `.extra()` and raw SQL; Flask `debug=True`.
- **PHP:** `include` with input; unserialize; `==` comparisons on hashes; uploads into the web root; SQL without PDO parameters.
- **Go:** `InsecureSkipVerify`; `text/template` used for HTML; unchecked errors on security paths; SQL via `fmt.Sprintf`.
- **Java / C#:** XML parsers with external entities enabled (XXE); native deserialisation; Spring actuator endpoints exposed; SQL string concatenation.
- **C / C++ / unsafe Rust:** bounds, integer overflow, lifetime and format-string issues - recommend sanitizers, fuzzing and a specialist review rather than asserting from reading alone.

## Configuration and supply chain

- **Docker:** runs as root, `latest` tags, secrets in `ENV`/`ARG` or image layers, `--privileged`, the Docker socket mounted, databases published on `0.0.0.0`.
- **CI/CD:** third-party actions pinned by tag instead of commit SHA; `pull_request_target` with a checkout of untrusted code; secrets available to forks; workflow permissions wider than `contents: read`; build scripts that `curl | sh`.
- **Dependencies:** install scripts, very new or single-maintainer packages in critical paths, names one typo away from a popular package, lockfile changes not explained by a manifest change.
- **Infrastructure as code:** storage buckets public, security groups `0.0.0.0/0` on admin or database ports, missing encryption at rest, long-lived access keys instead of roles.
- **AI coding agents:** project-level agent configuration, MCP servers and skills are executable trust. Review them like code before use.

## Writing the finding

State the path, the precondition and the smallest fix. Offer the patch as a diff for the user's normal review; do not apply it. Then name the test or check that would catch a regression. If you could not trace the input to the sink, say which link is unverified.

References: OWASP ASVS 5.0 and Cheat Sheet Series, CWE Top 25, Trail of Bits skills and Semgrep rule packs for sink catalogues, anthropics/claude-code-security-review for false-positive filtering, OpenSSF Scorecard for supply-chain checks (see `sources.md`).
