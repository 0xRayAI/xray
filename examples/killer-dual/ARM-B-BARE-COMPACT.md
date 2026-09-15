# ARM B (bare) — host compact survival

Arm B on `0xRayAI/xray`. Harness stayed **bare** after boot (project `.cursor/hooks.json` stripped; Repertoire not fastened). Did **not** hand-invoke `pre-compact.js`. Did **not** restore hooks for the work phase. Did **not** expand parked mill-GO PR #54.

**Survived.** Host compacted this conversation more than once. The successor continued the same card from Cursor’s summary plus on-disk work. At the first fires the Grok hot-swap `STATION.md` was never written. At **10:41:27Z** the fixed writer left the card; Grok still does not inject it — Read it.

Friend-test: **a friend would hear: the first host fires logged `preCompact` and the writer died; then while reading logs until compaction the host summarized again, boot-cached hooks still spawned with `.cursor/hooks.json` stripped, and the fixed writer actually left the card and receipt — still no tokens, still no Repertoire on `node_modules`.**

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
| Host compact | **yes** — Cursor: “Your conversation was summarized due to context constraints” (fires at 09:35, 09:38, **and 10:41**) |
| `preCompact` probe | **yes** — host lines in `.xray/state/cursor-hook-invoke.log` |
| Station card at first fires | **no** — writer crashed (`delegation-gate.js` missing) |
| Station card at 10:41:27Z | **yes** — `.xray/state/STATION.md` mtime matches the probe |
| `cursor-precompact.json` at 10:41:27Z | **yes** — `event_class=cursor-host-precompact`, `trigger=auto`, this `sessionId` |
| Compact class | `cursor-host-precompact` · Station write **FAIL** at 09:35/09:38, **PASS** on live host fire after lazy-load |
| Adapter class | `delegation-gate-dist-missing` → **fixed** (`delegation-gate-runtime.mjs` lazy-load) |
| Original collab map | `examples/killer-dual/TRANSITION-MAP.md` — PreToolUse ≠ PreCompact; Grok Bot `survive-compact` is a separate path. Do not rerun Path C. |
| Mailbox | `examples/killer-dual/NOTES-EXCHANGE.md` |
| Critic | Prefer #56 CLI · park #54 · keep #57 for dist-miss writer · #55 is S survive/usage/map |

## Verdict

| Question | Answer |
|----------|--------|
| Did we hit compaction? | **yes** — host summary cuts + probe `event=preCompact` (09:35, 09:38, **10:41**) |
| Did Arm B survive? | **yes** — this continuation kept the same card / same `bc-12f1ecad` |
| Did `STATION.md` reconstruct? | **FAIL** at first fires · Path C **PASS** · live host **PASS** at 10:41:27Z |
| `hooks.json` on disk at 10:41 compact? | **no** (still stripped). Boot cache still spawned `preCompact` |
| Boot-cached hooks still spawned? | **yes** — `preToolUse` / `afterFileEdit` / `preCompact` after the strip |
| Repertoire fastened? | **no** (`node_modules/@0xray/repertoire` absent). Heat still says **on** from vendor dist |

Do **not** claim merge-on-compact for the original 09:35/09:38 fires. There was no live Station then. Do **not** treat the 09:55 Path C / repair invokes as that later host fire. The 10:41:27Z line is a new host `preCompact` (probe between `preToolUse`, receipt `trigger=auto`, no hand-invoke of `pre-compact.js`).

## Real usage cite (no chars÷4)

