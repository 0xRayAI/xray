# Segment 1 — the word (plain arm, rerun-dummy-b2)

## Session

- Cloud agent id: `bc-18a1a9f2-6924-57ab-9e13-004074b4643d`
- Branch: `cursor/ben-transition-map-fbe0`
- Codeword minted before long read: **KELP-7MIRROR** (written to `data/lessons.jsonl` at conversation start)

## Qualifying cut

Required for this segment’s post-cut recall step:

- `.xray/state/cursor-hook.log` line for this session id
- `.xray/state/cursor-receipts/<sessionId>.json`
- `model`: composer-2.5
- `context_window_size`: 200000
- `context_tokens` > 100000
- Codeword minted before the cut

**Result:** cut **not qualified** in this run. At check time, `/agent/repos/xray/.xray/state/cursor-hook.log` was absent and `/agent/repos/xray/.xray/state/cursor-receipts/bc-18a1a9f2-6924-57ab-9e13-004074b4643d.json` was absent. No host `preCompact` proof landed for this session during the fill.

## Chat recall (without opening `lessons.jsonl`)

Attempt from conversation memory only:

**KELP-7MIRROR**

Note: without a qualifying compaction cut, this is still pre-cut active context, not proof that chat survives compaction.

## File on disk (separate check)

`examples/ben-proof/rerun-dummy-b2/data/lessons.jsonl` still contains:

```json
{"codeword":"KELP-7MIRROR","mintedAt":"2026-09-25T09:34:00Z","note":"segment-1 proof token"}
```

## Expected shape (when a real cut happens)

- The jsonl file can still hold the word after compaction.
- Chat memory alone should not reliably return the codeword after a qualifying cut (plain arm has no Repertoire organ).

## Segment 2

Not started — segment 1 cut was not proven.
