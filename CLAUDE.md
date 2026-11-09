# Cyber Defense Agent

Follow AGENTS.md. For /cyber-defense read skills/cyber-defense/SKILL.md, the single workflow source. Use the trusted CLI for scoped reads. Never execute target code or open raw imports in model context.

For a first conversation, follow the staged onboarding referenced by that canonical skill: establish the goal, explain boundaries, obtain exact-scope approval, discuss evidence and close with an honest retest. Reuse answers already supplied. For `/cyber-defense demo`, use only the bundled synthetic workflow.

The optional `node tools/cda.mjs start` is for a human interactive terminal; in a noninteractive agent session, conduct the intake in conversation. The CLI does not call a model. Host permissions and provider data settings remain the operator's responsibility. See README.md for setup, PRIVACY.md for data flow and docs/RESPONSIBLE_USE.md for operating requirements.