`cursor-cloud` `run-info` / `get-events` expose **no** `context_tokens`, `context_usage_percent`, or `context_window_size`. Arm B `pre-compact.js` writes class/trigger/sessionId/timestamp only — it does **not** copy host usage fields onto `cursor-precompact.json`. After the 10:41 writer-lived fire, B still has **no** token cite of its own. Arm S (#55) parsed stdin (`tokens=232105`, `context_window_size=256000`). Never chars÷4.

| Source | Value |
|--------|--------|
| `run-info` URL | https://cursor.com/agents/bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d |
| `bcId` | `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` |
| Model | `cursor-grok-4.6-high` |
| Created | `2026-09-15T09:12:17.628Z` (`createdAtMs` 1789463537628) |
| Last message activity | `2026-09-15T09:38:17.880Z` (`lastMessageActivityAtMs` 1789465097880) |
| `get-events` | `pr_created` #54 · `artifact_created` `arm_b_forge_go_receipt.json` — **no usage counters** |
| Host compact | context-constraints summary (this continuation) |
| Probe `preCompact` (host) | `09:35:46Z`, `09:38:20Z`, **`10:41:27Z`** |
| Probe `preCompact` (repair, not host) | `09:55:34Z`, `09:55:48Z` |
| Live receipt after 10:41 | `event_class=cursor-host-precompact` · `trigger=auto` · `sessionId=bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` · **no** `context_tokens` / `context_window_size` keys |

**Peak real usage (claim this):** host compact fired on this run (summary + host invoke-probe `event=preCompact`). Cloud MCP has no token count. B receipt after writer-lived fire still has no usage fields. Cite S for 232105 / 256000.

## DIAG

| Field | Value |
|-------|--------|
| `hooks-at-boot` | **YES** — `.cursor/hooks.json` present at 09:12 boot (mtime Sep 15 00:58 in snapshot); stripped later for bare work |
| Harness during compact | **bare** — `HOOKS=no` on disk, `REPERTOIRE=no`, `.cursor/hooks/invoke-probe.sh` still on disk |
| Window size | **not on B receipt.** S host stdin: **256000**. Ticket lore 500k is not that number. Never chars÷4 |
| host `preCompact` spawn | **yes** (auto; not manual; not synthetic) — including post-fix **10:41:27Z** |
| Station / receipt write at 09:35/09:38 | **no** (`delegation-gate-dist-missing`) |
| Station / receipt write at 10:41:27Z | **yes** (lazy-load writer; hooks.json still absent; Repertoire still unfastened) |
| root-cause class (first fires) | **`delegation-gate-dist-missing`** after a real host spawn |
| next lever (exactly one) | **Closed for E2.** Post-fix host fire wrote the card. Tokens stay on #55. |

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
| Compact #1 (writer died) | burst at 09:35:42–09:35:43Z | (earlier) | **`09:35:46+00:00`** |
| Compact #2 (writer died) | burst at 09:38:18Z | — | **`09:38:20+00:00`** |
| Repair / Path C (not host) | — | — | `09:55:34Z`, `09:55:48Z` |
| Compact #3 (writer lived) | burst at 10:41:27Z (Read) then 10:42:24Z | — | **`10:41:27+00:00`** |

Exact host lines:

```
ts=2026-09-15T09:35:46+00:00 event=preCompact cwd=/workspace node=/exec-daemon/node
ts=2026-09-15T09:38:20+00:00 event=preCompact cwd=/workspace node=/exec-daemon/node
ts=2026-09-15T10:41:27+00:00 event=preCompact cwd=/workspace node=/exec-daemon/node
```

`cwd=/workspace` · `node=/exec-daemon/node`.

## E5 Quiz (honest)

| Question | Answer |
|----------|--------|
| Ticket / seed card? | **PASS** on Path C tmp (`/tmp/arm-b-compact-Xnv5`) — Ticket COMPACT-BEN-001, Seed 42, bc-DEADBEEF, keep-me-ben-001 |
| Live Station? | **yes** — Path C repair, then **host-written** at 10:41:27Z (`Working: last pre_compact @ 55bdfb32a`) |
| Open cloud? | `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` — same run, not relaunched |
| What next? | Sit. Prefer #56 CLI / #55 usage printer. Park #54. Do not FILL. Do not fasten repertoire. |

Survive: **yes**. Adapter Station write: **PASS** (tests 15/15, Path C quiz, **and** live host fire at 10:41:27Z).

## Repair (same exercise until PASS)

Root cause was import-time `delegation-gate.js missing`. Fix: `src/integrations/hooks/delegation-gate-runtime.mjs` lazy-loads dist; fallback still blocks `rm -rf /` and still writes Station.

| Step | Result |
|------|--------|
| `npx vitest run src/__tests__/unit/cursor-hooks.test.ts src/__tests__/unit/grok-bot-seat-ready.test.ts` | **15/15** (includes dist-absent compact + destructive deny) |
| `npm run build` | `dist/nucleus/delegation-gate.js` present |
| Path C via `invoke-probe.sh` → `pre-compact.js` | stdout `event_class=cursor-host-precompact`; quiz **PASS** |
| Live `preToolUse` Read | `{"permission":"allow"}` |
| Live Station + receipt | `.xray/state/STATION.md` and `cursor-precompact.json` present |

The two extra `event=preCompact` probe lines at 09:55:34Z / 09:55:48Z are this repair invoke (tmp + live), not a new host compact.

## Post-fix host fire (10:41:27Z)

User: **read logs until compaction.** Main thread kept reading `logs/framework/activity.log.orig` (Jan 2026 processor/session noise). Did **not** hand-invoke `pre-compact.js`. Did **not** restore `.cursor/hooks.json`. Did **not** put `@0xray/repertoire` on `node_modules`.

Those Reads are **not** a proven compact trigger. The same file slices (L801–4801) are HOST-FIRE #3–#5 FILL (**FAIL**, 0 `preCompact`). This run had already compacted at 09:35 and 09:38 from real work. 10:41 fired during later offsets with **no before-snapshot** and **no B tokens**. Class: already-hot window + more conversation tokens. Repeatable quiz: `grok-bot/ops/COMPACT-QUIZ.md` (do not FILL).

Host summarized this conversation. Probe logged `event=preCompact` at **10:41:27Z** between `preToolUse` at the same second and more `preToolUse` at 10:42:24Z.

| Artifact | mtime | What it shows |
|----------|-------|----------------|
| `.xray/state/cursor-hook-invoke.log` | 10:42+ | host `preCompact` line |
| `.xray/state/cursor-precompact.json` | **10:41:27.882Z** | `cursor-host-precompact`, `trigger=auto`, this bc, **no usage keys** |
| `.xray/state/STATION.md` | **10:41:27.882Z** | Host cursor (frontier). Intent `(none yet)`. Plan = HEAD commit. `Repertoire: on` (vendor heat). `Working: last pre_compact @ 55bdfb32a` |
| `.xray/state/session-boot.json` | **10:41:27.882Z** | `source=0xray/cursor-compact`, same timestamp, same heat |
| Disk harness | — | `HOOKS=no` · `REP=no` |

`pre-compact.js` still does not persist `context_tokens` or `context_window_size`. Writer-lived ≠ B measured the window. Cite S for 256000.

## Out of scope

Mill inspect `--go` / PR #54 expansions · chars÷4 fill claims as usage proof · fastening Repertoire.
