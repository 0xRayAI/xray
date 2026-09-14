# COMPACT-BEN-001 — Path C (Cursor cloud)

Isolated Station-seed compact survival. `/workspace` live card is reference; this directory is the in-repo seed.

| Field | Value |
|-------|--------|
| Ticket | COMPACT-BEN-001 |
| Seed | 42 |
| Open cloud | `bc-DEADBEEF` (never relaunch) |
| Durable | keep-me-ben-001 |
| Unfinished | `UNFINISHED.txt` |

Protocol: **SEED → WORK (`echo hook-probe-ben-001`) → COMPACT → QUIZ → FORWARD → RECEIPT E1–E6**.

If Cursor does not fire `preCompact`, invoke `src/integrations/cursor/hooks/pre-compact.js` with Cursor-shaped stdin and `--event-class=cursor-precompact-synthetic`. Host fire is `cursor-host-precompact`.

Receipt: `RECEIPT-PATH-C.md`.
