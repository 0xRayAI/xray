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
| `RECEIPT-HOST-PRECOMPACT-4.md` | `cursor-host-precompact-FAIL` | HOST-FIRE#4 + DIAG. `hooks-at-boot: YES`. Live `preToolUse`. FILL ≥85% of 128k (~22.8% of 500k). Context-constraints summary did not emit `preCompact`. Class: `host-never-emits`. |
| `RECEIPT-HOST-PRECOMPACT-5.md` | `cursor-host-precompact-FAIL` | HOST-FIRE#5. Window locked **500k**. `hooks-at-boot: YES`. Live `preToolUse`. FILL **110.49% of 500k**. Host did not fire `preCompact`. Class: `host-never-emits-at-500k`. |

EVAL: do not upgrade FAIL to `cursor-host-precompact` without `.xray/state/cursor-precompact.json` (or invoke-probe `event=preCompact`) written by the **host**. A session that boots before `.cursor/hooks.json` exists will not bind project hooks mid-run. #5 closed the 500k fill bar; remaining gap is host emit.

Suited follow-on (KILLER-DUAL Arm S): `examples/killer-dual/` — real-usage receipt, no chars÷4 FILL.
