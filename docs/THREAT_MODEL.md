# Architecture, data flow and trust boundary

## Pipeline

User allowlist → metadata-only proposal → explicit approval → ScopedReader → local static rules / JSON-SARIF normalizer → local JSON + escaped Markdown → optional reviewed report excerpts in Codex/Claude Code → conservative live retest.

tools/ uses the Node standard library only. No child process, network library, eval of target content, package resolution or dynamic target import is involved. The marketing site is a separate static application.

## Filesystem boundary

The canonical approved root and exact relative allowlist restrict target reads. The guard rejects traversal, absolute/UNC/URL paths, percent encoding, alternate streams, reserved Windows filenames, links/junctions and multiply-linked files. Each path component is checked before open; the guard uses O_NOFOLLOW where supported and checks identity, size and mtime after reading. Non-regular/binary/oversized files fail closed.

The trusted tool reads its own code, packaged demo fixtures and .cda control/report state outside the target. Target reads use ScopedReader only. Reports are written only to fixed state directories with validated short names; state directory links are blocked.

Portable path checks cannot guarantee race freedom against an attacker changing parent directories concurrently. This release is for an unchanged local snapshot; an OS-enforced read-only mount/sandbox is required for hostile concurrent filesystems. Do not represent these checks as container isolation. The local user can edit scope state and hashes: they are consent records and integrity checks against accidental changes, not signatures or access control against the same OS user.

## Data minimization

Local detection emits curated evidence templates; secret values are never emitted by the secret rule. Import omits all raw titles, messages, snippets, links and fixes, using only validated rule/location/severity/confidence plus a digest. The normalizer doesn't fetch external references. Markdown escapes active markup.

Private paths and rule IDs can still reveal sensitive context. A malicious label can encode data. Redaction is not a complete DLP system. A human must inspect private reports before sharing them. The skill must not load raw imports or target contents into the model.

Codex/Claude Code send messages and tool output to their own providers according to their configuration. The skill cannot change their retention or stop other tools at OS level. v0.1 is not suitable where policy prohibits any metadata leaving the computer unless the host is independently configured for local inference.

## Failure handling

A denied path, malformed report, incompatible root, expired/revoked scope or ambiguous coverage stops the affected command with a stable error code. No fallback reader or automatic scope expansion. Local report writes are atomic. Individual review commands may be repeated; names explicitly select which local artifacts are replaced.

Demo only changes a newly created synthetic temporary copy. The real review/import/retest tools never modify the target.
