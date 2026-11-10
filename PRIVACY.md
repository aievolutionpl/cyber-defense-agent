# Privacy and cookies

Effective: 10 November 2026. Applies to this repository's static site and first-party local tools. External providers have their own policies.

## Public website

The website serves static assets and synthetic demonstrations. It has no account, upload form, payment system, advertising, analytics SDK, model API connection or embedded third-party video. Fonts, graphics and the silent hero video are served with the site. Demo choices exist in page memory and reset on reload.

The application does not set cookies or use localStorage, sessionStorage, IndexedDB or browser fingerprinting. Its copy buttons write the selected command or prompt to your clipboard when clicked; they do not read your clipboard. Language is selected through the URL. Motion preferences are read from your browser and OS, and the page's pause control is in memory only.

Because this release has no optional tracking or application cookies, it shows a cookie-policy link instead of a misleading consent banner. If tracking is added later, update the policy and implement any legally required opt-in before loading optional trackers.

GitHub Pages receives normal web requests, including IP address and browser/request information. Hosting infrastructure and your browser may retain access logs or cache files under their own policies. We do not control GitHub's retention. See [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Following a GitHub or other external link sends a request to that service; this page does not control it.

## Local tools

The CLI reads only the explicitly approved files for review/import. It writes scope, report and summary state into `.cda/` in the trusted tools repository. That state can include absolute paths, locations and redacted evidence. It is excluded from Git. Tools do not transmit it, collect telemetry or call a model.

Three commands go beyond approved files, each only with an explicit flag you supply after deciding. `inventory --yes` lists installed software and listening TCP ports of the machine it runs on; it stores names, versions and port numbers, and does not record the hostname, user names, paths or process names. `advisories --share-package-names` sends package names, versions and ecosystem labels to OSV.dev (operated by Google) and downloads the public CISA Known Exploited Vulnerabilities list; those services receive your IP address and the submitted package list under their own policies. `web --authorized` sends a few ordinary GET requests and one TLS handshake to the site you name and to hosts it redirects to; response bodies, cookie values and query strings are not stored. A software list can itself be sensitive: review reports before sharing them. The terminal intake does not persist answers. The demo creates a synthetic temporary project which remains available for inspection; its location is printed in the demo output.

You control local retention. Revocation disables a scope; it does not erase existing reports. Remove your local `.cda/` state and identified synthetic scratch directory when no longer needed, after verifying their paths. Do not publish private findings in an issue or pull request.

## AI agent hosts

Codex, Claude Code and other hosts may send prompts, tool output and conversation attachments to their model providers, depending on your account and configuration. Running the CLI through a host can expose its output to that host even when a command itself sends nothing. Keep sensitive reports out of chat, review redaction locally, and use the bounded model summary only after deciding what may be shared. This project cannot override a provider's processing, retention or training settings. No provider integration is configured by the website.

## Questions or vulnerabilities

Use the [security reporting guidance](SECURITY.md) for sensitive issues; public issues are suitable only for non-sensitive policy questions. Do not send passwords, private logs or access tokens.
