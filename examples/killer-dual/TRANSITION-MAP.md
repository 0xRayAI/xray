# Transition map — Cursor cloud hooks vs Grok Bot survive-compact

Original collab shape: keep **PreToolUse** and **PreCompact** as separate spaces. Start on Cursor cloud (real hooks). Capture what survives compaction, what reconstructs, where forward motion breaks. Then treat Grok Bot `survive-compact` as its own constrained path. This map is the first artifact back, with eval cases.

Friend-test: **a friend would hear: do not replay Path C and call the original job done. The writer works in a test harness; the original bar was a live host compact with a real organ, then a Grok-Bot-only path beside it.**

| | |
|--|--|
| Cloud | `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` |
| Dashboard | https://cursor.com/agents/bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d |
| Model | `cursor-grok-4.6-high` |
| Cursor path | 0xRay project hooks at boot (`preToolUse` / `preCompact` / `afterFileEdit`) |
| Grok Bot path | `grok-bot/skills/survive-compact/SKILL.md` (shipped workaround — chat does **not** fire 0xRay PreCompact) |
| Product on this PR | `npx grok-bot ready` / `doctor` — https://github.com/0xRayAI/xray/pull/57 |

**Do not rerun Path C.** That quiz already **PASS**ed after the lazy-load fix. Another stdin replay would not be a second host compact.

**Do not FILL to force compact.** HOST-FIRE #5 filled past 85% of 500k and got **0** `event=preCompact`. This work thread compacted because the host summarized a long job, not because of a fill.

## Two spaces (do not collapse)

| Space | Job | Cursor cloud (this run) | Grok Bot chat |
|-------|-----|-------------------------|---------------|
| **PreToolUse** | Frontier deployment mechanics + first boot / hot-swap heat (`sessionStart` is unavailable on managed cloud) | Live. Probe logged hundreds of times. After the dist-import fix, Read returns `{"permission":"allow"}` and boots Station. Destructive shell still denies. | Do **not** invent a fake PreToolUse floor. Skill says disk truth first. |
| **PreCompact** | Observational Station merge. Cannot block the host summary. | Host **did** fire (`09:35:46Z`, `09:38:20Z`). Probe logged before `exec node`. Writer crashed until lazy-load. Path C + live replay then wrote the card. | Host does **not** fire 0xRay PreCompact. `survive-compact` is the path. Still Read `STATION.md`; Grok does not inject it. |

## Eval cases

Legend: **PASS** observed · **FAIL** observed · **OPEN** not yet earned on a post-fix *host* compact.

| # | Case | Cursor + 0xRay hooks | Grok Bot `survive-compact` |
|---|------|----------------------|----------------------------|
| E1 | Hook actually fires on host compact | **PASS** (probe `event=preCompact` ×2). HOST-FIRE #1–#5 were **FAIL** on emit. | **N/A** — do not wait for it |
| E2 | Station card written by that host fire | **FAIL** at fire (import crash). **PASS** in Path C / repair replay after lazy-load. **OPEN** for a *new* host compact with the fixed writer and no stdin replay | Agent Reads disk; no hook write |
| E3 | Seed / durable keys survive merge | **PASS** Path C (`COMPACT-BEN-001`, seed 42, `bc-DEADBEEF`, `keep-me-ben-001`) | Disk files the skill names — if they were never written, chat cannot reconstruct them |
| E4 | PreToolUse constitution still runs after compact | **PASS** after fix (allow Read, deny `rm -rf /`) | Out of scope for the skill |
| E5 | Hot-swap card reconstructs (Grok Read contract) | After fix, live `.xray/state/STATION.md` exists. Intent stayed `(none yet)`. Working line can be overwritten by later `afterFileEdit` (`station snapshot` vs `last pre_compact`) | Same Read contract. Chat memory is not survival |
| E6 | Repertoire organ on the compact path | Heat says **on** because `vendor/@0xray/repertoire/dist/provider/memory-routing-provider.js` exists. `features.json` `module_path` points at **`node_modules/@0xray/repertoire/...` which is absent**. Live routing path **FAIL** vs heat | Skill: do not bolt Repertoire MCP onto every chat seat as theater |
| E7 | Forward motion after compact | Successor continued from Cursor summary + git tree (seat-ready PR). Break was Station-less Grok contract + dist import. After fix, motion is PR #57 + this map | Resume the same `bc-…`; do not relaunch; do not rebuild what disk shows done |
| E8 | Usage truth | `cursor-cloud` `run-info` / `events`: **no** token meter. Cite dashboard + probe, not chars÷4 | Chat seat has no PreCompact stdin either |

## What survived the real host compact (before the writer fix)

- This conversation (host summary)
- Git working tree / later commits on `cursor/grok-bot-seat-ready-372d`
- `.xray/state/cursor-hook-invoke.log` (including the two host `preCompact` lines)
- Boot-cached hooks after `.cursor/hooks.json` was stripped mid-run

Did **not** survive as a card: `STATION.md`, `cursor-precompact.json`, a refreshed `session-boot.json` (stale Grok June snapshot until adapters could load).

## What reconstructs now

| Artifact | How |
|----------|-----|
| `STATION.md` | `preCompact` / `afterFileEdit` / first `preToolUse` via `writeSessionBoot` → `writeStationMarkdown`. Grok still will not inject it. |
| `cursor-precompact.json` | `pre-compact.js` only |
| `session-boot.json` | Same boot path. `sessionStart` never runs on this cloud. |
| Repertoire working file | Heat snapshot; not the same as `node_modules` fasten |

## Where forward motion still breaks

1. **A second *host* PreCompact after the writer fix is OPEN.** Repair stdin is not that event. Compute is expensive; FILL is the wrong way to buy it.
2. **Heat vs organ.** Station `Repertoire: on` is vendor-dist presence + `memory_routing.enabled`. Planner `module_path` under `node_modules` is missing. That is not “wearing repertoire” in the original sense.
3. **Intent never made it onto the card** (`intent: (none yet)`). Compact merge cannot restore a prompt the hook never stored.
4. **Later PreToolUse/afterFileEdit overwrite `Working: last pre_compact`** with `Working: station snapshot`. Compact heat is not sticky across the next tool.

## Should we run again?

| Candidate | Do it? |
|-----------|--------|
| Path C stdin replay | **No** — already PASS |
| Another 500k FILL | **No** — already falsified as the emit lever |
| New host compact, fixed writer, repertoire actually on the live `module_path`, no hand-invoke | **Yes, that is the remaining hard path** — only when the host summarizes again |
| Grok Bot `survive-compact` as its own wake (Read STATION / session-boot / this map, name the live track, do not rebuild) | **Yes, constrained path — that is this turn’s Grok-Bot half** |

Live track to name from disk: intent = Station writer + seat `ready`/`doctor` · open PR = https://github.com/0xRayAI/xray/pull/57 · cloud = `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` · already built = lazy-load + Path C pass + `grok-bot ready` · do not rebuild.

## Grok Bot constrained wake (this path)

Done when the next tool call can state, from disk:

- Intent / PR / bc-id (above)
- Compact class: host probe **PASS**, Station at host fire **FAIL**, adapter after fix **PASS**, post-fix host fire **OPEN**
- Do not relaunch this cloud
- Do not invent PreToolUse inside Grok Bot chat
