# One instruction source, explicit host status

Reviewed against official documentation on 9 November 2026. Product names identify workflows, not partnerships or endorsements. Support for the file format is different from a successful end-to-end model session.

| Host | Entry / use | Product verification |
|---|---|---|
| Codex | `.agents/skills/cyber-defense/SKILL.md` → canonical instruction | Static contract and local tools tested. Full model session unverified. |
| Claude Code | `.claude/skills/cyber-defense/SKILL.md` → same canonical instruction | Static contract and local tools tested. Full model session unverified. |
| Cursor | Official docs support project `.agents/skills/`; reuse the existing entry in a trusted clone | Documented skill format compatibility; discovery and full session unverified. |
| Google Antigravity | Current official docs use project `.agents/skills/`; reuse the existing entry in a trusted clone | Documented skill format compatibility; discovery and full session unverified. |
| Hermes | Experimental `.hermes/skills/` pointer | Discovery, installation and full session unverified. |
| Lovable | Import the canonical Markdown folder through its documented skill-import flow; local CLI execution is not established | Planning/context handoff only. No claim of native local CLI execution or a verified skill integration. |

For Cursor or Antigravity: open this trusted tools repository, start a new session and explicitly ask the host to read `skills/cyber-defense/SKILL.md` and run **only the synthetic demo**. Check the host's skill discovery and permission controls yourself before a private audit. Do not assume the CLI's scope policy restricts other host tools.

For Lovable: official docs support importing a skill folder or a direct SKILL.md URL. Importing the canonical folder does not bundle the sibling `tools/` runtime or establish its permissions. Use the workflow for planning, or move the exported repository into a separately configured local host to run the CLI. Do not upload private reports or claim that a website builder has audited your PC. This repository does not auto-install provider plugins, connect accounts or synchronize projects.

Official references:

- [Cursor Agent Skills](https://cursor.com/docs/skills)
- [Google Antigravity Agent Skills](https://antigravity.google/docs/skills)
- [Lovable Skills](https://docs.lovable.dev/features/skills) — GitHub folder and direct SKILL.md imports.
- [Lovable Instructions](https://docs.lovable.dev/features/knowledge) — project/workspace context and repository instruction files.

Existing Codex/Claude launch limitations and exact tool tests remain in [VERIFICATION.md](VERIFICATION.md).
