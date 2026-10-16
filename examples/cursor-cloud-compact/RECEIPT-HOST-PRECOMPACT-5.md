# RECEIPT-HOST-PRECOMPACT-5 — COMPACT-BEN-001 HOST-FIRE #5 (Blaze GO via forge)

Fifth HOST-FIRE. Fresh ship (not a resume of #4 `bc-ac93996a`). Goal: lock the **real 500k** window, fill to **≥85% of 500k (~425k+ tokens)**, and prove or falsify live Cursor `preCompact` on cloud. DETECT only via disk (`.xray/state/cursor-precompact.json` / Station `Working: last pre_compact` / invoke-probe `event=preCompact`). QUIZ. RECEIPT.

**Did not** invoke `src/integrations/cursor/hooks/pre-compact.js` by hand. **Did not** `git pull` as a hook-binding fix. **Did not** use Path C synthetic stdin. **Did not** relaunch `bc-DEADBEEF`. **No npm. No Clearing. No fake PASS.**

Friend-test: **A friend would hear: we tried to fill the real 500k window past 85% to see if Cursor’s live compress runs our hook.**

| | |
|--|--|
| Ticket | COMPACT-BEN-001 |
| Seed | 42 |
| Open cloud (never relaunch) | `bc-DEADBEEF` |
| This cloud run | `bc-0d0fa300-5a23-54d2-ae9b-e4c7b540959e` |
| Durable | keep-me-ben-001 |
| Unfinished marker | `examples/cursor-cloud-compact/UNFINISHED.txt` |
| Branch | `cursor/host-fire-5-precompact-959e` |
| Checkout at boot | `6fd253d80` — *Merge pull request #52 from 0xRayAI/cursor/host-fire-4-precompact-b223* |
| Window locked | **500k** (Blaze/fleet lock for this track; env/API expose no `context_window_size`) |
| Peak fill | **110.49% of 500k** (552,466 tokens, UTF-8 chars ÷ 4) |
| Compact `event_class` | **`cursor-host-precompact-FAIL`** |
| Protocol `event_class` | **`host-never-emits-at-500k`** |

Host `preCompact` **did not fire**. Hooks **were bound at boot** and `preToolUse` **did spawn**. Fill reached **110.49% of the locked 500k window** (past the 85% bar). Context-constraints summaries occurred during FILL and again as this receipt continuation — **after those cuts, all three host-evidence detectors stayed negative**. Seed keys **survived** because they were planted on disk and nothing compacted/wiped them.

Do **not** label this run `cursor-host-precompact`.

## DIAG

| Field | Value |
|-------|--------|
| `hooks-at-boot` | **YES** |
| Window size locked | **500k** — no host-reported window in UI/API/env (`CURSOR_AGENT=1`, `CURSOR_CONVERSATION_ID=bc-0d0fa300-5a23-54d2-ae9b-e4c7b540959e` only). **Cite Blaze/fleet lock.** Never used 128k as the denominator. 128k cited only as a contrast: peak fill is 431.61% of 128k. |
| max context % observed | **110.49% of 500k** (fill-only). Host %: **none** |
| method | UTF-8 chars of Read-ingested files ÷ 4. Counted from disk after ingest (`python3`). No UI badge. No tokenizer. Host `context_usage_percent` / `context_tokens` / `context_window_size` exist **only** on `preCompact` stdin (never arrived). System prompt + prior tool results are **not** in the fill sum (would only raise %). |
| host preCompact | **no** (not auto, not manual) |
| root-cause class | **`host-never-emits-at-500k`** |
| next lever (exactly one) | **Do not run another Grok 4.6 500k FILL.** #4’s residual (`fill-too-low` vs 500k) is closed. Cloud context-constraints summarization still does not spawn project `preCompact`. The remaining question is host/product: emit `preCompact` to bound project hooks, or document that cloud summarization is a different path. |

Bind, freshness, and fill-too-low-vs-500k are **ruled out** (`hooks-at-boot: YES`, `preToolUse` live, checkout post-#45/#52, peak **≥85% and past 100% of 500k**).

## Verdict

| Question | Answer |
|----------|--------|
| `hooks-at-boot` | **YES** — continued HOST-FIRE (no STOP) |
| `.cursor/hooks.json` at boot? | **yes** (`-rw-r--r--` 662 bytes, mtime Sep 15 00:58) |
| `pre-compact.js` at boot? | **yes** (2283 bytes) |
| Host preCompact? | **no** — FILL 5 waves past 85%/500k + context-constraints summaries; detectors stayed empty |
| preToolUse spawn? | **yes** — `.xray/state/cursor-hook-invoke.log` |
| Disk allow JSON? | **no** — tools ran; no `{"permission":"allow"}` file |
| Seed survive (live Station)? | **yes** (disk quiz; compact never ran) |
| Receipt | `examples/cursor-cloud-compact/RECEIPT-HOST-PRECOMPACT-5.md` |

## PHASE 0 — Boot evidence (first 60s, before any git pull)

Checked **before** any fetch used as a hook fix. No `git pull` this run.

| # | Fact | Value |
|---|------|--------|
| 1 | Time | `2026-09-15T08:39:32Z` |
| 1 | `git rev-parse HEAD` | `6fd253d808b814fbe10bcd6bc0a3e4109626de4d` |
| 1 | `git log -1 --oneline` | `6fd253d80 Merge pull request #52 from 0xRayAI/cursor/host-fire-4-precompact-b223` |
| 2 | `/workspace/.cursor/hooks.json` | **present** — `-rw-r--r--` 662 bytes, mtime Sep 15 00:58. Sibling: `.cursor/hooks/invoke-probe.sh` (`-rwxr-xr-x` 625 bytes). `preCompact` command bound to `invoke-probe.sh` → `pre-compact.js`. |
| 3 | `src/integrations/cursor/hooks/pre-compact.js` | **present** — 2283 bytes. Siblings: `pre-tool-use.js`, `after-file-edit.js`, `cursor-hook-utils.js` |
| 4 | Build / snapshot / env | see table below |
| 5 | Label | **`hooks-at-boot: YES`** |

Live `.xray/state/STATION.md` was **absent at boot** (Grok hot-swap card not injected). `.xray/state/cursor-precompact.json` absent. Branch at boot: `main` at `6fd253d80`, then `cursor/host-fire-5-precompact-959e` for the receipt.

### Build / snapshot / env (cite)

| Source | Value |
|--------|--------|
| `cursor-cloud` `run-info` | `bc-0d0fa300-5a23-54d2-ae9b-e4c7b540959e` — https://cursor.com/agents/bc-0d0fa300-5a23-54d2-ae9b-e4c7b540959e |
| Run name | HOST-FIRE #5 — Grok 500k ≥85% preCompact |
| Model | `cursor-grok-4.6-high` (`originalModelName`) |
| Run created | `2026-09-15T08:39:04.618Z` (`createdAtMs` 1789461544618) |
| Env | `3bdf392a-aebd-11f1-bf4b-42ffb4d10ea7` (`RUNTIME_FORWARD_FILL`, personal) — https://cursor.com/dashboard/cloud-agents/environments/e/3bdf392a-aebd-11f1-bf4b-42ffb4d10ea7 |
| Boot build / snapshot | `bld-20260915-d4853023-9cec-4899-aba8-38845c2d0d93` |
| `gitSetup` | `reuse` |
| `warmFork` | `warm_fork` |
| Env vars | `CURSOR_CONVERSATION_ID=bc-0d0fa300-5a23-54d2-ae9b-e4c7b540959e`, `CURSOR_AGENT=1` — **no** host-reported `context_window_size` |
| `cursor-cloud` `get-events` | empty (0 events) at boot and at receipt |

Snapshot is **post-#45/#52** (adapter + hooks on `main`; HEAD is the #4 receipt merge). Binding is not the blocker.

## E1 Seed

Copied `examples/cursor-cloud-compact/STATION.seed.md` → `.xray/state/STATION.md` (gitignored live card). In-repo `UNFINISHED.txt` already on main.

Present on the planted card:

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Durable: keep-me-ben-001
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt
- Git: n/a
- No `Working: last pre_compact`

`.xray/state/session-boot.json` is still **stale** snapshot leftover: `source=0xray/grok-pre-tool-use-boot`, `timestamp=2026-06-19T18:28:19.380Z`, `workspaceRoot=/Users/blaze/dev/xray`, no `host`. Same as HOST-FIRE #3/#4.

## E2 Work

```
$ echo hook-probe-ben-001
hook-probe-ben-001
```

**preToolUse spawn: YES.**

`.xray/state/cursor-hook-invoke.log` exists. First spawn `2026-09-15T08:39:16+00:00`. Node path: `/exec-daemon/node`. Wrapper: `.cursor/hooks.json` v1 → `sh .cursor/hooks/invoke-probe.sh` → adapter.

| When | Lines | preToolUse | afterFileEdit | preCompact |
|------|-------|------------|---------------|------------|
| After FILL detect (~08:46:39Z, prior turn) | 88 | 87 | 1 | **0** |
| At receipt detect (`2026-09-15T08:47:48Z`) | 91 | 90 | 1 | **0** |

Extra preToolUse lines after FILL are receipt-prep tools, not a compact. The single `afterFileEdit` is the SEED write of `.xray/state/STATION.md` (`2026-09-15T08:39:16+00:00`).

**Disk allow JSON: NO.** `logs/framework/activity.log` still **ABSENT** (only `activity.log.orig` from the snapshot). `.xray/state/session-boot.json` still stale (see E1). Tools ran (not denied). **Did not** diagnose by invoking `pre-compact.js`.

## E3 Compact (host)

**Not observed. Honest FAIL.** Do **not** label `cursor-host-precompact`. Use compact class `cursor-host-precompact-FAIL` and protocol class **`host-never-emits-at-500k`**.

No Cursor `preCompact` payload (`trigger`, `context_tokens`, `context_usage_percent`, `hook_event_name`) reached the adapter.

| Detector | Result |
|----------|--------|
| `.xray/state/cursor-precompact.json` | **absent** |
| Station `Working: last pre_compact` | **absent** |
| invoke-probe `event=preCompact` | **0** |
| Host `context_tokens` / `%` | **none** (those fields exist on hook stdin only when `preCompact` runs) |

Fired? **`no`** (not auto, not manual). Log cite: `.xray/state/cursor-hook-invoke.log` at `2026-09-15T08:47:48Z` — 91 lines, 90 `preToolUse`, 1 `afterFileEdit`, **0** `preCompact`. Last line: `ts=2026-09-15T08:47:48+00:00 event=preToolUse ... node=/exec-daemon/node`.

During FILL the host summarized this conversation (“due to context constraints”) more than once. This receipt turn is itself a post-summary continuation. After those cuts the three detectors were still empty. Those summaries are **not** `cursor-host-precompact` (no disk evidence). They **are** claimed as: compact-like host cuts happened and **did not** run the bound project hook — now measured against the locked 500k window past 85%.

### FILL volume (5 waves) + context % of 500k

In-repo Reads only, into **this** conversation (not subagent windows). Not `pre-compact.js`. Not Clearing. Not npm. No mid-fill relaunch.

**Denominator: 500k** (Blaze/fleet lock). 85% bar = **425k tokens**.

| Wave | Ingested (Read into this conversation) | chars | Fill tokens (÷4) | % of 500k | Host preCompact |
|------|----------------------------------------|-------|------------------|-----------|-----------------|
| 1 | `logs/framework/activity.log.orig` lines 1–6400 | 687,733 | 171,933 | 34.39% | no |
| 2 | lines 6401–12800 | 640,695 | 160,174 | 32.03% | no |
| 3 | lines 12801–14809 (EOF) | 201,470 | 50,368 | 10.07% | no |
| — | cumulative after waves 1–3 (full `activity.log.orig`) | 1,529,898 | 382,474 | **76.49%** | no — below 85%, continued |
| 4 | `docs-site/package-lock.json` lines 1–4800 | 182,142 | 45,536 | 9.11% | no |
| — | cumulative after wave 4 | 1,712,040 | **428,010** | **85.60%** | no — bar met; continued |
| 5 | lock remainder lines 4801–18195 (EOF) | 497,822 | 124,456 | 24.89% | no |

**Peak (claim this):** full `activity.log.orig` + full `docs-site/package-lock.json` = **2,209,862 chars** = **552,466 tokens** = **110.49% of 500k**. Host preCompact = **no**.

Clear wall: hooks bound + preToolUse live + cumulative ingest **past 85% and past 100% of 500k** + context-constraints summaries. Host still did not emit `preCompact`. Stopped rather than fake.

## E4 Merge (not wipe)

Host compact / Station merge **did not run**. Custom keys still present **once** on the planted card (unchanged heat: `Git: n/a`, no `Working: last pre_compact`):

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt
- `## Durable` keep-me-ben-001
- `## Seed` Never relaunch bc-DEADBEEF

This is **not** proof of merge-on-compact (that remains Path C + unit tests + PR #43). It is proof the seed file was not deleted during FILL or the summary cuts.

## E5 Quiz (from disk, no cold-start)

Read `.xray/state/STATION.md` + `UNFINISHED.txt` after FILL/DETECT (`2026-09-15T08:47:48Z`):

| Question | Answer on disk |
|----------|----------------|
| Ticket? | COMPACT-BEN-001 |
| Seed? | 42 |
| Open cloud? | bc-DEADBEEF — never relaunch |
| Durable? | keep-me-ben-001 |
| Unfinished? | `examples/cursor-cloud-compact/UNFINISHED.txt` still on disk |
| What next? | Continue this card. Do not relaunch. Do not claim host fire. |

Survive: **yes** (disk quiz; compact never ran). This is **not** merge-on-compact proof.

## E6 Forward

Same ticket, same seed, same `bc-DEADBEEF` (not relaunched). This managed run is `bc-0d0fa300-5a23-54d2-ae9b-e4c7b540959e`. Successor Reads the card.

A later HOST-FIRE still needs the **host** to write `.xray/state/cursor-precompact.json` with `event_class: cursor-host-precompact` (or invoke-probe `event=preCompact` + Station `Working: last pre_compact`). Binding is not the blocker. Fill vs 500k is not the blocker. Blind FILL on Grok 4.6 at 500k is not the next lever.

Until the host fires `preCompact`, do not upgrade this FAIL.

## Out of scope

Ben harness in Clearing · npm · adapter redesign · relaunch `bc-DEADBEEF` · synthetic compact · hand-invoke `pre-compact.js` · git-pull-as-fix · another Grok 4.6 500k FILL.
