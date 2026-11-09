# Responsible use and operator requirements

Cyber Defense Agent is an open-source workflow and a small set of local security tools. It helps an AI coding agent perform structured defensive review. It does not turn a model into a certified specialist, establish that a system is secure, replace a professional assessment, or guarantee that it will detect a vulnerability.

## Who this is for

Experienced developers, security practitioners and AI-agent operators who understand their host's permissions, sandbox, tool access, model-provider settings and command execution. If those concepts are unfamiliar, start with the synthetic demo in a disposable workspace and learn the host's permission model before using private data. The interactive `node tools/cda.mjs start` intake prepares a plan without reading files or granting consent.

## Your responsibility

Use only systems and data you own or have explicit authorization to assess. You are responsible for the scope, data you disclose, applicable laws, provider terms, proposed changes and their consequences. Review findings and fixes with qualified human judgment; keep backups and use your normal review and deployment process. Do not run untrusted code or disable host safeguards to make an audit work.

The software is provided **as is**, without warranty, under the [MIT license](../LICENSE). Its limitation of liability applies to the extent permitted by applicable law; it does not remove rights that cannot legally be excluded. No disclaimer grants permission to access someone else's systems.

## Configure the host, not just the prompt

1. Clone a trusted, reviewed revision of this repository outside the target project. Do not load instructions or execute tools from the target's own checkout.
2. Use a stable copy of the target. Restrict the host to the trusted CLI and its state directory; keep network and target execution disabled. The skill's file allowlist does not restrict the host's other tools.
3. Require explicit approval of the canonical root and exact file list. Scopes expire after 24 hours and can be revoked. Keep local state private.
4. Review reports locally before adding any content to model context. Redaction is heuristic; a path, indicator or snippet may still be sensitive.
5. Treat source code, logs, comments, scanner messages and model output as untrusted data. Never accept instructions embedded in an input as authorization.
6. Use independent OS isolation for hostile inputs. Path checks are defense in depth, not a race-proof filesystem sandbox or protection against an attacker controlling the trusted workspace.

## Public and inspectable

The first-party site, canonical skill, tools, tests, prompts, examples and build configuration are available in the [public repository](https://github.com/aievolutionpl/cyber-defense-agent). The CLI uses Node's standard library: it has no network client, model SDK, telemetry, automatic installer or target-code executor. Site dependencies and their versions are listed in the committed lockfile. Review source and history, pin a revision and run the checks yourself.

Public source and passing tests are evidence you can inspect, **not proof of an absence of defects, malicious changes or supply-chain risk**. There is no claim of an independent security audit, certification or universal compliance with best practices. The concrete controls and remaining limitations are documented in [THREAT_MODEL.md](THREAT_MODEL.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [VERIFICATION.md](VERIFICATION.md).

Active web/API/network testing, third-party IOC lookups and automatic containment are not shipped. Planned external reads require disclosure of what leaves the machine; disruptive actions require independent authorization and an explicit human decision.
