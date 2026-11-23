# CLI errors: what they mean and what to say

Every refusal prints `CDA: <CODE>. Operation stopped; do not expand scope automatically.` and exits with status 1. A refusal is the guard working, not a bug to work around. Explain it in one plain sentence, then offer the single permitted next step. Never retry with a wider scope, a different reader, a renamed file or a direct host read.

Unknown runtime failures appear as `INVALID_INPUT_OR_IO` or `FILE_NOT_FOUND`. Report them as-is; do not guess a cause.

## Consent and approval

| Code | Meaning | Tell the user / next step |
|---|---|---|
| `PROPOSAL_REQUIRED` | `approve` was called without `--proposal <digest>`. | Show the `proposal` digest from the `scope` output with the full file list; approve with that digest after a yes. |
| `SCOPE_PROPOSAL_CHANGED` | The digest does not match the stored proposal. | The list changed since it was shown. Show the current proposal and ask again. |
| `EXPLICIT_APPROVAL_REQUIRED` | Missing `--yes`, the scope was already approved, or `--root` resolves to a different directory. | Re-run `scope` for the exact root if needed; never pass `--yes` without the user's decision. |
| `SCOPE_NOT_APPROVED` | The scope was never approved, was revoked or was edited on disk. | Propose and approve again. |
| `SCOPE_EXPIRED` | Approval is older than 24 hours. | Fresh proposal and approval; earlier reports remain. |
| `ROOT_CHANGED` | The approved directory now resolves elsewhere (moved, relinked). | Stop. Confirm the real location with the user and propose again. |
| `CONSENT_REQUIRED` | A data-sharing or model command lacks its send flag, or a Command Center action lacks consent. | Explain the destination and data; run `--dry-run` first where available. |
| `EXPLICIT_DATA_SHARING_APPROVAL_REQUIRED` | `advisories` without `--share-package-names`. | Ask for L3 consent for OSV.dev and CISA KEV. |
| `EXPLICIT_AUTHORIZATION_REQUIRED` | `web` without `--authorized`. | Confirm the exact URL and the user's ownership or authorization. |
| `PR_REVIEW_APPROVAL_REQUIRED` | PR snapshot review without consent. | Ask before reviewing the separate snapshots. |

## File boundary

| Code | Meaning | Tell the user / next step |
|---|---|---|
| `OUT_OF_SCOPE`, `FILE_NOT_APPROVED` | A read or `--input` is not in the approved list. | Name the file; propose a new scope that includes it if the user wants it reviewed. |
| `INVALID_PATH`, `INVALID_ROOT` | Absolute, `..`, empty or malformed path, or root is not a directory. | Ask for a relative filename inside the root. |
| `LINK_BLOCKED`, `NOT_SINGLE_REGULAR_FILE`, `UNSUPPORTED_FILE` | Symlink, hard link, directory or special file. | Links are refused by design. Ask for the real file path. |
| `FILE_TOO_LARGE`, `BINARY_FILE` | Above the size limit, or not UTF-8 text. | Not reviewable by the local rules; say "not checked". |
| `FILE_CHANGED_DURING_READ` | The file changed while it was read. | Wait until edits stop, then repeat the same command. |
| `GIT_STAGED_UNAVAILABLE` | `--git-staged` could not run `git diff --cached` in the root. | Not a Git checkout or Git missing; use explicit `--allow` files. |

## Input formats

