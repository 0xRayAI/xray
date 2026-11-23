---
title: Bifrost wake paths
sidebar_label: Bifrost wake paths
plate_type: domain model
---

# Bifrost wake paths

Recited against bifrost `1fae9b1`. Left is what arrives. The Bifrost box is the server. Right is whether a seat is woken, the line is only stored, or a side channel rings.

![Bifrost wake paths](/plates/x/bifrost-wake-paths.png)

The ASCII below is the same character grid the PNG was drawn from.

```
   DM                                                                                           ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐            
 ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄►┆      DM      ┆            
 ┆                                                                                              └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘            
 ┆                                                                                                                          
 ┆                        ┌────────────────────────────────────────────────────────────────┐                                
 ┆                        │ BIFROST                                                        │                                
 ┆                        │  ready offered if busy    queued non-ready stored              │                                
 ┆  ┌───────────────┐head │  ┌──────────────────┐offer┌──────────────────┐      allow      │    ┌──────────────┐            
 ┆  │    NEW HEAD   │─●───├─►│      INBOX       │────►│   WAKE FILTER    │─────────────────┤─●─►│  SEAT WOKEN  │┄┄┐         
 ┆  │               │ │   │  │                  │     │                  │            drop │ │  │              │  ┆         
 ┆  │    head sha   │ │   │  │   store lines    │     │  allow or drop   │                 │ │  │              │  ┆         
 ┆  └───────────────┘ │   │  └──┬───────────────┘     └──────────────────┘                 │ │  └──────────┬───┘  ┆         
 ┆                    │   │     │                ┌────────▲         ▲                      │ │┄if partial  ┆ack   ┆         
 ┆                    │   │     │                │nudge             └─────┐timed           │ │             ┆      ┆         
 ┆            packet  │   │     ▼                │ once           ▼┄┄┄┄┄┄┄┼ack clears┄┄┄┄┄┄┤┄┼┄┄┄┄┄┄┄┄┄┄┄┄┄┘      ┆         
 ┆  ┌───────────────┐ │   │  ┌──────────────────┐┘    ┌──────────────────┐│                │ │  ┌──────────────┐  ┆ doorbell
 └┄┄│    HANDOFF    │─●   │  │   NUDGE L1-L3    │────►│   STALL-FIRED    ││                │ └─►│    STORED    │  ┆         
    │               │ │   │  │                  │     │                  ││                │    │              │  ┆         
    │     packet    │ │   │  │     in place     │     │    card keys     ││       ┌────────┤───►│              │  ┆         
    └───────────────┘ │   │  └──────────────────┘     └──────────────────┘│       │        │    └──────────────┘  ┆         
                      │   │             ┌─once──────────────────▲         │       │        │ ┌┄┄┄┄┄┄┄┄┄┄▲         ┆         
                      │   │             │                                 │       │        │ ┆                    ┆         
              post    │   │             │         ┌───────────────────────┘       │        │ ┆                    ┆         
    ┌───────────────┐ │   │  ┌──────────┴───────┐ │   ┌──────────────────┐        │        │ ┆  ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐  ┆         
    │   BOARD POST  │─●   │  │     TRIPWIRE     │─┘   │       HITL       │────────┘        │ ┆  ┆   DOORBELL   ┆◄┄┘         
    │               │   ┌─├─►│                  │     │                  │ to:human        │ ┆  ┆              ┆            
    │               │   │ │  │    timed run     │     │     to:human     │                 │ ┆  ┆ready/ci_pass ┆            
    └───────────────┘   │ │  └──────────────────┘     └──────────────────┘                 │ ┆  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘            
                        │ │                                                                │ ┆                              
                        │ └────────────────────────────────────────────────────────────────┘ ┆                              
                        │                                                                    ┆                              
          tick          │                                                                    ┆                              
    ┌───────────────┐   │                                                                    ┆                              
    │   CLOCK TICK  │───┘                                                                    ┆                              
    │               │                                                                        ┆                              
    │               │                                                                        ┆                              
    └───────────────┘                                                                        ┆                              
                                                                                             ┆                              
    ┌───────────────┐ no wake                                                                ┆                              
    │     CURSOR    │┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘                              
    │               │                                                                                                       
    │               │                                                                                                       
    └───────────────┘                                                                                                       
```

## Boxes (recited against bifrost 1fae9b1)

