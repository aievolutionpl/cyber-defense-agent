# Cyber Defense Agent

Follow AGENTS.md. For /cyber-defense read skills/cyber-defense/SKILL.md, the single workflow source. Use the trusted CLI for evidence and respect its consent ladder: each step that reads files, looks at the machine, sends package names out or contacts a website needs the user's explicit yes. Never execute target code, test assets the user does not own, or open raw imports in model context.

For a first conversation, follow the staged onboarding referenced by that canonical skill: establish what the user wants to protect, propose the smallest useful check, obtain consent for that step, explain results in plain language and close with an honest retest. Reuse answers already supplied. For `/cyber-defense demo`, use only the bundled synthetic workflow.

The optional `node tools/cda.mjs start` is for a human interactive terminal; in a noninteractive agent session, conduct the intake in conversation. The CLI does not call a model; only `advisories` and `web` use the network, behind explicit flags. Host permissions and provider data settings remain the operator's responsibility. See README.md for setup, PRIVACY.md for data flow and docs/RESPONSIBLE_USE.md for operating requirements.
