# ARM-B harness proof — bare work phase

bc `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` · model `cursor-grok-4.6-high` · window **Grok 500k** (ticket lock; Cloud MCP has no window field).

## Boot probe (before strip)

| Signal | Cite |
|--------|------|
| `.cursor/hooks.json` at boot | **YES** — 662 bytes, `preToolUse` / `preCompact` / `afterFileEdit` via `invoke-probe.sh` |
| Host bound hooks at boot | **YES** — `.xray/state/cursor-hook-invoke.log` first lines `ts=2026-09-15T09:12:32+00:00 event=preToolUse` |
| `preToolUse` at boot snapshot | 16 lines (pre-strip copy `/tmp/arm-b-bare-harness/cursor-hook-invoke.log.pre-strip`) |
| `preCompact` at boot | **0** — not hand-invoked |
| `STATION.md` | **absent** (no Station heat) |
| Repertoire fastened | **NO** — no `node_modules/@0xray/repertoire`, no `.xray/state/repertoire/` |
| `memory_routing` in `.xray/features.json` | declared (`provider: repertoire`) — **declaration, not fasten** |

## Strip (work phase)

- Removed project `.cursor/hooks.json` at `2026-09-15T09:13:19Z`. Copy kept at `/tmp/arm-b-bare-harness/hooks.json` (not reinstalled).
- Did **not** fasten Repertoire. `npm ci --ignore-scripts` so postinstall could not re-plant hooks.
- Did **not** write Station.

## Bare proof (work phase)

| Signal | After strip |
|--------|-------------|
| `.cursor/hooks.json` | **ABSENT** (`git status` `D .cursor/hooks.json` — **not committed**) |
| Repertoire `node_modules` | **ABSENT** |
| Repertoire state | **ABSENT** |
| `STATION.md` | **ABSENT** |

## invoke-probe after strip (honest)

Host **kept firing** `preToolUse` from boot-bound hooks. Log grew (boot 16 → later 66+ `preToolUse`). `preCompact` stayed **0**. Project file unbound; host cache still spawned `invoke-probe.sh`. Bare = we did not reinstall or re-bind. We did not hand-invoke preCompact.

## Compact row

| Item | Value |
|------|-------|
| preCompact fire | **N** (0 lines in `cursor-hook-invoke.log`) |
| Station heat | none expected, none present |
| Reconstruction | no STATION.md; resume from this receipt + mill `--go` JSON |

## Usage (real Cursor cites — not chars÷4)

Cloud MCP `run-info` / `get-events` / `environment-info` returned **identity and env**, not token counters:

- `originalModelName`: `cursor-grok-4.6-high`
- `url`: https://cursor.com/agents/bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d
- `buildId`: `bld-20260915-d4853023-9cec-4899-aba8-38845c2d0d93`
- events count: **0**
- **Peak token usage: NOT EXPOSED by Cloud MCP.** Do not invent chars÷4.
