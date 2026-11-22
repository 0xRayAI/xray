---
title: Bifrost wake paths
sidebar_label: Bifrost wake paths
plate_type: domain model
---

# Bifrost wake paths

Left is what arrives. The Bifrost box is the server. Right is whether a seat is woken or the line is only stored. Head `55ab02532adab5c618601a56d33ad8d58053855a` (forge/bifrost-wake-filter).

```
GITHUB / BOARD POST / CLOCK TICK / CURSOR                                      
        │                                                                      
        ▼                                                                      
┌────────────────────────────────── BIFROST ──────────────────────────────────┐
│ INBOX ──offer──► WAKE FILTER ──allow──► SEAT WOKEN                          │
│  store lines     allow or drop ──drop──► STORED                             │
│ LINE LADDER ──once──► STALL-FIRED ◄·· ack clears ·· (on ack or card close)  │
│  in place         card keys                                                 │
│ STALL CLOCK ──fire──► STALL-FIRED; ──timed──► WAKE FILTER                   │
│  timed run                                                                  │
│ HITL ──once/card──► WAKE FILTER (to:human is stored, no wake)               │
└─────────────────────────────────────────────────────────────────────────────┘
CURSOR ···· no wake ····► STORED                                               
```

## Boxes (from this head only)

- **GITHUB** — collector route pass posts lines (`server.mjs:3383`). CI also posts through `noteCi` (`:1342`).
- **BOARD POST** — `POST /inbox` (`:4334`) and `POST /inbox/builder` (`:4549`) call `postSeatLines`.
- **CLOCK TICK** — `governorRun` (`:2511`) and `POST /clock` (`:4409`) start a timed run.
- **CURSOR** — `POST /cursor/webhook` (`:4133`) writes `agents.jsonl` via `acceptCursorWebhook` (`worktrack.mjs:229`). It does not call `noteWake` or `postSeatLines`.
- **INBOX** — `postSeatLines` (`server.mjs:1407`) stores the line, dedupes by id, then `offerLines` (`:609`).
- **WAKE FILTER** — `allowWake` (`wake-filter.mjs:616`) after `classifyBatch` / `own_actor` / `wakeLineKept`. Default drop is `{allow:false, reason:'filter'}`.
- **LINE LADDER** — `nudgeLines` (`server.mjs:1224`) updates the same inbox row with `applyLineNudge` (`governor.mjs:209`).
- **STALL CLOCK** — `createClock` / `wakeRun` (`governor.mjs:96`, `server.mjs:2466`) mint `timed_run` and call `noteWake`.
- **STALL-FIRED** — `stall-fired.json` via `loadStallFired` / `dumpStallFired` (`governor.mjs:226`, `server.mjs:2408`). Keys are line id and `repo#n` (`stallLineKeys`, `governor.mjs:163`).
- **HITL (human in the loop)** — `flagBreaker` (`server.mjs:592`) posts `needs_human` with `to:'human'` and an hourly id.
- **SEAT WOKEN** — `enqueuePending` then `flushWake` (`server.mjs:478`, `:799`).
- **STORED** — the line stays in the seat inbox and no webhook is sent.

## Former holes, now fixed

- **ack clears** — `ackLines` calls `clearStallFired` (`server.mjs:996`, `governor.mjs:196`). `releaseClosedStallKeys` (`server.mjs:2499`) drops the same keys when the card is closed or the line is settled, on each `governorRun`.
- **once/card** — `allowWake` denies `needs_human` when `to` is `human` (`wake-filter.mjs:627`). A needs_human line to a seat is remembered on the fired set and denied the next time on that card (`:628-630`), including when a breaker id rolls the hour.

stamped · 0xray 4.2.3
