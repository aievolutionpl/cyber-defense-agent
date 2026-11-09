# PC and server update planning

The `updates` command reviews an **operator-supplied inventory**, prioritises reported updates and writes an actionable Markdown plan. It supports inventories labelled Windows (`winget`, `windows-update`), Linux (`apt`, `dnf`, `zypper`) and macOS (`softwareupdate`, `brew`). These are input labels, not executable adapters. The CLI does not query those package managers, access another machine, install packages, restart services or contact update catalogs.

## Collect, approve, review

An authorized administrator obtains the available-update list in their normal OS management tool. Verify catalog freshness and include OS updates separately from application/package updates: a winget or brew inventory alone does not cover the entire operating system. Translate the relevant entries into this small format without commands, URLs, secrets, machine names or free-text logs:

```json
{
  "format": "cda.updates.v1",
  "platform": "linux",
  "manager": "apt",
  "observedAt": "2026-11-09T12:00:00Z",
  "packages": [
    { "name": "example-service", "installed": "1.0", "available": "2.0", "classification": "security", "restart": "yes" }
  ]
}
```

Names and version labels are bounded text, not shell expressions. Classification is `security`, `regular` or `unknown`; restart is `yes`, `no` or `unknown`; an unknown available version is `null`. At most 1,000 unique package names are accepted. The timestamp must describe the actual observation in UTC. Do not update an old inventory's date to make it appear fresh.

Create the usual exact-file scope, show it to the user, and wait for approval before running `approve`:

```sh
node tools/cda.mjs scope --root /path/to/export --allow updates.json --name maintenance
# Only after explicit approval of the returned scope:
node tools/cda.mjs approve --scope maintenance --root /path/to/export --yes
node tools/cda.mjs updates --scope maintenance --input updates.json --name maintenance-plan
```

Read `.cda/reports/maintenance-plan.md` locally. Its JSON counterpart contains only normalized fields. The normal `summary` command is for audit reports, not update plans; the CLI prints only counts and the path to this plan. Do not insert private inventory content into a host/model conversation without local review and the user's sharing decision.

## Honest outcomes

| State | Meaning |
|---|---|
| `update_reported` | The supplied available and installed strings differ. Validate ordering and vendor applicability before acting. |
| `reported_current` | The supplied strings match for this entry. This does not prove the host is fully patched. |
| `insufficient_data` | No available version was supplied. |
| `stale_inventory` | Observation is older than seven days. Refresh it before deciding. |

An operator-labelled security update gets planning priority P1; regular/unknown updates get P2. This is not independent CVE validation, exploitation evidence or a guarantee of a safe upgrade. Package versions are ecosystem-specific; arbitrary strings cannot establish which version is newer. Windows application updates, Windows Update, Linux distribution security backports, macOS updates and Homebrew packages have different coverage.

## The agent's maintenance conversation

1. Ask about the OS, workstation/server role, production impact, inventory source and observation date.
2. Explain which entries need investigation, what coverage is missing and why any stale data must be refreshed.
3. Prepare a proposed update plan with compatibility checks, release notes, a tested backup, rollback, maintenance window and service-health checks.
4. Wait for the operator's decision. Installation happens through the administrator's normal tools, outside this read-only skill.
5. Review a newly collected inventory and independent health evidence afterward. An empty list or newer label is not a verified security fix.

The bundled [Windows inventory](../examples/updates/windows-demo.json) is synthetic and intentionally dated. It may eventually become stale; that is expected behavior. Live OS collectors and vendor-catalog adapters remain future work and require separately reviewed permissions and outbound-data controls.
