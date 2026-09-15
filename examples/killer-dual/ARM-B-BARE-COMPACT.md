# ARM B (bare) — host compact survival

Arm B on `0xRayAI/xray`. Harness stayed **bare** after boot (project `.cursor/hooks.json` stripped; Repertoire not fastened). Did **not** hand-invoke `pre-compact.js`. Did **not** restore hooks for the work phase. Did **not** expand parked mill-GO PR #54.

**Survived.** Host compacted this conversation. The successor continued the same card from Cursor’s summary plus on-disk work. Grok hot-swap `STATION.md` was never written, so the AGENTS.md Read-the-card contract had nothing to inject.

Friend-test: **a friend would hear: Cursor did fire the compact hook, the probe logged it, and the Station writer still died before it could leave a card.**

| | |
|--|--|
| Arm | **B** (bare) |
| Cloud | `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` |
| Dashboard | https://cursor.com/agents/bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d |
| Run name | KILLER-DUAL Arm B — bare no hooks |
| Model | `cursor-grok-4.6-high` (`originalModelName` via `cursor-cloud` `run-info`) |
| Repo | https://github.com/0xRayAI/xray |
| Product branch | `cursor/grok-bot-seat-ready-372d` |
| Parked mill-GO | PR #54 · `cursor/forge-go-harness-inspect-372d` (do not expand) |
| Killer product | `npx grok-bot ready` / `doctor` — seat mill plant + hangar/Clearing next steps |
| Host compact | **yes** — Cursor: “Your conversation was summarized due to context constraints” |
| `preCompact` probe | **yes** — 2 lines in `.xray/state/cursor-hook-invoke.log` |
| Station card | **no** — `.xray/state/STATION.md` absent |
| `cursor-precompact.json` | **no** — absent |
| Compact class | `cursor-host-precompact` (probe detector) · Station write **FAIL** at host fire, **PASS** after adapter fix |
| Adapter class | `delegation-gate-dist-missing` → **fixed** (`delegation-gate-runtime.mjs` lazy-load) |
| Original collab map | `examples/killer-dual/TRANSITION-MAP.md` — PreToolUse ≠ PreCompact; Grok Bot `survive-compact` is a separate path. Do not rerun Path C. |

## Verdict

| Question | Answer |
|----------|--------|
| Did we hit compaction? | **yes** — host summary cut + 2× `event=preCompact` |
| Did Arm B survive? | **yes** — this continuation kept the product job; uncommitted seat-ready files were still on disk |
| Did `STATION.md` reconstruct? | **yes after fix** — live card present; Path C quiz PASS |
| `hooks.json` on disk at compact? | **no** at host fire (stripped). Restored for the repair exercise |
| Boot-cached hooks still spawned? | **yes** — `preToolUse` / `afterFileEdit` / `preCompact` all logged after the strip |
| Repertoire fastened? | **no** |

Do **not** claim merge-on-compact for the original host fire. There was no live Station to merge then. After the loader fix, Path C seed keys survived compact merge (`Working: last pre_compact`).

## Real usage cite (no chars÷4)

`cursor-cloud` `run-info` / `get-events` expose **no** `context_tokens`, `context_usage_percent`, or `context_window_size`. Those fields exist on `preCompact` stdin; stdin never reached a successful adapter write. Do not invent a token meter.

| Source | Value |
|--------|--------|
| `run-info` URL | https://cursor.com/agents/bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d |
| `bcId` | `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` |
| Model | `cursor-grok-4.6-high` |
| Created | `2026-09-15T09:12:17.628Z` (`createdAtMs` 1789463537628) |
| Last message activity | `2026-09-15T09:38:17.880Z` (`lastMessageActivityAtMs` 1789465097880) |
| `get-events` | `pr_created` #54 · `artifact_created` `arm_b_forge_go_receipt.json` — **no usage counters** |
| Host compact | context-constraints summary (this continuation) |
| Probe `preCompact` | `2026-09-15T09:35:46+00:00` and `2026-09-15T09:38:20+00:00` |

**Peak real usage (claim this):** host compact fired on this run (summary + 2× invoke-probe `event=preCompact`). Cloud MCP has no token count.

## DIAG

