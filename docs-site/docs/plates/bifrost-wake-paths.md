---
title: Bifrost wake paths
sidebar_label: Bifrost wake paths
plate_type: domain model
---

# Bifrost wake paths

Recited against bifrost `8a43b6c`. Left is what arrives. The Bifrost box is the server. Right is whether a seat is woken, the line is only stored, or a side channel rings.

![Bifrost wake paths](/plates/x/bifrost-wake-paths.png)

The ASCII below is the same character grid the PNG was drawn from.

```
   DM                                                                                           ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐            
 ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄►┆      DM      ┆            
 ┆                                                                                              └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘            
 ┆                                                                                                                          
 ┆                        ┌────────────────────────────────────────────────────────────────┐                                
 ┆                        │ BIFROST                                                        │                                
 ┆                        │                                                                │                                
 ┆  ┌───────────────┐head │  ┌──────────────────┐offer┌──────────────────┐      allow      │    ┌──────────────┐            
 ┆  │    NEW HEAD   │─●───├─►│      INBOX       │────►│   WAKE FILTER    │─────────────────┤─●─►│  SEAT WOKEN  │┄┄┐         
 ┆  │               │ │   │  │                  │     │                  │            drop │ │  │              │  ┆         
 ┆  │    head sha   │ │   │  │   store lines    │     │  allow or drop   │                 │ │  │              │  ┆         
 ┆  └───────────────┘ │   │  └──┬───────────────┘     └──────────────────┘                 │ │  └──────────┴───┘  ┆         
 ┆                    │   │     │                ┌────────▲         ▲                      │ │─return      ┆ack   ┆         
 ┆                    │   │     │─never settles  │nudge             └─────┐timed           │ │ filtered    ┆      ┆         
 ┆            packet  │   │     ▼                │                ▼┄┄┄┄┄┄┄┼ack clears┄┄┄┄┄┄┤┄┼┄┄┄┄┄┄┄┄┄┄┄┄┄┘      ┆         
 ┆  ┌───────────────┐ │   │  ┌──────────────────┐once ┌──────────────────┐│                │ │  ┌──────────────┐  ┆ doorbell
 └┄┄│    HANDOFF    │─●   │  │   NUDGE L1-L3    │────►│   STALL-FIRED    ││                │ └─►│    STORED    │  ┆         
    │               │ │   │  │                  │     │                  ││                │    │              │  ┆         
    │     packet    │ │   │  │     in place     │     │    card keys     ││       ┌────────┤───►│              │  ┆         
    └───────────────┘ │   │  └──────────────────┘     └──────────────────┘│       │        │    └──────────────┘  ┆         
                      │   │             ┌─once──────────────────▲         │       │        │ ┌┄┄┄┄┄┄┄┄┄┄▲         ┆         
                      │   │             │                                 │       │        │ ┆                    ┆         
              post    │   │             │         ┌───────────────────────┘       │        │ ┆                    ┆         
    ┌───────────────┐ │   │  ┌──────────────────┐ │   ┌──────────────────┐        │        │ ┆  ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐  ┆         
    │   BOARD POST  │─●   │  │     TRIPWIRE     │─┘   │       HITL       │────────┘        │ ┆  ┆   DOORBELL   ┆◄┄┘         
    │               │   ┌─├─►│                  │     │                  │ to:human        │ ┆  ┆              ┆            
    │               │   │ │  │    timed run     │     │     to:human     │                 │ ┆  ┆ ready/green  ┆            
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

## Boxes (recited against bifrost 8a43b6c)

- **NEW HEAD** — collector route pass (`server.mjs:3430`) and `noteCi` (`:1376`, posts at `:1382`). The sha is the **head**. The collector critic-return line (`collector/ci_inbox.py:346`, reason `green head returns to critic` at `:383`) is stored and then dropped by `allowWake` (bifrost#108). The JS green-head reason `CI green on current head` still wakes (`wake-filter.mjs:85`, `:643`).
- **HANDOFF** — `POST /inbox` packet kinds `ready|critic_fail|live_pass|merge|ci_fail` (`server.mjs:4382`, `:4391`, posts at `:4422`). The dashed **DM** lane is outside Bifrost: a Grok Bot `SendToAgent` can start a chat turn even when the webhook is down. It is not implemented in this repo.
- **BOARD POST** — other `POST /inbox` lines and `POST /inbox/builder` (`:4597`, posts at `:4602`), including station ticks (`stationTick` `:2836`, posts at `:2842`) and owner prompts.
- **CLOCK TICK** — `governorRun` (`:2545`) trips the clock; `POST /clock` (`:4457`) starts the same timed run by hand.
- **CURSOR** — `POST /cursor/webhook` (`:4181`) writes `agents.jsonl` via `acceptCursorWebhook` (`worktrack.mjs:229`). It does not call `noteWake` or `postSeatLines`. The no-wake line ends at **STORED**.
- **INBOX** — `postSeatLines` (`server.mjs:1441`) stores the line, dedupes by id, then `offerLines` (`:609`).
- **WAKE FILTER** — `allowWake` (`wake-filter.mjs:616`) after `classifyBatch` / `own_actor` / `wakeLineKept`. Default drop is `{allow:false, reason:'filter'}`.
- **NUDGE L1-L3** — `nudgeLines` (`server.mjs:1258`) updates the same inbox row with `applyLineNudge` (`governor.mjs:209`). When `applied.wake` is true it calls `noteWake` (`server.mjs:1284`), which goes through the wake filter and can wake the seat. L2/L3 of an already-fired line do not wake; that is intended.
- **TRIPWIRE** — `createClock` / `wakeRun` (`governor.mjs:96`, `server.mjs:2500`) mint `type: timed_run` and call `noteWake` (`:2514`). `allowWake` lets `timed_run` through (`wake-filter.mjs:636`).
- **STALL-FIRED** — `stall-fired.json`, read by `readStallFired` (`server.mjs:2434`) and written by `persistStallFired` (`:2442`, file path at `:2445`). Keys are line id and `repo#n` (`stallLineKeys`, `governor.mjs:163`).
- **HITL** — `flagBreaker` (`server.mjs:592`) posts `needs_human` with `to:'human'` and an hourly id (`:598-600`). `allowWake` stores that line and does not wake a bot (`wake-filter.mjs:627`). A needs_human line to a seat wakes once per card (`:628-630`).
- **SEAT WOKEN** — `enqueuePending` then `flushWake` (`server.mjs:478`, `:801`).
- **DOORBELL** — after a successful inbox wake, `flushWake` calls `ringCriticDoorbell` (`:843`, `:775`) for `ready` / `ci_pass` (`chat-doorbell.mjs:1-4`, `:9`). Dashed: a configured extra, not the inbox webhook.
- **DM** — dashed lane outside Bifrost (`SendToAgent`). A broken inbox is not fixed by a DM.
- **STORED** — the line stays in the seat inbox and no webhook is sent.

