# RECEIPT-HOST-PRECOMPACT-2 — COMPACT-BEN-001 HOST-FIRE RETRY

Retry of HOST-FIRE (PR #46 / `RECEIPT-HOST-PRECOMPACT.md`). Goal: boot a cloud whose checkout **already** contains `.cursor/hooks.json`, then FILL until the **host** fires `preCompact`.

**Did not** invoke `src/integrations/cursor/hooks/pre-compact.js` by hand. **Did not** `git pull` as a hook-binding fix. **Did not** FILL after the first-60-seconds STOP.

| | |
|--|--|
| Ticket | COMPACT-BEN-001 |
| Seed | 42 |
| Open cloud (never relaunch) | `bc-DEADBEEF` |
| This cloud run | `bc-d8a34c36-ba09-5884-9ac2-010d84d64bf4` |
| Durable | keep-me-ben-001 |
| Unfinished marker | `examples/cursor-cloud-compact/UNFINISHED.txt` |
| Branch | `cursor/host-fire-retry-4bf4` |
| Adapter on remote main | PR #45 @ `372fd1654` (hooks exist **there**) |
| Checkout at boot | `804c95bec` (PR #44) — **no** `.cursor/` |
| Compact `event_class` | **`cursor-host-precompact-FAIL`** (environment lag) |

Host `preCompact` **did not fire** because project hooks were **not on disk at resource-provider init**. Seed keys were **not planted** on the live card this run (STOP before SEED). In-repo seed SSOT on remote main is unchanged.

## Verdict

| Question | Answer |
|----------|--------|
| `.cursor/hooks.json` at boot? | **no** — STOP |
| `pre-compact.js` at boot? | **no** |
| Host preCompact? | **no** — not attempted after STOP |
| Seed survive (live Station)? | **n/a** — live `.xray/state/STATION.md` was absent; seed not planted |
| In-repo seed still on main? | **yes** (read after fetch-for-PR-base, not used to bind hooks) |
| Receipt | `examples/cursor-cloud-compact/RECEIPT-HOST-PRECOMPACT-2.md` |

Do **not** label this run `cursor-host-precompact`.

## First 60 seconds (2026-09-14T19:53Z–19:54Z)

Checked **before** any fetch/checkout of PR #45:

| Path | At boot |
|------|---------|
| `/workspace/.cursor/hooks.json` | **ABSENT** (no `.cursor/` directory) |
| `/workspace/src/integrations/cursor/hooks/pre-compact.js` | **ABSENT** (no `src/integrations/cursor/`) |
| `/workspace/examples/cursor-cloud-compact/` | **ABSENT** |
| `/workspace/.xray/state/STATION.md` | **ABSENT** |
| `/workspace/.xray/state/cursor-precompact.json` | **ABSENT** |
| `/workspace/.xray/state/cursor-hook-invoke.log` | **ABSENT** |
| `logs/framework/activity.log` | **ABSENT** |

Protocol: hooks missing → **STOP and report environment lag**. Did not pull-as-fix.

## Environment lag (why this retry still missed boot hooks)

Same failure class as PR #46, this time **without** the mid-run pull.

| Fact | Value |
|------|--------|
| Run | `bc-d8a34c36-ba09-5884-9ac2-010d84d64bf4` — https://cursor.com/agents/bc-d8a34c36-ba09-5884-9ac2-010d84d64bf4 |
| Model | `cursor-grok-4.6-high-fast` |
| Run created | `2026-09-14T19:53:10.603Z` |
| Local `HEAD` at boot | `804c95bec` — *Merge pull request #44* (v4.0.13) |
| `origin/main` after fetch (inspect only) | `372fd1654` — *Merge pull request #45* (hooks adapter) |
| PR #45 merged | `2026-09-14T19:20:17Z` |
| Environment | `3bdf392a-aebd-11f1-bf4b-42ffb4d10ea7` (`RUNTIME_FORWARD_FILL`, personal) |
| Boot build | `bld-20260914-e67210fc-672b-4876-961d-efb771202df2` |
| Snapshot completed | `2026-09-14T18:15:23.911Z` (**~65 min before #45 merge**) |
| git setup | `reuse` + `warm_fork` |
| Newer recurring build | `bld-20260914-8aea8a0c-…` created `2026-09-14T19:19:35Z` — **SKIPPED** (no post-#45 snapshot) |

Cursor binds project hooks once at exec-daemon resource-provider init (`hasProjectHooks: !!hooksConfig.projectHooks`, `projectConfigPath = <project>/.cursor/hooks.json`). Reload surface is `reloadAgentSkills`, not a mid-session `git pull`. A checkout that lacks `.cursor/hooks.json` at boot cannot become a HOST-FIRE subject later in the same run.

`git fetch origin main` was used **only** to confirm remote #45 and to base this receipt-only branch. Working tree at the first-60s check stayed on `804c95bec` with hooks **absent**. Later `checkout` of this branch for the receipt file does **not** rebind host hooks.

## E1 Seed

**Not planted.** STOP forbade continuing SEED → FILL on a run that cannot fire host `preCompact`.

In-repo SSOT (remote main / this receipt branch, not the boot checkout):

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Durable: keep-me-ben-001
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt

Live projection `.xray/state/STATION.md` was **never written** this run.

## E2 Work

```
$ echo hook-probe-ben-001
hook-probe-ben-001
```

Ran after the STOP decision as a cheap spawn witness (not FILL).

**preToolUse allow: not logged.** After the echo:

- `.xray/state/cursor-hook-invoke.log` still absent
- `logs/framework/activity.log` still absent
- `.xray/state/session-boot.json` still `source=0xray/grok-pre-tool-use-boot`, `timestamp=2026-06-19T18:28:19.380Z`, `workspaceRoot=/Users/blaze/dev/xray`

No host `{"permission":"allow"}` evidence. Path C’s allow JSON was synthetic stdin; this run does not repeat that.

## E3 Compact (host)

**Not observed. FILL volume: 0.** Stopped before aggressive context growth.

No Cursor `preCompact` payload (`trigger`, `context_tokens`, `context_usage_percent`, `hook_event_name`) reached the adapter. No `cursor-precompact.json`. No Station `Working: last pre_compact`. No hook `user_message`.

Token/context signals available to the agent: **none** from the host (those fields exist on the hook stdin only when `preCompact` runs). No conversation `%` / token meter was exposed in this session.

## E4 Merge (not wipe)

Host compact / Station merge **did not run**. There was no live Station card to merge or wipe.

This is **not** proof of merge-on-compact (that remains Path C + unit tests + PR #43).

## E5 Quiz (from disk, no cold-start)

Live Station: **absent** (not planted).

In-repo `UNFINISHED.txt` after this receipt branch tracked `origin/main` (`2026-09-14T19:54Z` quiz):

| Question | Answer on disk |
|----------|----------------|
| Ticket? | COMPACT-BEN-001 (file header + seed card) |
| Seed? | 42 (in `STATION.seed.md`, not a live card) |
| Open cloud? | bc-DEADBEEF — never relaunch |
| Durable? | keep-me-ben-001 (seed card only) |
| Unfinished? | examples/cursor-cloud-compact/UNFINISHED.txt on the #45 tree |
| What next? | Reboot a cloud from a **post-#45** snapshot so `.cursor/hooks.json` exists at init. Do not pull-as-fix. Do not claim host fire. Do not relaunch `bc-DEADBEEF`. |

## E6 Forward

Same ticket, same seed, same `bc-DEADBEEF` (not relaunched). This managed run is `bc-d8a34c36-ba09-5884-9ac2-010d84d64bf4`. Successor Reads the card.

A later HOST-FIRE needs **all** of:

1. Environment build / snapshot taken **after** `372fd1654` (PR #45) so `.cursor/hooks.json` is in the reused checkout at boot.
2. Recurring SKIPPED builds are not enough — last SUCCEEDED snapshot here is still `bld-20260914-e67210fc` @ 18:15Z.
3. FILL until the **host** writes `.xray/state/cursor-precompact.json` with `event_class: cursor-host-precompact` (or invoke-probe `event=preCompact` + Station `Working: last pre_compact` + hook `user_message`).
4. No mid-run pull, no hand-invoke of `pre-compact.js`.

Until that snapshot exists, HOST-FIRE retries will STOP in the first 60 seconds.

## Out of scope

Ben harness in Clearing · npm · adapter redesign · relaunch `bc-DEADBEEF` · synthetic compact.
