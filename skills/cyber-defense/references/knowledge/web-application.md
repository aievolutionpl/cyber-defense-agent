# Websites and web applications

Two passes: the outside (what any visitor's browser receives) and the inside (the code and configuration). Never test a site the user does not own or administer.

## Pass 1 - the outside, passively (consent level L4)

After the user confirms authorization for the exact URL:

`node tools/cda.mjs web --url https://example.com --name site --authorized`

What each result means for a non-specialist:

| Check | If it fails, an attacker can | Fix |
|---|---|---|
| HTTPS + redirect | read or alter traffic on shared Wi-Fi | serve HTTPS only; redirect HTTP with 301/308 |
| HSTS | downgrade a returning visitor to HTTP | `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| Content-Security-Policy | run injected scripts with no browser limit | start `default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'` in report-only, then enforce; use nonces, not `'unsafe-inline'` |
| Framing | overlay the site invisibly and steal clicks | `frame-ancestors 'self'` |
| `nosniff` | get an upload interpreted as script | `X-Content-Type-Options: nosniff` |
| Referrer-Policy | see private URLs and tokens in referrers | `strict-origin-when-cross-origin` |
| Cookie flags | steal a session via script (no `HttpOnly`), over HTTP (no `Secure`), or cross-site (no `SameSite`) | `Secure; HttpOnly; SameSite=Lax` on session cookies |
| Version disclosure | look up exact exploits for the server | hide versions - and patch the product |
| CORS reflection + credentials | read a logged-in user's data from another site | explicit origin allowlist |
| Certificate | cause browser warnings or interception | automate renewal (ACME) |
| `security.txt` | - (researchers cannot reach you) | publish `/.well-known/security.txt` |

Repeat for the login page and any separate API or admin host - each needs the user's confirmation. Headers are necessary, not sufficient: the tool cannot see logic flaws or anything behind a login.

Other passive questions to ask the user (answers, not scans): Is the admin panel reachable from the internet? Are staging or old subdomains still live? Is there a WAF or rate limit in front of login? Are DNS records pointing at services that no longer exist (subdomain takeover)? Do SPF, DKIM and DMARC protect the domain's email from spoofing?

## Pass 2 - the inside (L1)

Use the code lanes in SKILL.md. Review against OWASP Top 10:2025:

| # | Category | Look for |
|---|---|---|
| A01 | Broken Access Control | endpoints that trust an ID from the client without an ownership check (IDOR/BOLA); admin routes guarded only in the UI; missing server-side role checks; forced browsing; CORS too wide; SSRF via user-supplied URLs |
| A02 | Security Misconfiguration | debug mode, default credentials, directory listing, verbose errors, open cloud storage, unnecessary features and ports, missing security headers |
| A03 | Software Supply Chain Failures | outdated or vulnerable dependencies, unpinned versions, install scripts, typosquats, unverified CI actions, no lockfile |
| A04 | Cryptographic Failures | plaintext or fast-hashed passwords (need Argon2id, scrypt or bcrypt), hard-coded keys, disabled certificate verification, home-made crypto, secrets in URLs or logs |
| A05 | Injection | SQL/NoSQL/OS command/LDAP/template injection from string concatenation; XSS from unescaped output or `innerHTML`; unsafe deserialisation |
| A06 | Insecure Design | no rate limit on login, reset or checkout; missing re-authentication for sensitive actions; trust in client-side prices or roles |
| A07 | Authentication Failures | no MFA for admins; weak reset flows; session IDs in URLs; sessions not invalidated on logout or password change; JWT `alg` not pinned, long-lived tokens, secrets in localStorage |
| A08 | Software or Data Integrity Failures | auto-updates and plugins without signature checks, unsigned webhooks, CDN scripts without Subresource Integrity |
| A09 | Security Logging and Alerting Failures | no log of logins, failures and admin actions; logs with secrets or personal data; nobody alerted |
| A10 | Mishandling of Exceptional Conditions | fail-open error paths, stack traces to users, unhandled promise rejections that skip checks, resource exhaustion on bad input |

APIs (OWASP API Security Top 10, 2023): object-level authorization on every ID (API1), authentication (API2), property-level authorization and mass assignment (API3), unbounded pagination, uploads and expensive queries (API4), function-level authorization (API5), abuse of business flows (API6), SSRF (API7), misconfiguration (API8), forgotten versions and hosts (API9), blind trust in third-party APIs (API10).

Applications that call an LLM (OWASP Top 10 for LLM Applications 2025): prompt injection from any content the model reads; sensitive data in prompts and logs; model output used unsanitised in HTML, SQL or shell; tools with more permissions than the task needs; system prompts treated as a secret or a security control; unbounded token spend.

## Platform notes

- **WordPress and other CMS:** core, theme and plugin versions are the attack surface. Remove unused plugins, enable auto-updates, protect `/wp-admin` with MFA, disable file editing and XML-RPC if unused, restrict uploads.
- **Static sites and Jamstack:** secrets baked into the JavaScript bundle are public. Check build-time environment variables, source maps and `.git` or backup files left on the host.
- **Serverless and BaaS (Supabase, Firebase):** the browser holds a public key by design; all protection is the database's row-level rules. See `databases.md`.
- **File uploads:** validate type and size server-side, store outside the web root or in object storage, randomise names, never execute.
- **Payments and personal data:** never store card data yourself; minimise what you collect; know where personal data lives before an incident forces the question.

## Verifying fixes

Re-run `web` and compare finding IDs. For code fixes, repeat the same review or scanner and use `retest`. A header added at the CDN must be checked on the real hostname, not only on the origin.

References: OWASP Top 10:2025, ASVS 5.0, WSTG, API Security Top 10, Cheat Sheet Series, Secure Headers Project, MDN HTTP Observatory methodology (see `sources.md`).
