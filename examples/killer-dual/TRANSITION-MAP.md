# Transition map — Cursor cloud hooks vs Grok Bot survive-compact

Original collab shape: keep **PreToolUse** and **PreCompact** as separate spaces. Start on Cursor cloud (real hooks). Capture what survives compaction, what reconstructs, where forward motion breaks. Then treat Grok Bot `survive-compact` as its own constrained path. This map is the first artifact back, with eval cases.

Friend-test: **a friend would hear: Path C was the repair quiz; the bar after that was a live host compact with the fixed writer. B earned that at 10:41:27Z while still bare — card yes, tokens no, repertoire organ still off.**

| | |
|--|--|
| Cloud | `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` |
| Dashboard | https://cursor.com/agents/bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d |
| Model | `cursor-grok-4.6-high` |
| Cursor path | 0xRay project hooks at boot (`preToolUse` / `preCompact` / `afterFileEdit`) |
| Grok Bot path | `grok-bot/skills/survive-compact/SKILL.md` (shipped workaround — chat does **not** fire 0xRay PreCompact) |
| Product on this PR | `npx grok-bot ready` / `doctor` — https://github.com/0xRayAI/xray/pull/57 |

**Do not rerun Path C.** That quiz already **PASS**ed after the lazy-load fix. The second *host* compact after the fix is no longer OPEN — it landed at **10:41:27Z** (see Packet 4). Another stdin replay would not be a third host compact.

**Do not FILL to force compact.** HOST-FIRE #5 filled past 85% of a **500k lore** window and got **0** `event=preCompact`. Arm S later read host **`context_window_size=256000`**. This work thread compacted because the host summarized a long job, not because of a fill. Do not swap 256k for 500k on B receipts.

## Two spaces (do not collapse)

| Space | Job | Cursor cloud (this run) | Grok Bot chat |
|-------|-----|-------------------------|---------------|
| **PreToolUse** | Frontier deployment mechanics + first boot / hot-swap heat (`sessionStart` is unavailable on managed cloud) | Live. Probe logged hundreds of times. After the dist-import fix, Read returns `{"permission":"allow"}` and boots Station. Destructive shell still denies. | Do **not** invent a fake PreToolUse floor. Skill says disk truth first. |
| **PreCompact** | Observational Station merge. Cannot block the host summary. | Host **did** fire (`09:35:46Z`, `09:38:20Z`, **`10:41:27Z`**). First two: probe yes, writer died. Third: probe yes, writer lived (bare disk, boot cache). | Host does **not** fire 0xRay PreCompact. `survive-compact` is the path. Still Read `STATION.md`; Grok does not inject it. |

## Eval cases

Legend: **PASS** observed · **FAIL** observed.

| # | Case | Cursor + 0xRay hooks | Grok Bot `survive-compact` |
|---|------|----------------------|----------------------------|
| E1 | Hook actually fires on host compact | **PASS** (probe `event=preCompact` ×3 host). HOST-FIRE #1–#5 were **FAIL** on emit. | **N/A** — do not wait for it |
| E2 | Station card written by that host fire | **FAIL** at 09:35/09:38 (import crash). **PASS** Path C. **PASS** live host **10:41:27Z** (fixed writer, no stdin replay, hooks.json still stripped) | Agent Reads disk; no hook write |
| E3 | Seed / durable keys survive merge | **PASS** Path C (`COMPACT-BEN-001`, seed 42, `bc-DEADBEEF`, `keep-me-ben-001`) | Disk files the skill names — if they were never written, chat cannot reconstruct them |
| E4 | PreToolUse constitution still runs after compact | **PASS** after fix (allow Read, deny `rm -rf /`) | Out of scope for the skill |
| E5 | Hot-swap card reconstructs (Grok Read contract) | Host-written `.xray/state/STATION.md` at 10:41:27Z. Intent stayed `(none yet)`. Working: `last pre_compact @ 55bdfb32a`. Grok still does not inject — Read it. | Same Read contract. Chat memory is not survival |
| E6 | Repertoire organ on the compact path | Heat says **on** because `vendor/@0xray/repertoire/dist/provider/memory-routing-provider.js` exists. `features.json` `module_path` points at **`node_modules/@0xray/repertoire/...` which is absent**. Live routing path **FAIL** vs heat | Skill: do not bolt Repertoire MCP onto every chat seat as theater |
| E7 | Forward motion after compact | Successor continued from Cursor summary + git tree (seat-ready PR). Break was Station-less Grok contract + dist import. After fix, motion is PR #57 + this map | Resume the same `bc-…`; do not relaunch; do not rebuild what disk shows done |
| E8 | Usage truth | `cursor-cloud` MCP: **no** token meter. Arm S host stdin (cite S, not B): fire3 **tokens=232105**, **`context_window_size=256000`**. Ticket lore 500k is not that number. B writer-lived receipt still has **no** usage keys (`pre-compact.js` does not copy them). Never chars÷4 | Chat seat has no PreCompact stdin either |

