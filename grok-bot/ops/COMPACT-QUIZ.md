# Compact quiz — before/after disk organ

**Job:** prove whether planted keys survived a Cursor host compact. Snapshot disk, do real work, wait for the host, snapshot again, quiz.

This is **not** `survive-compact`. That skill is the *after* wake (Read disk, resume the `bc-…`). This proc is the *before/after* measurement.

Friend-test: **a friend would hear: plant the ticket on disk, take a snapshot, keep working until Cursor summarizes, snapshot again, and check the ticket is still there. Do not fill the chat with a fat log and call that a test.**

## Reality (what caused compact on Arm B)

| Claim | Truth |
|-------|--------|
| `Read activity.log.orig` L801–4801 is the key compact trigger | **No.** Those slices are HOST-FIRE **#3–#5 FILL**. They got **0** `event=preCompact`. Documented FAIL. |
| Reading logs on this B run *caused* 10:41:27Z | **Not proven.** No before-snapshot. B receipt has **no** `context_tokens`. The conversation had already compacted at 09:35 and 09:38 from real work. 10:41 fired while later offsets of the same log were being Read. Honest class: **already-hot window + more conversation tokens**. |
| chars÷4 of files Read = usage | **Forbidden.** Host window cite is Arm S stdin: **256000**. Ticket lore 500k is not that number. |
| `cursor-cloud` MCP token meter | **None.** |
| `examples/killer-dual/TRANSITION.md` | **Does not exist.** Eval cases: `TRANSITION-MAP.md`. |
| `cursor-usage-receipt.json` on this branch | **Does not exist.** Usage keys belong on `cursor-precompact.json` if the writer copies stdin (#55 on S). |

Do **not** run another FILL. Do **not** hand-invoke `pre-compact.js` and label it host fire.

## Repeatable setup

1. **Plant keys** (Path C seed is the default):
   - Ticket `COMPACT-BEN-001`
   - Seed `42`
   - Open cloud (never relaunch that id)
   - Durable `keep-me-ben-001`
   - `examples/cursor-cloud-compact/UNFINISHED.txt`
   - Copy `STATION.seed.md` → `.xray/state/STATION.md` only as the live card (gitignored projection)
2. **WORK** that is real (`echo hook-probe-ben-001` or the actual product job). Not a log FILL.
3. **Snapshot before** (metrics on disk, not a token guess):

```bash
npx grok-bot compact-snapshot --cwd . --out .xray/state/compact-snap-before.json
```

4. **Wait for host compact.** Cursor: “Your conversation was summarized due to context constraints” **and** probe `event=preCompact`. Do not Read `logs/framework/activity.log.orig` to buy it.
5. **Snapshot after:**

```bash
npx grok-bot compact-snapshot --cwd . --out .xray/state/compact-snap-after.json
```

6. **Quiz:**

```bash
npx grok-bot compact-quiz --before .xray/state/compact-snap-before.json --after .xray/state/compact-snap-after.json
```

## Files the snapshot watches

| Path | Why |
|------|-----|
| `.xray/state/STATION.md` | Grok Read-the-card contract. Ticket / Seed / Durable / Working |
| `.xray/state/session-boot.json` | Boot payload. `event_class`, `sessionId`, `timestamp` |
| `.xray/state/cursor-precompact.json` | Host receipt. `trigger=auto` + `cursor-host-precompact` |
| `.xray/state/cursor-hook-invoke.log` | Probe counts. `event=preCompact` delta is the fire witness |
| `.xray/state/repertoire-working.json` | Heat snapshot — not the same as `node_modules` fasten |
| `.cursor/hooks.json` | Harness: present at boot vs stripped |
| `examples/cursor-cloud-compact/UNFINISHED.txt` | Durable marker |
| `examples/cursor-cloud-compact/STATION.seed.md` | In-repo seed SSOT |

Harness flags in the JSON: `hooksJson`, `repertoireNodeModules`. Heat saying `Repertoire: on` from vendor dist is **not** an organ.

## Quiz PASS

| Check | PASS |
|-------|------|
| Planted needles still in Station / seed / unfinished | all present after |
| Probe `preCompact` count | increased (host fire), or **labeled synthetic** if you invoked Path C fallback |
| Receipt | `event_class=cursor-host-precompact` and `trigger=auto` for a host claim |
| Usage | copy from receipt if present; otherwise `none` — do not invent |

Path C synthetic compact is a **repair quiz**, not a host fire. Keep the class name honest.

## What this is not

| Thing | Where it lives |
|-------|----------------|
| After-wake resume | `grok-bot/skills/survive-compact/SKILL.md` |
| Failed FILL recipe | `examples/cursor-cloud-compact/RECEIPT-HOST-PRECOMPACT-3.md` … `-5.md` |
| Eval cases Cursor vs chat | `examples/killer-dual/TRANSITION-MAP.md` |
| Seat mill plant | `npx grok-bot ready` |

## Arm B 10:41:27Z (this run, no before-snap)

That fire is **E2 PASS** for “writer lived on a live host compact while bare.” It is **not** a before/after key quiz. Live Station intent stayed `(none yet)` because Path C keys were never planted on the live card. Use this proc next time you need “did keys survive?”
