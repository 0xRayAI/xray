# Segment 1 — the word (plain arm, rerun-dummy-b3)

## Session

- Cloud agent id: `bc-36d82ffb-44f9-530a-a06b-969137dd819d`
- Branch: `cursor/ben-transition-map-fbe0`
- Codeword minted before long read: **aurora-b3-1790338617** (appended to `data/lessons.jsonl` at session start)

## Qualifying cut

Required for post-cut recall and for reporting the keyword in chat:

- `.xray/state/cursor-hook.log` line containing `session_id=bc-36d82ffb-44f9-530a-a06b-969137dd819d`
- `.xray/state/cursor-receipts/bc-36d82ffb-44f9-530a-a06b-969137dd819d.json`
- Receipt usage: `model` composer-2.5, `context_window_size` 200000, `context_tokens` > 100000

**Result:** cut **not qualified** in this run. At final check, `cursor-hook.log` was absent (no line for this session) and `cursor-receipts/bc-36d82ffb-44f9-530a-a06b-969137dd819d.json` was absent. Host `preCompact` did not land proof on the xray workspace during this plain-arm fill (conversation summary may have compacted host context without writing hook artifacts).

## Chat recall (without opening `lessons.jsonl`)

Attempt from active conversation context only (not organ, not jsonl):

**aurora-b3-1790338617**

Without a qualifying compaction receipt pair, this is continuity from the mint step and summary handoff—not proof that chat survives a real cut.

## File on disk (separate check)

`examples/ben-proof/rerun-dummy-b3/data/lessons.jsonl` still holds:

```json
{"type":"lesson","codeword":"aurora-b3-1790338617","mintedAt":"2026-09-25T12:16:57Z","session":"bc-36d82ffb-44f9-530a-a06b-969137dd819d"}
```

A file on disk is allowed as a store; it is not chat memory.

## Expected shape

- The jsonl file can still hold the codeword after compaction.
- Chat memory alone should not reliably return the codeword after a qualifying cut on the plain arm (no suited `recall.mjs` / no `recordLesson` ingest into signals for this proof token).

## Segment 2

Not started — qualifying receipt pair never appeared.