## What survived the real host compact (before the writer fix)

- This conversation (host summary)
- Git working tree / later commits on `cursor/grok-bot-seat-ready-372d`
- `.xray/state/cursor-hook-invoke.log` (including the host `preCompact` lines)

Did **not** survive as a card at those fires: `STATION.md`, `cursor-precompact.json`, a refreshed `session-boot.json` (stale Grok June snapshot until adapters could load).

## What survived the post-fix host compact (10:41:27Z)

- Cursor summary of this conversation
- Host-written `STATION.md` + `cursor-precompact.json` + `session-boot.json` (mtime 10:41:27.882Z)
- Bare disk: `HOOKS=no`, `REP=no`, boot-cached hook still spawned

## What reconstructs now

| Artifact | How |
|----------|-----|
| `STATION.md` | `preCompact` / `afterFileEdit` / first `preToolUse` via `writeSessionBoot` → `writeStationMarkdown`. Grok still will not inject it. |
| `cursor-precompact.json` | `pre-compact.js` only |
| `session-boot.json` | Same boot path. `sessionStart` never runs on this cloud. |
| Repertoire working file | Heat snapshot; not the same as `node_modules` fasten |

## Where forward motion still breaks

1. **E2 is closed.** Post-fix host PreCompact at 10:41:27Z wrote Station + receipt. Do not FILL to buy another one.
2. **Heat vs organ.** Station `Repertoire: on` is vendor-dist presence + `memory_routing.enabled`. Planner `module_path` under `node_modules` is missing. That is not “wearing repertoire” in the original sense. Do not fasten it on B.
3. **Intent never made it onto the card** (`intent: (none yet)`). The 10:41 merge could not restore a prompt the hook never stored.
4. **B receipt has no usage fields.** `pre-compact.js` does not copy `context_tokens` / `context_window_size`. That printer is #55, not a reason to become S.
5. **Later PreToolUse/afterFileEdit can overwrite `Working: last pre_compact`** with `Working: station snapshot`. Compact heat is not sticky across the next tool.

## Should we run again?

| Candidate | Do it? |
|-----------|--------|
| Path C stdin replay | **No** — already PASS |
| Another 500k FILL | **No** — emit lever already falsified; host window on S is **256k**, not the ticket string |
| New host compact, fixed writer, still bare | **Done** — 10:41:27Z. Card yes. Tokens no. Organ still off |
| New host compact with repertoire actually on the live `module_path` | **No on B** — that would turn B into S. S already has the suited fire |
| Grok Bot `survive-compact` as its own wake (Read STATION / session-boot / this map, name the live track, do not rebuild) | **Yes, constrained path — later chat-seat job** |

Live track to name from disk: intent = Station writer + seat `ready`/`doctor` · PR = https://github.com/0xRayAI/xray/pull/57 (closed; map evidence) · cloud = `bc-12f1ecad-bb9a-588b-9559-7e3b61e7372d` · already built = lazy-load + Path C pass + live host Station write at 10:41:27Z + `grok-bot ready` · do not rebuild.

## Grok Bot constrained wake (this path)

Done when the next tool call can state, from disk:

- Intent / PR / bc-id (above)
- Compact class: host probe **PASS** ×3, Station at 09:35/09:38 **FAIL**, adapter after fix **PASS**, post-fix host fire **PASS** (10:41:27Z, no tokens on B receipt)
- Do not relaunch this cloud
- Do not invent PreToolUse inside Grok Bot chat
