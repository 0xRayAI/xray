# RECEIPT-HOST-PRECOMPACT-4 — COMPACT-BEN-001 HOST-FIRE #4 + DIAG

Fourth HOST-FIRE. Goal: boot a cloud whose checkout **already** contains `.cursor/hooks.json`, SEED COMPACT-BEN-001, WORK `echo hook-probe-ben-001`, FILL toward **≥85%** context (Blaze hypothesis: true auto-compact may need that), DETECT only via disk (`cursor-precompact.json` / Station `Working: last pre_compact` / hook `user_message` / invoke-probe `event=preCompact`), QUIZ, RECEIPT + DIAG.

**Did not** invoke `src/integrations/cursor/hooks/pre-compact.js` by hand. **Did not** `git pull` as a hook-binding fix. **Did not** use Path C synthetic stdin. **Did not** relaunch `bc-DEADBEEF`. **No npm. No Clearing.**

| | |
|--|--|
| Ticket | COMPACT-BEN-001 |
| Seed | 42 |
| Open cloud (never relaunch) | `bc-DEADBEEF` |
| This cloud run | `bc-ac93996a-a580-56a2-a003-600ba571b223` |
| Durable | keep-me-ben-001 |
| Unfinished marker | `examples/cursor-cloud-compact/UNFINISHED.txt` |
| Branch | `cursor/host-fire-4-precompact-b223` |
| Checkout at boot | `f0eefe08a` — *Merge pull request #51 from 0xRayAI/forge/grok-bot-0.1.2* |
| Compact `event_class` | **`cursor-host-precompact-FAIL`** |

Host `preCompact` **did not fire**. Hooks **were bound at boot** and `preToolUse` **did spawn**. Fill reached **≥85% of the 128k docs-example** (not of a host-reported window). Mid-run, Cursor summarized this conversation due to context constraints — **after that cut, all three host-evidence detectors stayed negative**. Seed keys **survived** because they were planted on disk and nothing compacted/wiped them.

Do **not** label this run `cursor-host-precompact`.

## DIAG

| Field | Value |
|-------|--------|
| `hooks-at-boot` | **YES** |
| max context % observed | **~88.9% of 128k** / **~22.8% of 500k** (fill-only). Host %: **none** |
| method | UTF-8 bytes of Read-ingested line ranges ÷ 4 chars-per-token. No UI badge. No `cursor-cloud` context meter. Host `context_usage_percent` / `context_tokens` / `context_window_size` exist **only** on `preCompact` stdin (never arrived). System prompt + prior tool results are **not** in the fill sum (would only raise %). |
| host preCompact | **no** |
| root-cause class | **`host-never-emits`** |
| next lever (exactly one) | **Do not run another Grok 4.6 blind FILL.** Confirm whether cloud-agent context-constraints summarization is supposed to invoke project `preCompact` (this run’s observed compact-like cut did not). |

