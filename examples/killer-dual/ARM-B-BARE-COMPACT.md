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
| Compact class | `cursor-host-precompact` (probe detector) · Station write **FAIL** |
| Adapter class | `delegation-gate-dist-missing` |

## Verdict

| Question | Answer |
|----------|--------|
| Did we hit compaction? | **yes** — host summary cut + 2× `event=preCompact` |
| Did Arm B survive? | **yes** — this continuation kept the product job; uncommitted seat-ready files were still on disk |
| Did `STATION.md` reconstruct? | **no** |
| `hooks.json` on disk at compact? | **no** (stripped after boot; keep bare) |
| Boot-cached hooks still spawned? | **yes** — `preToolUse` / `afterFileEdit` / `preCompact` all logged after the strip |
| Repertoire fastened? | **no** |

Do **not** claim merge-on-compact. There was no live Station to merge. Survival is host-summary + git working tree, not the Grok card.

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
| next lever (exactly one) | Make Cursor `pre-compact.js` write `cursor-precompact.json` + `STATION.md` **without** loading `dist/nucleus/delegation-gate.js`. Binding and host emit are no longer the blocker on this run. |

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
| Ticket / seed card? | **absent** — no live `STATION.md` this run |
| What survived? | Conversation summary · uncommitted `grok-bot` seat-ready tree · this report |
| Open cloud? | `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` — same run, not relaunched |
| What next? | Land `npx grok-bot ready` PR. Do not expand #54. Adapter dist-miss is the Station lever. |

Survive: **yes** (host summary + disk). Merge-on-compact: **not shown**.

## Out of scope

Hand-invoke `pre-compact.js` · restore `.cursor/hooks.json` for the work phase · fasten Repertoire · mill inspect `--go` / PR #54 expansions · chars÷4 fill claims as usage proof.
