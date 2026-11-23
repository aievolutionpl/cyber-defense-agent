# Supply chain and CI/CD: review who can change what ships

Use this playbook when the user asks about GitHub Actions or other CI workflows, release pipelines, dependency provenance, package publishing or "could someone sneak code into our build?". The review is read-only. It does not run workflows, open test pull requests, publish packages, call the GitHub API or install a dependency to inspect it.

Primary references, checked on **23 November 2026**: GitHub [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) and [Securely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target). Background frameworks: [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/), [SLSA](https://slsa.dev/) and [OpenSSF Scorecard](https://scorecard.dev/). They inform the questions below; this playbook is not a compliance assessment. Recheck a source before quoting a version-specific requirement.

## Establish the approved evidence

Ask for exact relative files: `.github/workflows/*.yml` that build, test, release or deploy; `action.yml` for local composite actions; lockfiles; package manifests with lifecycle scripts; `CODEOWNERS`; Dependabot/Renovate config; release scripts. Repository settings (branch protection, environment reviewers, default `GITHUB_TOKEN` permission, required SHA pinning) live outside the files; ask the user to describe or screenshot them, and mark them **not checked** otherwise.

Local signals that apply: `deps` for lockfile inventory, `CDA-SECRET-001` for secret-shaped strings, `CDA-AGENT-002` when workflows run AI agents with broad approval. Everything else in this playbook is expert judgment. Never ask for secret values; a secret's **name** and where it is exposed is enough.

## Draw the path from contributor to production

Describe **who can trigger → which event → which code runs → with which token and secrets → what it can write (repo, registry, cloud, release)**. The core question is whether code or text controlled by a less-trusted actor (fork contributor, issue author, dependency maintainer) runs with a more-trusted identity.

| Review area | Evidence to seek | What a useful finding establishes |
|---|---|---|
| Privileged triggers | `pull_request_target`, `workflow_run`, `issue_comment` handlers that check out or build PR head code | Untrusted fork code runs with repository secrets or a write token. GitHub documents the checkout-of-head pattern as insecure. |
| Script injection | `${{ github.event.* }}` (titles, bodies, branch names, commit messages) interpolated directly inside `run:` | Attacker-controlled text becomes shell. Fix: pass through `env:` and quote, or use an action input. |
| Token scope | Top-level and job-level `permissions:`; absence means the repository default | A job that only reads gets `contents: write` or more. Fix: `permissions: {}` at top, grant per job. |
| Third-party actions | `uses:` pinned to a tag or branch rather than a full-length commit SHA; actions from unknown publishers | A retagged or compromised action runs in your job. Fix: pin to a SHA with a version comment and let Dependabot update it. |
| Secrets exposure | Secrets passed to steps that do not need them, printed, written to artifacts or caches, or available to PR jobs | A secret is reachable by code that should not see it. Record names and steps, never values. |
| Cloud credentials | Long-lived cloud keys stored as secrets versus OIDC federation with a trust policy bound to repo, branch or environment | A static key or a trust policy accepting any branch/repo widens who can deploy. |
| Self-hosted runners | Runners used by public-repo or fork-triggered jobs; persistent, non-ephemeral runners | Untrusted jobs gain a foothold on a shared machine. |
| Caches and artifacts | Cache keys writable by PR jobs and restored by release jobs; artifacts consumed by `workflow_run` without validation | Poisoned build inputs flow into a privileged job. |
| Dependencies | Lockfile present and used (`npm ci`, `pip --require-hashes`, `cargo --locked`); lifecycle scripts (`postinstall`); internal package names resolvable on public registries | Builds are not reproducible, install scripts run unreviewed, or a public package could shadow an internal one. |
| Release integrity | Who can push tags, publish packages and approve deployments; provenance/attestation; protected environments | One compromised account or workflow can publish. Provenance shows *where* it was built, not that the code is safe. |
| AI agents in CI | Agent steps triggered by issues, comments or PRs with write tokens, shell access or secrets | Untrusted text instructs an agent that holds authority. Apply [agent security](agent-security.md). |

## Challenge before raising

- A `pull_request_target` workflow that never checks out or executes PR code (e.g. labelling only) is not the dangerous pattern; say so.
- `${{ }}` inside `with:` or `if:` is evaluated by Actions, not by a shell; the injection risk is specific to `run:` and script-evaluating inputs.
- A tag-pinned first-party action (`actions/*`) is lower risk than an unknown publisher's, but still mutable; usually P2–P3, not P0.
- A missing `permissions:` block depends on the repository default, which is not in the files: state the assumption.
- Lockfile drift is a hygiene issue until it reaches a release build.

## Priorities

Use [triage and severity](triage-and-severity.md). Typical ordering when the evidence is established: untrusted code or text running with secrets or a write token in a public repository → P0/P1; long-lived deploy credentials or broad OIDC trust → P1; unpinned third-party actions and missing least-privilege `permissions:` → P2; reproducibility and provenance improvements → P3 or IDEA. Exposure (public vs private repository, who can open PRs) changes the order.

## Recommend and verify

Give the smallest diff: an `env:` indirection, a `permissions:` block, a SHA pin with a version comment, a split into an unprivileged build job and a privileged job that consumes only validated artifacts, an `environment:` with required reviewers, or OIDC with a trust condition on `repo:` and `ref:`. The user applies it. Verification is a re-read of the changed workflow in a fresh scope plus the user's confirmation of repository settings; no test PR or workflow run is part of this review.

Record each issue with `finding --area code`, naming the workflow file and job in the title, labelled model judgment.

## Coverage statement

Close with the workflows and files reviewed, the repository settings described by the user versus not checked, and what remains unseen: organisation-level policies, runner hosts, registry account security, maintainer 2FA and the runtime behaviour of third-party actions. No workflow was executed.
