# Coverage and verification boundaries

Local review records rule-level outcomes and lists skipped files. An inconclusive check or skipped file is not a clean result; a zero-finding report is not proof of security. Read failures abort the review rather than producing a successful partial report. Only exact approved files are read.

Discovery and verification are separate: a local retest may confirm only a local-rule finding, using a fresh matching rule result and live file digest. Imported scanner findings remain independent even when their rule IDs and locations collide with local rules; a local check cannot verify that scanner's semantics. An unavailable or stale check remains insufficient data. No target code is executed.

The separation of discovery, validation and fix verification, and the emphasis on documenting coverage limitations, were informed by [OpenAI Codex Security agent workflows at commit 2911786f243f08fd61ad854f5c527e7b0c404ccc](https://github.com/openai/codex-security/blob/2911786f243f08fd61ad854f5c527e7b0c404ccc/docs/agent-workflows.md). This implementation is original; it does not implement that project's sandbox or execution workflows.
