# Unified premium v0.1 release

Source: `codex/premium-unified`. The earlier Node-only branch remains available. AntyGravity's history and the initial merge are preserved locally on `codex/premium-unified-local-history`; the public unified branch carries the reviewed final code without the history rejected by GitHub push protection. The original AntyGravity working directory and its pre-integration snapshot were not overwritten.

- EN page: https://aievolutionpl.github.io/cyber-defense-agent/compare/node-v0.1/
- PL page: https://aievolutionpl.github.io/cyber-defense-agent/compare/node-v0.1/pl/
- Unified source: https://github.com/aievolutionpl/cyber-defense-agent/tree/codex/premium-unified
- Repository: https://github.com/aievolutionpl/cyber-defense-agent
- Pages artifact branch: `codex/node-v01-preview`, scoped to `compare/node-v0.1/`.

Local release checks: 29 unit/security tests, 80 browser checks for EN/PL under the production prefix, lint, TypeScript, build, demo, skill contracts and JSON schemas pass. `npm audit` reports zero vulnerabilities. Public deployment and remote run IDs are appended after observation; see [VERIFICATION.md](VERIFICATION.md) for the full scope and host/model limits.

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