| Field | Value |
|-------|--------|
| `hooks-at-boot` | **YES** — `.cursor/hooks.json` present at 09:12 boot (mtime Sep 15 00:58 in snapshot); stripped later for bare work |
| Harness during compact | **bare** — `HOOKS=no` on disk, `REPERTOIRE=no`, `.cursor/hooks/invoke-probe.sh` still on disk |
| Window size | **not reported** by host/MCP. 500k is the fleet lock for Grok 4.6; this receipt does **not** use chars÷4 as % of 500k |
| host `preCompact` spawn | **yes** (auto; not manual; not synthetic) |
| Station / receipt write | **no** |
| root-cause class | **`delegation-gate-dist-missing`** after a real host spawn |
| next lever (exactly one) | **Closed.** Lazy-load + `npm run build`. Path C quiz PASS. |

### Why the card never landed

1. Host spawned the bound `preCompact` command (boot cache). `invoke-probe.sh` logged `event=preCompact` **before** `exec node`.
2. Cached command: `sh .cursor/hooks/invoke-probe.sh src/integrations/cursor/hooks/pre-compact.js`.
3. `pre-compact.js` ESM-imports `cursor-hook-utils.js` → `delegation-gate-runtime.mjs`.
4. That loader throws at import time: `delegation-gate.js missing — run npm run build in 0xray or npm install 0xray`.
5. Confirmed on this VM (not an invoke of `pre-compact.js`): `/exec-daemon/node` import of `cursor-hook-utils.js` → `IMPORT_FAIL` same error. `src/nucleus/delegation-gate.ts` exists; **no** `dist/nucleus/delegation-gate.js` in the snapshot.
6. Same miss explains stale `.xray/state/session-boot.json` (still `0xray/grok-pre-tool-use-boot` / `workspaceRoot=/Users/blaze/dev/xray` / `2026-06-19T18:28:19.380Z`) despite 251 `preToolUse` + 28 `afterFileEdit` probe lines. Probe runs; Node adapters never finish.

HOST-FIRE #5 (`RECEIPT-HOST-PRECOMPACT-5.md`) filled past 85% of 500k and still had **0** `event=preCompact`. This Arm B work thread is the first probe-positive host fire in the series. Do not rewrite #5. Different run, different path.

## Probe log cite

File: `/workspace/.xray/state/cursor-hook-invoke.log`

| When | preToolUse | afterFileEdit | preCompact |
|------|------------|---------------|------------|
| Compact #1 | burst at 09:35:42–09:35:43Z | (earlier) | **`09:35:46+00:00`** |
| Compact #2 / this continuation | burst at 09:38:18Z | — | **`09:38:20+00:00`** |

Exact lines:

```
ts=2026-09-15T09:35:46+00:00 event=preCompact cwd=/workspace node=/exec-daemon/node
ts=2026-09-15T09:38:20+00:00 event=preCompact cwd=/workspace node=/exec-daemon/node
```

`cwd=/workspace` · `node=/exec-daemon/node`.

## E5 Quiz (honest)

| Question | Answer |
|----------|--------|
| Ticket / seed card? | **PASS** on Path C tmp (`/tmp/arm-b-compact-Xnv5`) — Ticket COMPACT-BEN-001, Seed 42, bc-DEADBEEF, keep-me-ben-001 |
| Live Station? | **yes** — `/workspace/.xray/state/STATION.md` after repair (`Working: last pre_compact`) |
| Open cloud? | `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` — same run, not relaunched |
| What next? | Land PR #57. Do not expand #54. |

Survive: **yes**. Adapter Station write: **PASS** (tests 15/15, Path C quiz, live card).

## Repair (same exercise until PASS)

Root cause was import-time `delegation-gate.js missing`. Fix: `src/integrations/hooks/delegation-gate-runtime.mjs` lazy-loads dist; fallback still blocks `rm -rf /` and still writes Station.

| Step | Result |
|------|--------|
| `npx vitest run src/__tests__/unit/cursor-hooks.test.ts src/__tests__/unit/grok-bot-seat-ready.test.ts` | **15/15** (includes dist-absent compact + destructive deny) |
| `npm run build` | `dist/nucleus/delegation-gate.js` present |
| Path C via `invoke-probe.sh` → `pre-compact.js` | stdout `event_class=cursor-host-precompact`; quiz **PASS** |
| Live `preToolUse` Read | `{"permission":"allow"}` |
| Live Station + receipt | `.xray/state/STATION.md` and `cursor-precompact.json` present |

The two extra `event=preCompact` probe lines after 09:38:20Z are this repair invoke (tmp + live), not a new host compact. Original host fires remain 09:35:46Z and 09:38:20Z.

## Out of scope

Mill inspect `--go` / PR #54 expansions · chars÷4 fill claims as usage proof · fastening Repertoire.
