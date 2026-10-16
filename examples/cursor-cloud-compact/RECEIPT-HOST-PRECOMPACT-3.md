# RECEIPT-HOST-PRECOMPACT-3 — COMPACT-BEN-001 HOST-FIRE #3

Third HOST-FIRE. Goal: boot a cloud whose checkout **already** contains `.cursor/hooks.json`, SEED COMPACT-BEN-001, WORK `echo hook-probe-ben-001`, FILL until the **host** auto-compacts, DETECT only via disk (`cursor-precompact.json` / Station `Working: last pre_compact` / hook `user_message`), QUIZ, RECEIPT.

**Did not** invoke `src/integrations/cursor/hooks/pre-compact.js` by hand. **Did not** `git pull` as a hook-binding fix. **Did not** use Path C synthetic stdin. **Did not** relaunch `bc-DEADBEEF`.

| | |
|--|--|
| Ticket | COMPACT-BEN-001 |
| Seed | 42 |
| Open cloud (never relaunch) | `bc-DEADBEEF` |
| This cloud run | `bc-fa4741ac-a7f1-503a-80af-3ee90f6d5339` |
| Durable | keep-me-ben-001 |
| Unfinished marker | `examples/cursor-cloud-compact/UNFINISHED.txt` |
| Branch | `cursor/host-fire-3-precompact-5339` |
| Checkout at boot | `c3795922a` — *HOST-FIRE retry STOP — hooks absent at boot (#47)* |
| Compact `event_class` | **`cursor-host-precompact-FAIL`** |

Host `preCompact` **did not fire**. Hooks **were bound at boot** and `preToolUse` **did spawn** (first time in this series). Seed keys **survived** because they were planted on disk and nothing compacted/wiped them.

Do **not** label this run `cursor-host-precompact`.

## Verdict

| Question | Answer |
|----------|--------|
| `hooks-at-boot` | **YES** — continued HOST-FIRE |
| `.cursor/hooks.json` at boot? | **yes** (`-rw-r--r--` 662 bytes, mtime 2026-09-14 20:27) |
| `pre-compact.js` at boot? | **yes** (2283 bytes) |
| Host preCompact? | **no** — FILL wall after four waves |
| preToolUse spawn? | **yes** — `.xray/state/cursor-hook-invoke.log` |
| Disk allow JSON? | **no** — tools ran; no `{"permission":"allow"}` file |
| Seed survive (live Station)? | **yes** (disk quiz; compact never ran) |
| Receipt | `examples/cursor-cloud-compact/RECEIPT-HOST-PRECOMPACT-3.md` |

## PHASE 0 — Boot evidence (first 60s, before any git pull)

Checked **before** any fetch used as a hook fix. `git fetch origin main` later was inspect-only (remote still `c3795922a`).

| # | Fact | Value |
|---|------|--------|
| 1 | `git rev-parse HEAD` | `c3795922ac230da99c75e90d7323ae416c9352b1` |
| 1 | `git log -1 --oneline` | `c3795922a docs(cursor): HOST-FIRE retry STOP — hooks absent at boot (#47)` |
| 2 | `/workspace/.cursor/hooks.json` | **present** — `-rw-r--r--` 662 bytes, mtime 2026-09-14 20:27. Sibling: `.cursor/hooks/invoke-probe.sh` (`-rwxr-xr-x` 625 bytes) |
| 3 | `src/integrations/cursor/hooks/pre-compact.js` | **present** — 2283 bytes. Siblings: `pre-tool-use.js`, `after-file-edit.js`, `cursor-hook-utils.js` |
| 4 | Build / snapshot / env | see table below |
| 5 | Label | **`hooks-at-boot: YES`** |

Live `.xray/state/STATION.md` was **absent at boot** (Grok hot-swap card not injected). `.xray/state/cursor-precompact.json` absent. `logs/framework/activity.log` absent (only `activity.log.orig` from the snapshot).

### Build / snapshot / env (cite)

| Source | Value |
|--------|--------|
| `cursor-cloud` `run-info` | `bc-fa4741ac-a7f1-503a-80af-3ee90f6d5339` — https://cursor.com/agents/bc-fa4741ac-a7f1-503a-80af-3ee90f6d5339 |
| Run name | HOST-FIRE #3 probe+fill (Build-aware) |
| Model | `cursor-grok-4.6-high-fast` |
| Run created | `2026-09-14T22:28:49.476Z` |
| Env | `3bdf392a-aebd-11f1-bf4b-42ffb4d10ea7` (`RUNTIME_FORWARD_FILL`, personal) — https://cursor.com/dashboard/cloud-agents/environments/e/3bdf392a-aebd-11f1-bf4b-42ffb4d10ea7 |
| Boot build / snapshot | `bld-20260914-21774f95-9cdc-45a9-b6ab-e519405e8f1d` |
| `gitSetup` | `reuse` |
| `warmFork` | `warm_fork` |
| Build created | `2026-09-14T20:27:16.959Z` |
| Build completed | `2026-09-14T20:29:29.032Z` |
| Build logs | clone `20:27:24Z`, “Your branch is up to date with origin/main”, snapshot created `20:27:38Z`, ready `20:29:08Z`, warming complete `20:29:28Z` |
| Newer SKIPPED | `bld-20260914-eeaaf4ae-6c66-454a-8daa-dc6ed63a0e4e` |
| Prior SUCCEEDED (HOST-FIRE #2, hooks absent) | `bld-20260914-e67210fc-672b-4876-961d-efb771202df2` |
| Env vars | `CURSOR_CONVERSATION_ID=bc-fa4741ac-a7f1-503a-80af-3ee90f6d5339`, `CURSOR_AGENT=1` — **no** `bld-*` / `warm_fork` / snapshot id in process env |
| `/etc` | no `bld-*` / snapshot / `warm_fork` files |
| `~/.cursor` | present (`agent-hooks`, `bin`, `plugins`, `projects`, `skills-cursor`); IDs above are from `cursor-cloud`, not these dirs |

Snapshot is **post-#47**. `#47` merged onto `main` as `c3795922a` (~20:01Z). Clone for this build ~20:27Z. Binding is no longer the blocker.

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

## E2 Work

```
$ echo hook-probe-ben-001
hook-probe-ben-001
```

**preToolUse spawn: YES** (first time this series).

`.xray/state/cursor-hook-invoke.log` exists. First spawn `2026-09-14T22:29:01+00:00`.

| When | Lines | preToolUse | afterFileEdit | preCompact |
|------|-------|------------|---------------|------------|
| After FILL detect (~22:32:03Z) | 65 | 63 | 2 | **0** |
| At receipt write (~22:33:21Z last line) | 79 | 77 | 2 | **0** |

Wrapper: `.cursor/hooks.json` v1 → `sh .cursor/hooks/invoke-probe.sh` → adapter. Node path in the log: `/exec-daemon/node`. Extra preToolUse lines after FILL are receipt-prep tools, not a compact.

**Disk allow JSON: NO.** `logs/framework/activity.log` still **ABSENT**. `.xray/state/session-boot.json` still stale (`source=0xray/grok-pre-tool-use-boot`, `timestamp=2026-06-19T18:28:19.380Z`, `workspaceRoot=/Users/blaze/dev/xray`, no `host`). Tools ran (not denied). Path C’s allow JSON was synthetic stdin; this run does not treat that as host allow evidence. `cursorBootNeedsRefresh` should have rewritten boot (existing host ≠ cursor) — invoke-probe ran; the node adapter likely did not complete `appendHookActivity` / `ensureCursorSessionBoot`. **Did not** diagnose by invoking `pre-compact.js`.

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

### FILL volume (4 waves, larger than HOST-FIRE #1)

In-repo Reads only. Not `pre-compact.js`. Not Clearing. Not npm.

| Wave | Ingested |
|------|----------|
| 1 | CHANGELOG 1–400; package-lock 1–400; activity.log.orig 1–300; PIPELINE_ARCHITECTURES 1–350 |
| 2 | CHANGELOG 400–900; foundry-mill.test.ts 1–400; performance-optimization.server.ts 1–250; v3-architecture-plan 1–250; PIPELINE_INVENTORY 1–250; PostProcessor.ts 1–250 |
| 3 | CHANGELOG 900–1400; package-lock 400–900; docs-site/package-lock 1–400; session-routing.json 1–250; refactoring-log 1–250; PROCESSORS.md 1–250; `/exec-daemon/index.js` ~208374 preCompact handler; README full; AGENTS 1–200 |
| 4 | CHANGELOG 1400–1900; docs-site/package-lock 400–800; activity.log.orig 300–700; SKILLS.md; llms.txt; ui-ux-design.server.ts 1–200; `scripts/v2-refactor/validation/run-mcp-regression.sh` 1–150 |

Also: prior receipts, hooks, env, build logs.

Named leftovers **not** fully ingested:

| Artifact | On disk | Leftover |
|----------|---------|----------|
| `CHANGELOG.md` | 2773 lines / 134291 bytes | rest after ~1900 |
| `package-lock.json` | 4992 lines / 173128 bytes | rest after ~900 |
| `docs-site/package-lock.json` | 18195 lines / 679964 bytes | rest after ~800 |
| `logs/framework/activity.log.orig` | 14809 lines / 1534170 bytes | rest after ~700 |
| `scripts/v2-refactor/validation/run-mcp-regression.sh` | remainder after 1–150 | not fully ingested |

Clear wall: hooks bound + preToolUse spawning + four FILL waves. Host still did not fire `preCompact`. Likely large Grok 4.6 window and/or auto-compact only between user turns / without project hook. Stopped rather than fake.

## E4 Merge (not wipe)

Host compact / Station merge **did not run**. Custom keys still present **once** on the planted card (unchanged heat: `Git: n/a`, no `Working: last pre_compact`):

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt
- `## Durable` keep-me-ben-001
- `## Seed` Never relaunch bc-DEADBEEF

This is **not** proof of merge-on-compact (that remains Path C + unit tests + PR #43). It is proof the seed file was not deleted during FILL.

## E5 Quiz (from disk, no cold-start)

Read `.xray/state/STATION.md` + `UNFINISHED.txt` after FILL/DETECT (`2026-09-14T22:32:03Z` detect; card unchanged at receipt write):

| Question | Answer on disk |
|----------|----------------|
| Ticket? | COMPACT-BEN-001 |
| Seed? | 42 |
| Open cloud? | bc-DEADBEEF — never relaunch |
| Durable? | keep-me-ben-001 |
| Unfinished? | `examples/cursor-cloud-compact/UNFINISHED.txt` still on disk |
| What next? | Continue this card. Do not relaunch. Do not claim host fire. |

## E6 Forward

Same ticket, same seed, same `bc-DEADBEEF` (not relaunched). This managed run is `bc-fa4741ac-a7f1-503a-80af-3ee90f6d5339`. Successor Reads the card.

A later HOST-FIRE still needs the **host** to write `.xray/state/cursor-precompact.json` with `event_class: cursor-host-precompact` (or invoke-probe `event=preCompact` + Station `Working: last pre_compact` + hook `user_message`). Binding is no longer the blocker.

Until the host fires `preCompact`, do not upgrade this FAIL.

## Out of scope

Ben harness in Clearing · npm · adapter redesign · relaunch `bc-DEADBEEF` · synthetic compact · hand-invoke `pre-compact.js` · git-pull-as-fix.