- **NEW HEAD** — collector route pass (`server.mjs:3406`) and `noteCi` (`:1390`, posts at `:1396`). The sha is the **head**. The collector critic-return line (`collector/ci_inbox.py:346`, reason `green head returns to critic` at `:383`) is stored, then `allowWake` lets critic through once `githubHeadRuns` has cached an all-green run list for that full sha (`wake-filter.mjs:287`, `greenFetched` `:560`, `:671-674`). The JS green-head reason `CI green on current head` still wakes (`:85`, `:671`). A return whose cache is only partial stays filtered (`:673`).
- **HANDOFF** — `POST /inbox` packet kinds `ready|critic_fail|live_pass|merge|ci_fail` (`server.mjs:4400`, `:4409`, posts at `:4440`). In `postSeatLines` (`:1474-1528`) a ready handoff is offered and can wake even when the seat is busy; queued `critic_fail`, `merge`, `live_pass`, and `ci_fail` are stored, not offered. The dashed **DM** lane is outside Bifrost: a Grok Bot `SendToAgent` can start a chat turn even when the webhook is down. It is not implemented in this repo.
- **BOARD POST** — other `POST /inbox` lines and `POST /inbox/builder` (`:4615`, posts at `:4620`), including station ticks (`stationTick` `:2854`, posts at `:2860`) and owner prompts.
- **CLOCK TICK** — `governorRun` (`:2563`) trips the clock; `POST /clock` (`:4475`) starts the same timed run by hand.
- **CURSOR** — `POST /cursor/webhook` (`:4199`) writes `agents.jsonl` via `acceptCursorWebhook` (`worktrack.mjs:229`). It does not call `noteWake` or `postSeatLines`. The no-wake line ends at **STORED**.
- **INBOX** — `postSeatLines` (`server.mjs:1455`) stores the line, dedupes by id, then `offerLines` (`:609`, called at `:1526`) for the offer list, kept separate from `fresh`.
- **WAKE FILTER** — `allowWake` (`wake-filter.mjs:639`) after `classifyBatch` / `own_actor` / `wakeLineKept`. Default drop is `{allow:false, reason:'filter'}`.
- **NUDGE L1-L3** — `nudgeLines` (`server.mjs:1272`) updates the same inbox row with `applyLineNudge` (`governor.mjs:209`). When `applied.wake` is true it calls `noteWake` (`server.mjs:1298`), which goes through the wake filter and can wake the seat. L2/L3 of an already-fired line do not wake; that is intended.
- **TRIPWIRE** — `createClock` / `wakeRun` (`governor.mjs:96`, `server.mjs:2518`) mint `type: timed_run` and call `noteWake` (`:2532`). `allowWake` lets `timed_run` through (`wake-filter.mjs:659`).
- **STALL-FIRED** — `stall-fired.json`, read by `readStallFired` (`server.mjs:2452`) and written by `persistStallFired` (`:2460`, file path at `:2463`). Keys are line id and `repo#n` (`stallLineKeys`, `governor.mjs:163`).
- **HITL** — `flagBreaker` (`server.mjs:592`) posts `needs_human` with `to:'human'` and an hourly id (`:598-600`). `allowWake` stores that line and does not wake a bot (`wake-filter.mjs:649-650`). A needs_human line to a seat wakes once per card (`:651-654`).
- **SEAT WOKEN** — `enqueuePending` then `flushWake` (`server.mjs:478`, `:802`).
- **DOORBELL** — after a successful inbox wake, `flushWake` calls `ringCriticDoorbell` (`:844`, `:776`) for `ready` / `ci_pass` (`chat-doorbell.mjs:1-4`, `:9`). Dashed: a configured extra, not the inbox webhook.
- **DM** — dashed lane outside Bifrost (`SendToAgent`). A broken inbox is not fixed by a DM.
- **STORED** — the line stays in the seat inbox and no webhook is sent.

## Edges

- **once** — first stall or line-nudge on a card writes the stall-fired set (`applyLineNudge` `governor.mjs:219-221`; `planStallWakes` `:236`). The same word is used on both edges; there is no "mark".
- **head** / **packet** / **post** — NEW HEAD, HANDOFF and BOARD POST meet at junction dots on one line; one arrow lands on INBOX.
- **ack clears** — starts at SEAT WOKEN (live-inbox `--ack`) and ends in the arrow into STALL-FIRED. `ackLines` calls `clearStallFired` (`server.mjs:1004`, `governor.mjs:196`). `releaseClosedStallKeys` (`server.mjs:2551`) drops the same keys when the card is closed or the line is settled, on each `governorRun` (`:2564`).
- **nudge** / **timed** — NUDGE L1-L3 and TRIPWIRE both run `noteWake` into WAKE FILTER (distinct arrows into the filter), then **allow** to SEAT WOKEN.
- **to:human** — HITL → STORED with its own arrowhead, no bot wake.
- **no wake** — CURSOR → STORED with its own arrowhead.
- **INBOX → NUDGE** — nudge bumps stored lines.
- **ready offered if busy** / **queued non-ready stored** — the #110 split in `postSeatLines` (`server.mjs:1474-1528`): a ready handoff is offered and wakes even while the seat is busy; queued `critic_fail`, `merge`, `live_pass`, and `ci_fail` are stored, not offered.
- **if partial** — sits on the drop path to STORED. Since #109, only a partial-green critic return is still filtered.
- **doorbell** — SEAT WOKEN → DOORBELL, `ready` / `ci_pass` only.
- **DM** — HANDOFF around the outside of Bifrost to the DM box.

## After #109 and #110

[bifrost#108](https://github.com/0xRayAI/bifrost/issues/108) is closed on this head. [bifrost#109](https://github.com/0xRayAI/bifrost/pull/109) settled the old holes, with one leftover skip and one leftover nuance:

- **never settles** is closed. A superseded `review` or `critic_fail` settles via `supersededReview` / `lineDone` (`server.mjs:1110`, `:1118`) and the nudge stops. A superseded review is acked by the sweep. A superseded `critic_fail` stays hidden and unacked.
- **if partial** — since #109, the green-head return wakes critic once `githubHeadRuns` caches an all-green run list for the full sha (`wake-filter.mjs:287`, `:560`, `:671-674`). Only a partial green is still filtered.

[bifrost#110](https://github.com/0xRayAI/bifrost/pull/110): a ready handoff is offered and wakes even while the seat is busy. Queued `critic_fail`, `merge`, `live_pass`, and `ci_fail` are stored, not offered (`server.mjs:1474-1528`).

stamped · 0xray 4.2.3
