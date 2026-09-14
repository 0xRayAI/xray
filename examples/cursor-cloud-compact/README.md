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

| Receipt | Compact class | Note |
|---------|---------------|------|
| `RECEIPT-PATH-C.md` | `cursor-precompact-synthetic` | PR #45. Manual stdin. Not host fire. |
| `RECEIPT-HOST-PRECOMPACT.md` | `cursor-host-precompact-FAIL` | HOST-FIRE#1 fill. Host did not spawn `preCompact`. Seed survived on disk. |
| `RECEIPT-HOST-PRECOMPACT-2.md` | `cursor-host-precompact-FAIL` | HOST-FIRE#2 retry. STOP: `.cursor/hooks.json` absent at boot (snapshot pre-#45). No FILL. |
| `RECEIPT-HOST-PRECOMPACT-3.md` | `cursor-host-precompact-FAIL` | HOST-FIRE#3. `hooks-at-boot: YES`. Live `preToolUse` spawn. FILL 4 waves. Host did not fire `preCompact`. |

EVAL: do not upgrade FAIL to `cursor-host-precompact` without `.xray/state/cursor-precompact.json` (or invoke-probe `event=preCompact`) written by the **host**. A session that boots before `.cursor/hooks.json` exists will not bind project hooks mid-run.
