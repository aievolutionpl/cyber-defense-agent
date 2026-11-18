# Model providers: skill in an agent, or a standalone program

Cyber Defense Agent works two ways:

1. **As a skill** inside an agent host (Claude Code, Codex, Cursor, Antigravity, Hermes). The host's model reads `skills/cyber-defense/SKILL.md` and drives the trusted CLI under the consent ladder.
2. **As a standalone program.** The CLI collects evidence itself and, optionally, asks a model you connect to explain the results, answer questions and plan fixes — in the terminal (`chat`, `explain`, `ask`) or in the local Command Center (`ui`, view "AI expert", key `4`), where every finding also has an "Ask the expert" button that sends only that finding's priority, area and scrubbed title and fix hint.

In program mode the model is an **advisor without hands**: it gets no tools, no files and no shell. It receives a fixed defensive system prompt plus a bounded, redacted brief of findings you chose to send.

## Supported providers

| Provider id | Kind | Authentication | Default model | Where the request goes |
|---|---|---|---|---|
| `claude-code` | subscription CLI | `claude` then `/login` (Pro/Max or Console) | CLI default | the Claude Code CLI on your machine, then Anthropic |
| `codex` | subscription CLI | `codex login` (ChatGPT Plus/Pro/Business) | CLI default | `codex exec --sandbox read-only`, then OpenAI |
| `openrouter` | API key | `OPENROUTER_API_KEY` | `openrouter/auto` | `https://openrouter.ai/api/v1/chat/completions` |
| `anthropic` | API key | `ANTHROPIC_API_KEY` | `claude-opus-5-5` | `https://api.anthropic.com/v1/messages` |
| `openai` | API key | `OPENAI_API_KEY` | `gpt-5` | `https://api.openai.com/v1/chat/completions` |
| `ollama` | local | none | `llama3.2` | `http://127.0.0.1:11434/api/chat` (stays on the machine) |

Override the model with `--model`, e.g. `--model anthropic/claude-sonnet-5.5` on OpenRouter or `--model claude-sonnet-5-5` on the Anthropic API.

## Quick start

```sh
node tools/cda.mjs doctor                          # local check: Node, Git, PDF browser, CLIs, keys (no network)
node tools/cda.mjs connect --provider claude-code  # or codex / openrouter / anthropic / openai / ollama
node tools/demo.mjs                                # synthetic evidence to try it on
node tools/cda.mjs explain --from demo-before --dry-run        # see exactly what would be sent
node tools/cda.mjs explain --from demo-before --send-summary   # send it, write .cda/reports/explain-*.md
node tools/cda.mjs chat                            # interactive expert; /explain <report> inside
```

Storing an API key without putting it in shell history:

```sh
node tools/cda.mjs connect --provider openrouter --key-stdin < key.txt   # then delete key.txt
node tools/cda.mjs connect --provider openrouter --forget-key
```

The key goes to `~/.config/cyber-defense-agent/credentials.json` (`%APPDATA%` on Windows, or `CDA_CONFIG_HOME`), mode 0600, outside every repository. Environment variables take precedence. `.cda/config.json` stores only the provider and model name.

## What is sent

`explain` builds a `cda.model-brief.v1` envelope from the selected reports:

- verdict and P0–P3 counts, number of sources, packages checked / not checked, incomplete sources;
- up to 60 findings sorted by priority, each with `priority`, `area`, a redacted `title` (≤160 chars), a redacted `fixHint` (≤240 chars) and `basis` (tool evidence or model judgment).

It never includes evidence lines, file contents, file paths, URLs, IPs, internal hostnames, cookie values, query strings, hostnames or user names. Secrets matched by the redactor are replaced before sending. The brief is wrapped in `<cda-data>` and the system prompt tells the model that everything inside is untrusted data, not instructions.

`ask` and `chat` send the text you type. In `chat`, `/explain` asks for a separate yes before each brief.

## Safety boundaries in code

- One exit point (`callModel`) that refuses without `consent: true`.
- Fixed URL allowlist; `redirect: "error"`; 180 s timeout; 512 KB response cap; 60 000-character prompt cap; model names validated against a strict pattern.
- CLI providers run with fixed arguments, no shell, prompt on stdin, in a fresh empty directory in the OS temp area (outside every repository) that is deleted afterwards. Claude Code runs with `--tools ""` (all built-in tools disabled) and `--strict-mcp-config` (no MCP servers). Codex runs `exec --sandbox read-only` with `-c features.shell_tool=false -c features.unified_exec=false -c features.apply_patch_freeform=false -c mcp_servers={}`. Codex has no single documented "no tools" switch, so this is defense in depth rather than a guarantee; prefer Claude Code, an API provider or Ollama when you need the narrowest, verified surface.
- Free-text titles and fix hints are scrubbed of URLs, e-mail addresses, IPs, file paths and internal hostnames before sending.
- In `chat`, switching provider asks for consent again and clears the conversation, so earlier messages never reach a new destination. History is trimmed to the transport's size budget.
- Model output is untrusted: control and bidi characters and raw HTML tags are stripped, secrets redacted, length capped, and the file is labelled **model judgment**. It can never close a finding — only a retest with local evidence can.
- Errors map to stable codes (`API_KEY_MISSING`, `PROVIDER_AUTH_FAILED`, `MODEL_NOT_FOUND`, `PROVIDER_RATE_LIMITED`, `CLI_NOT_INSTALLED`, `MODEL_REFUSED`, …) and never echo keys.

## Limits

- The model's explanation is judgment. It may be wrong about exploitability, versions or vendor guidance; verify with the cited fix and a retest.
- Subscription CLIs may apply their own tools or settings; the sandbox directory and stdin-only prompt reduce, but cannot fully control, a third-party CLI's behaviour. Use API or Ollama providers when you need the narrowest surface.
- Provider-side retention and training settings are governed by your account with that provider.