Bind and freshness are **ruled out** (`hooks-at-boot: YES`, `preToolUse` live, checkout post-#45/#47/#51).

`fill-too-low` is a **residual, not the class**: we reached ≥85% of the 128k Path C / HOST-FIRE #1 docs example, and a context-constraints summary occurred. We did **not** reach ≥85% of a published Grok 4.6 500k window (~22.8% fill-only). Live window was never reported by the host. If that summarization is a different path than IDE `preCompact`, a 500k window would still be unfilled — that is why the next lever is **not** another blind FILL.

## Verdict

| Question | Answer |
|----------|--------|
| `hooks-at-boot` | **YES** — continued HOST-FIRE (no STOP) |
| `.cursor/hooks.json` at boot? | **yes** (`-rw-r--r--` 662 bytes, mtime 2026-09-14 23:50) |
| `pre-compact.js` at boot? | **yes** (2283 bytes) |
| Host preCompact? | **no** — FILL 4 waves + context-constraints summary; detectors stayed empty |
| preToolUse spawn? | **yes** — `.xray/state/cursor-hook-invoke.log` |
| Disk allow JSON? | **no** — tools ran; no `{"permission":"allow"}` file |
| Seed survive (live Station)? | **yes** (disk quiz; compact never ran) |
| Receipt | `examples/cursor-cloud-compact/RECEIPT-HOST-PRECOMPACT-4.md` |

## PHASE 0 — Boot evidence (first 60s, before any git pull)

Checked **before** any fetch used as a hook fix. No `git pull` this run.

| # | Fact | Value |
|---|------|--------|
| 1 | Time | `2026-09-15T00:01:49Z` |
| 1 | `git rev-parse HEAD` | `f0eefe08a99ae306daee79d8fdf832809780c386` |
| 1 | `git log -1 --oneline` | `f0eefe08a Merge pull request #51 from 0xRayAI/forge/grok-bot-0.1.2` |
| 2 | `/workspace/.cursor/hooks.json` | **present** — `-rw-r--r--` 662 bytes, mtime 2026-09-14 23:50. Sibling: `.cursor/hooks/invoke-probe.sh` (`-rwxr-xr-x` 625 bytes) |
| 3 | `src/integrations/cursor/hooks/pre-compact.js` | **present** — 2283 bytes. Siblings: `pre-tool-use.js`, `after-file-edit.js`, `cursor-hook-utils.js` |
| 4 | Build / snapshot / env | see table below |
| 5 | Label | **`hooks-at-boot: YES`** |

Live `.xray/state/STATION.md` was **absent at boot** (Grok hot-swap card not injected). `.xray/state/cursor-precompact.json` absent. `logs/framework/activity.log` absent (only `activity.log.orig` from the snapshot). Branch at boot: `main...origin/main` (clean), then `cursor/host-fire-4-precompact-b223` for the receipt.

### Build / snapshot / env (cite)

| Source | Value |
|--------|--------|
| `cursor-cloud` `run-info` | `bc-ac93996a-a580-56a2-a003-600ba571b223` — https://cursor.com/agents/bc-ac93996a-a580-56a2-a003-600ba571b223 |
| Run name | HOST-FIRE #4 + DIAG (≥85% context) |
| Model | `cursor-grok-4.6-high-fast` |
| Run created | `2026-09-15T00:00:51Z` (`createdAtMs` 1789430451187) |
| Env | `3bdf392a-aebd-11f1-bf4b-42ffb4d10ea7` (`RUNTIME_FORWARD_FILL`, personal) — https://cursor.com/dashboard/cloud-agents/environments/e/3bdf392a-aebd-11f1-bf4b-42ffb4d10ea7 |
| Boot build / snapshot | `bld-20260914-69d1d919-ebdc-4bac-bb1d-eaa94b1c1fe6` |
| `gitSetup` | `reuse` |
| `warmFork` | `warm_fork` |
| Env vars | `CURSOR_CONVERSATION_ID=bc-ac93996a-a580-56a2-a003-600ba571b223`, `CURSOR_AGENT=1` — **no** `bld-*` / `warm_fork` / snapshot id in process env |
| `cursor-cloud` `get-events` | empty (0 events) |
| `get-message-queue` | empty |

Snapshot is **post-#45/#47** (adapter + hooks on `main`). `#51` is the HEAD merge. Binding is not the blocker.

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

`.xray/state/session-boot.json` is still **stale** snapshot leftover: `source=0xray/grok-pre-tool-use-boot`, `timestamp=2026-06-19T18:28:19.380Z`, `workspaceRoot=/Users/blaze/dev/xray`, no `host`. Same as HOST-FIRE #3.

## E2 Work

```
$ echo hook-probe-ben-001
hook-probe-ben-001
```

**preToolUse spawn: YES.**

`.xray/state/cursor-hook-invoke.log` exists. First spawn `2026-09-15T00:01:36+00:00`.

| When | Lines | preToolUse | afterFileEdit | preCompact |
|------|-------|------------|---------------|------------|
| After FILL detect (~00:05:22Z) | 53 | 52 | 1 | **0** |
| After summary-cut detect (`2026-09-15T00:05:55Z`) | 61 | 60 | 1 | **0** |
| At receipt write | 78 | 74 | 4 | **0** |

Wrapper: `.cursor/hooks.json` v1 → `sh .cursor/hooks/invoke-probe.sh` → adapter. Node path in the log: `/exec-daemon/node`. Extra preToolUse lines after FILL are receipt-prep tools, not a compact.

**Disk allow JSON: NO.** `logs/framework/activity.log` still **ABSENT**. `.xray/state/session-boot.json` still stale (see E1). Tools ran (not denied). Path C’s allow JSON was synthetic stdin; this run does not treat that as host allow evidence. **Did not** diagnose by invoking `pre-compact.js`.

## E3 Compact (host)

**Not observed. Honest FAIL.** Do **not** label `cursor-host-precompact`. Use `event_class: cursor-host-precompact-FAIL`.

No Cursor `preCompact` payload (`trigger`, `context_tokens`, `context_usage_percent`, `hook_event_name`) reached the adapter.

| Detector | Result |
|----------|--------|
| `.xray/state/cursor-precompact.json` | **absent** |
| Station `Working: last pre_compact` | **absent** |
| invoke-probe `event=preCompact` | **0** |
| Hook `user_message` | **none** |
| Host `context_tokens` / `%` | **none** (those fields exist on hook stdin only when `preCompact` runs) |

Mid-run the host summarized this conversation (“due to context constraints”). After that cut, the three detectors were re-checked (`2026-09-15T00:05:55Z`) and were still empty. That summary is **not** claimed as `cursor-host-precompact` (no disk evidence). It **is** claimed as: a compact-like host cut happened and **did not** run the bound project hook.

### FILL volume (4 waves) + context %

In-repo Reads only. Not `pre-compact.js`. Not Clearing. Not npm.

Denominators cited, not assumed live:

- **128k** — Path C / HOST-FIRE #1 docs example (`context_window_size`)
- **500k** — published Grok 4.6 window (model is `cursor-grok-4.6-high-fast`)

Auto-compact in leaked Cursor forwarder is `budget = contextWindowSize - reserveTokens`, not a hard-coded 85%. exec-daemon `preCompact` case is a passthrough when the host sends `PreCompactRequestQuery`.

| Wave | Ingested (Read into this conversation) | Fill tokens (÷4) | vs 128k | vs 500k | Host preCompact |
|------|----------------------------------------|------------------|---------|---------|-----------------|
| 1 | activity.orig 1–600; docs-site lock 1–600; CHANGELOG 1–600; package-lock 1–600 | 37,429 | 29.2% | 7.5% | no |
| 2 | + activity 601–1000; CHANGELOG 601–1100; package-lock 601–1100; docs-site 601–1800 | 75,046 | 58.6% | 15.0% | no |
| 3 | + activity 1001–1400; CHANGELOG 1101–1500; package-lock 1101–1600; docs-site 1801–2300 | 101,578 | 79.4% | 20.3% | no |
| 4 | + activity 1401–1650; CHANGELOG 1501–1700; SKILLS.md full; llms.txt full | **113,780** | **88.9%** | **22.8%** | no |

**Max observed:** **~113.8k fill-only tokens** = **88.9% of 128k**, **22.8% of 500k**. Host % = **none**.

Named leftovers **not** fully ingested (could still grow toward 85% of 500k ≈ 425k tokens — not this lever):

| Artifact | On disk | Leftover |
|----------|---------|----------|
| `CHANGELOG.md` | 2774 lines | rest after ~1701 |
| `package-lock.json` | 4992 lines | rest after ~1601 |
| `docs-site/package-lock.json` | 18195 lines | rest after ~2301 |
| `logs/framework/activity.log.orig` | 14809 lines | rest after ~1651 |

Read tool refused `activity.log.orig` 800-line chunk (file 1.5MB exceeds 100k char max); 250–400 line chunks worked.

Clear wall: hooks bound + preToolUse spawning + four FILL waves + **≥85% of 128k** + a context-constraints summary. Host still did not fire `preCompact`. Stopped rather than fake.

## E4 Merge (not wipe)

Host compact / Station merge **did not run**. Custom keys still present **once** on the planted card (unchanged heat: `Git: n/a`, no `Working: last pre_compact`):

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt
- `## Durable` keep-me-ben-001
- `## Seed` Never relaunch bc-DEADBEEF

This is **not** proof of merge-on-compact (that remains Path C + unit tests + PR #43). It is proof the seed file was not deleted during FILL or the summary cut.

## E5 Quiz (from disk, no cold-start)

Read `.xray/state/STATION.md` + `UNFINISHED.txt` after FILL/DETECT and again after the summary cut (`2026-09-15T00:05:55Z` detect; card unchanged at receipt write):

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

Same ticket, same seed, same `bc-DEADBEEF` (not relaunched). This managed run is `bc-ac93996a-a580-56a2-a003-600ba571b223`. Successor Reads the card.

A later HOST-FIRE still needs the **host** to write `.xray/state/cursor-precompact.json` with `event_class: cursor-host-precompact` (or invoke-probe `event=preCompact` + Station `Working: last pre_compact` + hook `user_message`). Binding is not the blocker. Blind FILL on Grok 4.6 is not the next lever.

Until the host fires `preCompact`, do not upgrade this FAIL.

## Out of scope

Ben harness in Clearing · npm · adapter redesign · relaunch `bc-DEADBEEF` · synthetic compact · hand-invoke `pre-compact.js` · git-pull-as-fix · another Grok 4.6 blind FILL.
