# RECEIPT-HOST-PRECOMPACT — COMPACT-BEN-001 HOST-FIRE

Follow-up to Path C (`RECEIPT-PATH-C.md`, PR #45). Protocol: SEED → WORK → **live FILL until host auto-compacts** → DETECT → QUIZ → RECEIPT E1–E6.

**Did not** invoke `src/integrations/cursor/hooks/pre-compact.js` by hand. No synthetic stdin.

| | |
|--|--|
| Ticket | COMPACT-BEN-001 |
| Seed | 42 |
| Open cloud (never relaunch) | `bc-DEADBEEF` |
| This cloud run | `bc-e6c38d8b-ae72-57d9-b78c-154a041d28da` |
| Durable | keep-me-ben-001 |
| Unfinished marker | `examples/cursor-cloud-compact/UNFINISHED.txt` |
| Branch | `cursor/host-fire-compact-28da` @ `72cc85227` (probe) + this receipt |
| Adapter | PR #45 on `main` (`372fd1654`) — not redesigned |
| Compact `event_class` | **`cursor-host-precompact-FAIL`** |

Host `preCompact` **did not fire**. Seed keys **survived** because they were planted on disk and nothing compacted/wiped them.

## Verdict

| Question | Answer |
|----------|--------|
| Host preCompact? | **no** |
| Seed survive? | **yes** (disk quiz; compact never ran) |
| Receipt | `examples/cursor-cloud-compact/RECEIPT-HOST-PRECOMPACT.md` |

## Honest blockers

1. **Project hooks never spawned in this session.** After WORK `echo hook-probe-ben-001`, a file write (fill journal), and the invoke-probe wrapper on `.cursor/hooks.json`:
   - `.xray/state/cursor-hook-invoke.log` **absent**
   - `logs/framework/activity.log` **absent** (only `activity.log.orig` from the snapshot)
   - `.xray/state/cursor-precompact.json` **absent**
   - `.xray/state/session-boot.json` still `source=0xray/grok-pre-tool-use-boot`, `timestamp=2026-06-19T18:28:19.380Z`, `workspaceRoot=/Users/blaze/dev/xray` — not rewritten by Cursor first-tool boot
   - Station has no `Working: last pre_compact`
   - No host `user_message` from `pre-compact.js`

2. **This VM booted from a pre-#45 snapshot.** Local `main` was `804c95bec` (PR #44). `.cursor/hooks.json` was not on disk until `git pull origin main` brought `372fd1654` (PR #45). Exec-daemon loads project hooks once at resource-provider init (`hasProjectHooks` at boot). Reload is `reloadAgentSkills`, not a mid-session `git pull`. Mid-run appearance of hooks.json does not bind `preToolUse` / `preCompact`.

3. **FILL did not trip host auto-compact.** Model: `cursor-grok-4.6-high-fast`. Docs example compact window is ~128k tokens (`context_window_size`); this host did not emit `preCompact` stdin after the fill below. Conversation still held the seed facts in-model — no summarization cut was observed. Stopped rather than fake a host fire.

## E1 Seed

Live card planted from `examples/cursor-cloud-compact/STATION.seed.md` → `.xray/state/STATION.md` (gitignored projection). `UNFINISHED.txt` already on disk from PR #45.

Present before WORK:

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Durable: keep-me-ben-001
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt

## E2 Work

```
$ echo hook-probe-ben-001
hook-probe-ben-001
```

Repeat after probe wrapper landed:

```
$ echo hook-probe-ben-001-after-probe
hook-probe-ben-001-after-probe
```

**preToolUse allow: not logged.** Host did not spawn `.cursor/hooks.json` `preToolUse` (no invoke-probe line, no activity.log, session-boot unchanged). Path C’s allow JSON was synthetic stdin; this run does not repeat that.

## E3 Compact (host)

**Not observed.** No Cursor `preCompact` payload (`trigger`, `context_tokens`, `context_usage_percent`, `hook_event_name`) reached our script.

FILL attempts (in-repo reads; not `pre-compact.js`):

| Artifact | Bytes on disk | What was read into this turn |
|----------|---------------|------------------------------|
| `CHANGELOG.md` | 134291 | lines 1–200, 200–599, 600–1099, 1100–1499 |
| `README.md` | 12896 | full |
| `AGENTS.md` | 10335 | full |
| `SKILLS.md` | 7950 | full |
| `package.json` | 13442 | full |
| `docs/PROCESSORS.md` | 22303 | lines 1–200 |
| `src/__tests__/unit/foundry-mill.test.ts` | 70642 | lines 1–400 |
| `docs-site/docs/archive/architecture/PIPELINE_ARCHITECTURES.md` | 97658 | lines 1–300 |
| `src/mcps/knowledge-skills/performance-optimization.server.ts` | 67833 | lines 1–250 |
| `src/postprocessor/PostProcessor.ts` | 55779 | lines 1–200 |
| `docs/reflections/v3-architecture-plan.md` | 60526 | lines 1–200 |
| Cursor hooks docs + `/exec-daemon/index.js` hook loader | — | `preCompact` contract + `hasProjectHooks` / `reloadAgentSkills` |

Named targets **not** fully ingested (too large / leftover after stop): `docs-site/package-lock.json` (679964), `package-lock.json` (173128).

Token/context signals available to the agent: none from the host (no `context_tokens` / `context_usage_percent`). Cursor docs (`preCompact` input) list those fields only when the hook runs.

## E4 Merge (not wipe)

Host compact / Station merge **did not run**. Custom keys still present **once** on the planted card (unchanged heat: `Git: n/a`, no `Working: last pre_compact`):

- Ticket: COMPACT-BEN-001
- Seed: 42
- Open cloud: bc-DEADBEEF
- Unfinished path: examples/cursor-cloud-compact/UNFINISHED.txt
- `## Durable` keep-me-ben-001
- `## Seed` Never relaunch bc-DEADBEEF

This is **not** proof of merge-on-compact (that was Path C + unit tests). It is proof the seed file was not deleted during FILL.

## E5 Quiz (from disk, no cold-start)

Read `.xray/state/STATION.md` + `UNFINISHED.txt` after FILL/DETECT (`2026-09-14T19:51:15+00:00`):

| Question | Answer on disk |
|----------|----------------|
| Ticket? | COMPACT-BEN-001 |
| Seed? | 42 |
| Open cloud? | bc-DEADBEEF — never relaunch |
| Durable? | keep-me-ben-001 |
| Unfinished? | examples/cursor-cloud-compact/UNFINISHED.txt still on disk |
| What next? | Continue this card. Do not relaunch. Do not cold-start. Do not claim host fire. |

## E6 Forward

Same ticket, same seed, same `bc-DEADBEEF` (not relaunched). This managed run is `bc-e6c38d8b-ae72-57d9-b78c-154a041d28da` (PR #46). Successor Reads the card.

A later HOST-FIRE needs a cloud that **boots with** repo `.cursor/hooks.json` already in the checkout (post-#45 snapshot / environment build), then fills until the **host** sends `preCompact`. Invoke-probe (`.cursor/hooks/invoke-probe.sh` → `.xray/state/cursor-hook-invoke.log`) is the spawn witness. Only then label `event_class: cursor-host-precompact`.

## Probe shipped on this branch

`.cursor/hooks.json` commands now go through `sh .cursor/hooks/invoke-probe.sh` before the existing adapter scripts. Gate / Station behavior unchanged. Consumer template `src/integrations/cursor/hooks/hooks.json` unchanged.