## Edges

- **once** — first stall or line-nudge on a card writes the stall-fired set (`applyLineNudge` `governor.mjs:219-221`; `planStallWakes` `:236`). The same word is used on both edges; there is no "mark".
- **head** / **packet** / **post** — NEW HEAD, HANDOFF and BOARD POST meet at junction dots on one line; one arrow lands on INBOX.
- **ack clears** — starts at SEAT WOKEN (live-inbox `--ack`) and ends in the arrow into STALL-FIRED. `ackLines` calls `clearStallFired` (`server.mjs:1003`, `governor.mjs:196`). `releaseClosedStallKeys` (`server.mjs:2533`) drops the same keys when the card is closed or the line is settled, on each `governorRun` (`:2546`).
- **nudge** / **timed** — NUDGE L1-L3 and TRIPWIRE both run `noteWake` into WAKE FILTER (distinct arrows into the filter), then **allow** to SEAT WOKEN.
- **to:human** — HITL → STORED with its own arrowhead, no bot wake.
- **no wake** — CURSOR → STORED with its own arrowhead.
- **INBOX → NUDGE** — nudge bumps stored lines. The **never settles** leader sits on this edge.
- **doorbell** — SEAT WOKEN → DOORBELL, `ready` / `ci_pass` only.
- **DM** — HANDOFF around the outside of Bifrost to the DM box.

## Open holes (bifrost#108)

Wording from [bifrost#108](https://github.com/0xRayAI/bifrost/issues/108), still open on this head:

- **never settles** — `settledLine` (`server.mjs:1142`) only treats a close/merge, or a closed/done card, as settled. `aheadOfReview` (`:1130`) keeps a newer sha from being settled; it does not settle a `review` / `critic_fail` whose sha is no longer the card head. `lineDone` (`:1106`) hides a line for the reviewer only when `card.reviewer.at_head` is true. It never hides or acks the author's copy of a stale FIX (`reviewer.stale` / `at_head: false`), so that line can still nudge.
- **return filtered** — `allowWake` only lets critic through on a `ci_pass` when `reason === "CI green on current head"` (`wake-filter.mjs:85`, `:643`). The collector critic-return line uses reason `green head returns to critic` (`collector/ci_inbox.py:383`), so it lands on the board and the webhook is skipped with `filter`.

stamped · 0xray 4.2.3
