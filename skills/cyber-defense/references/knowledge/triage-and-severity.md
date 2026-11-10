# Triage and severity

How to turn raw signals into a short, ordered list a person can act on.

## Priority

| Priority | Use it when | Expected response |
|---|---|---|
| **P0** | Known to be exploited in the wild (CISA KEV), or critical and reachable from the internet, or an exposed secret, or signs of active compromise | Today. Contain first, then fix. |
| **P1** | High severity with a realistic path: internet-facing service, default or missing authentication, unpatched remote code execution, disabled TLS verification in production | This week |
| **P2** | Medium severity, needs another condition (local access, user interaction, an unusual configuration) | Planned maintenance |
| **P3** | Hardening, hygiene, information disclosure, defence in depth | Backlog, batch with other work |

Raise a priority when: the asset faces the internet, holds personal or payment data, is a single point of failure, or a public exploit exists. Lower it when: the vulnerable component is not reachable, a compensating control is verified, or the affected feature is unused. State the reason for every adjustment.

## The four signals

1. **Severity (CVSS)** - how bad it could be in theory. 9.0+ critical, 7.0-8.9 high, 4.0-6.9 medium, below 4 low. CVSS alone over-prioritises: most "criticals" are never exploited.
2. **Exploitation (KEV)** - the CISA Known Exploited Vulnerabilities catalog lists flaws attackers actually use. KEV membership outranks any score.
3. **Likelihood (EPSS)** - probability of exploitation in the next 30 days. Useful to order a long P1/P2 list; above 0.1 deserves attention.
4. **Context** - exposure, data sensitivity, existing controls. Only the user's environment answers this, so ask.

Decision shortcut (SSVC-style): *Is it exploited? Is it exposed? Is the impact serious?* Three yeses is P0; two is P1.

## Confidence

- **High** - deterministic evidence: an exact version in an affected range, a header that is absent, a setting read from the system.
- **Medium** - a pattern that usually means a problem but depends on context: a string that looks like a secret, a query built by concatenation whose input you could not trace fully.
- **Low** - inference from partial information. Present it as a question to verify, not as a finding.

Always separate *present* (the weakness exists) from *exploitable* (an attacker can use it here). Static evidence establishes the first only.

## False-positive discipline

Before reporting, try to disprove the finding: Is the value a placeholder or test fixture? Is the code dead or test-only? Is the input attacker-controlled at all? Does a framework already escape, parameterise or validate it? Did a distribution backport the fix without changing the upstream version? Drop what you cannot support; noise costs trust.

## Report template

```
## Summary
Checked: <assets and methods>.  Date: <ISO date>.
Result: P0 <n> · P1 <n> · P2 <n> · P3 <n>.
Top three actions:
1. ...
2. ...
3. ...

## Findings
### <P#> <plain-language title>
What could happen: ...
What I saw: <location, evidence, redacted>
Confidence: <high|medium|low> - <why>; exploitability <established|not established>
Fix: <exact change>  Rollback: <how to undo>
Verify: <command or check>

## Coverage
Checked: ...
Not checked: ... (and why)
Assumptions: ...

## Next step
<one recommendation>   Reports: .cda/reports/<name>.md
```

## Retest states

`confirmed_fixed` (same check repeated on current evidence and clean), `still_present`, `insufficient_data` (cannot tell - never report as fixed), `new` (appeared since the baseline). A closed ticket, a newer version label or a disappeared scanner line is not a retest.
