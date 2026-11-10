# Scanner evidence and PR review

The evidence update adds local JSON adapters for Gitleaks, Trivy and OSV-Scanner, snapshot comparison, SARIF export and a defensive GitHub Actions workflow. Each adapter has version 1 and maps documented exporter fields into the existing validated report. Scanner executables remain operator-managed.

## Choose an input

| Input | Command option | Supported scope |
| --- | --- | --- |
| Gitleaks JSON array | `--format gitleaks` | Rule ID, approved existing file and start line. Secret values, matches, fragments and commit metadata are omitted. |
| Trivy JSON schema 2 | `--format trivy` | Filesystem/repository reports with `lang-pkgs`, `config` and `secret` results. Failed configuration checks, vulnerable packages and secret signals are imported. |
| OSV-Scanner JSON | `--format osv` | `results[].source` lockfile/SBOM locations and package vulnerabilities. CVSS v3 uses the existing calculator. |
| SARIF 2.1.0 or CDA JSON | omit `--format` | Existing bounded import with approved relative file locations. |

The adapters do not install or start scanners. They make no network requests. Use the scanner's documentation to produce a report in a separately authorized run, then review its paths before import. Exporter reports are untrusted data. Their messages, commands, descriptions and fixes are omitted from the normalized evidence.

All imported findings require an approved local file. Absolute exporter paths are accepted only when they refer to the current approved root on this operating system. Paths containing traversal, encoded segments or external URLs are rejected. Historical deleted files, container images, OS package targets, unsupported classes and malformed input fail closed. Each input is bounded by the existing 4 MiB limit and 2,000 findings. Unknown severity receives P2 and low confidence pending review.

Adapter source references, inspected on 10 November 2026, are the upstream data structures. Trivy and OSV tests use synthetic representations of those fields. Gitleaks 8.30.1 was also run against a synthetic directory with a custom test rule and 100% redaction. Its recorded output is in `tests/fixtures/gitleaks-v8.30.1.json`; the File field was normalized to the relative fixture path. This checks exporter compatibility, while detection quality still needs a separate benchmark. Compatibility with every released exporter version is not established.

- [Gitleaks finding fields](https://github.com/gitleaks/gitleaks/blob/master/report/finding.go)
- [Trivy report fields](https://github.com/aquasecurity/trivy/blob/main/pkg/types/report.go)
- [OSV-Scanner result fields](https://github.com/google/osv-scanner/blob/main/pkg/models/results.go)
- [OSV output documentation](https://google.github.io/osv-scanner/output/)

## Import a report

From the trusted CDA checkout, agree the target root and exact files. For an exported Gitleaks report referring to `src/config.js`, propose these paths and obtain approval through the existing consent workflow.

```sh
node tools/cda.mjs scope --root /path/to/project --allow src/config.js --allow reports/gitleaks.json --name project
node tools/cda.mjs approve --scope project --root /path/to/project --yes
node tools/cda.mjs import --scope project --input reports/gitleaks.json --format gitleaks --name secrets
node tools/cda.mjs report --name security-review --from secrets --scope project
```

Use the corresponding format option and approved report path for Trivy or OSV. Mixed scanner results can be combined in the visual report using multiple `--from` arguments. Findings from different packages in the same lockfile remain separate.

## Compare snapshots and verify a fix

```sh
node tools/cda.mjs compare --scope project --before before --after after --name changes
node tools/cda.mjs retest --scope project --before before --after after --name verified
node tools/cda.mjs sarif --scope project --report after --name code-scanning
node tools/cda.mjs dashboard --scope project --lang pl
```

`compare` reads stored evidence and writes Markdown and JSON with new, existing and no-longer-observed findings. Both snapshots must refer to the same root and scanner. A missing finding has the label `noLongerObserved`. Only the separate live local `retest` can confirm a fix.

Local line rules have content-based fingerprints that survive insertion of preceding lines. Repeated identical lines have occurrence identifiers. Older reports fall back to rule, path and line. Package findings from adapters include package coordinates in their identity. A changed package version can therefore appear as a new observation. Moving a file also changes identity.

`dashboard --scope` creates a separate `dashboard-<root hash>.html`. Subsequent commands for that scope rebuild this view. The scope filter includes file reports and retests with that root identity. Host inventories, website checks and legacy reports without identity are excluded from this view. The global dashboard continues to include all report types.

The report retains the latest retest status. A later observation after a verified fix is labelled **Problem returned / Problem powrócił**, and the old fix is excluded from the current confirmed-fix total. Undated and unscoped legacy retests cannot close a finding. Incomplete local checks and unverified imported coverage are displayed explicitly.

## GitHub Actions

The repository includes [defense-review.yml](../.github/workflows/defense-review.yml). The workflow uses `pull_request`, read-only repository permissions, SHA-pinned actions and a five-minute timeout. It checks out base and head separately, then runs the base-branch tools against the base-branch allowlist in [cda-scope.json](../.github/cda-scope.json). Candidate scripts, dependencies and hooks are never executed by this review runner.

The job writes an Actions summary and JSON/HTML/SARIF reports. The Markdown summary, HTML report and SARIF file are uploaded as a seven-day Actions artifact. Findings are informational. Operational errors fail the job. Coverage gaps appear in the summary. The initial PR introducing this workflow explicitly reports that the base branch lacks the runner. Subsequent PRs use the accepted runner. A manual run compares the selected commit to itself and exercises the plumbing.

To adopt the workflow in another repository, maintain a trusted copy of `tools/` and an exact file policy on its base branch. Review policy changes as code. The built-in run covers four local rules in at most 160 named files. Broader scanners require their own installation, permissions, resource limits and evaluation.

SARIF export includes validated locations, bounded messages and stable fingerprints. It does not upload data. Optional upload to GitHub code scanning is a separate repository decision because it publishes findings and needs the relevant feature and job permissions. GitHub's uploader can consume the generated `.sarif` file once that integration is configured.

- [GitHub workflow security](https://docs.github.com/en/actions/reference/security/secure-use)
- [SARIF upload](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