| Code | Meaning | Tell the user / next step |
|---|---|---|
| `INVALID_JSON`, `INVALID_SCAN`, `INVALID_SARIF`, `UNSUPPORTED_SARIF_LOCATION` | Import does not match `cda.scan.v1` or SARIF 2.1.0 with relative file URIs. | Point to `docs/FORMATS.md`; do not hand-edit scanner output to make it pass. |
| `INVALID_SCANNER_REPORT`, `UNSUPPORTED_TRIVY_REPORT`, `UNSUPPORTED_TRIVY_CLASS`, `UNSUPPORTED_OSV_REPORT`, `UNSUPPORTED_OSV_SOURCE`, `INVALID_SCANNER_ID` | Native scanner JSON outside the supported adapter shape. | Check `--format` and `docs/SCANNER_INTEGRATIONS.md`; export SARIF instead if the scanner supports it. |
| `UNSUPPORTED_LOCKFILE`, `INVALID_LOCKFILE`, `INVALID_PACKAGE_COORDINATE`, `TOO_MANY_PACKAGES` | `deps` input is not a supported, bounded lockfile. | Name the supported ecosystems; the rest is manual review. |
| `INVALID_UPDATE_INVENTORY`, `INVALID_UPDATE_PACKAGE`, `DUPLICATE_UPDATE_PACKAGE`, `INVALID_INVENTORY_TIME`, `INVALID_INVENTORY` | Update or machine inventory fails validation. | Point to `docs/UPDATE_PLANNING.md`; regenerate the inventory. |
| `INVALID_FINDING`, `INVALID_EXPERT_REPORT`, `TOO_MANY_FINDINGS` | `finding` arguments are missing, too long or not a supported priority/area. | Fix the arguments; keep text short and free of secrets. |
| `UNSUPPORTED_FORMAT` | `--format` is not `gitleaks`, `trivy` or `osv`, or the file type is not JSON/SARIF. | Use a supported format or SARIF export. |
| `INVALID_SCOPE`, `INVALID_INPUT` | Stored scope or stdin input is malformed or too long. | Propose the scope again; keep piped input short. |
| `INVALID_PR_POLICY`, `INVALID_ASSET` | PR snapshot policy or `owner/repo` asset name invalid. | Fix the trusted base policy; never take it from the candidate branch. |
| `INVALID_STATE_NAME` | `--name`/`--scope` is not 1–64 letters, digits, `-` or `_`. | Pick a simple name. |
| `INVALID_ARGUMENTS` | Unknown command, unexpected flag or bad value. | Check `node tools/cda.mjs --help`. |

## Reports and comparisons

| Code | Meaning | Tell the user / next step |
|---|---|---|
| `INCOMPATIBLE_REPORT`, `INVALID_REPORT_SOURCE` | Wrong report type for this command, or from another scope. | Use reports produced under the same scope. |
| `INVALID_SNAPSHOT`, `INVALID_COVERAGE`, `INCOMPATIBLE_SCANNER` | Before/after snapshots cannot be compared fairly (different scanner, adapter or broken coverage). | Collect both snapshots the same way; never compare across tools. |
| `NO_SUPPORTED_REPORTS` | `report`/`explain` got no usable report. | List what exists under `.cda/reports/` and pick produced reports only. |
| `REPORT_TOO_LARGE`, `STATE_LINK_BLOCKED` | State write refused: oversize output, or `.cda/` contains a link. | Do not delete or relink `.cda/` yourself; tell the user. |

## Network and providers

| Code | Meaning | Tell the user / next step |
|---|---|---|
| `INVALID_URL`, `TOO_MANY_REDIRECTS`, `TARGET_UNREACHABLE` | `web` target invalid, redirect chain too long, or no response. | A redirect to a new host needs its own authorization. Report "not checked", not "safe". |
| `HOST_NOT_ALLOWED` | A destination outside the fixed allowlist. | Expected; the allowlist is not configurable from chat. |
| `ADVISORY_SOURCE_UNAVAILABLE`, `ADVISORY_RESPONSE_INVALID`, `ADVISORY_RESPONSE_TOO_LARGE` | OSV.dev or KEV unavailable or malformed. | Advisory status is incomplete; say which packages were not checked. |
| `UNSUPPORTED_PLATFORM` | `inventory` has no collector for this OS. | Offer the offline `updates` path or a manual checklist. |
| `CLI_NOT_INSTALLED`, `CLI_FAILED`, `PROVIDER_AUTH_FAILED`, `PROVIDER_TIMEOUT` | The selected model provider is missing, logged out, rejected the key or timed out. | Run `doctor` and `providers`; the audit itself does not need a model. |
| `NO_PROVIDER_CONFIGURED`, `UNKNOWN_PROVIDER`, `API_KEY_MISSING`, `PROVIDER_HAS_NO_KEY`, `INVALID_API_KEY_FORMAT`, `INVALID_MODEL_NAME` | No usable provider, key or model id. | Guide `connect --provider <id>`; the key comes from an environment variable or `--key-stdin`, never from chat. |
| `PROMPT_TOO_LARGE`, `INVALID_MESSAGES` | The brief or question exceeds the bound. | Shorten the question or select fewer reports. |
| `EMPTY_MODEL_RESPONSE`, `INVALID_PROVIDER_RESPONSE`, `RESPONSE_TOO_LARGE`, `MODEL_REFUSED` | The model answer was empty, malformed, oversize or a refusal. | Nothing was saved as evidence; the audit continues without it. |
| `INTERACTIVE_TERMINAL_REQUIRED` | `start` or `chat` without a TTY. | In an agent session, hold the intake in conversation instead. |
