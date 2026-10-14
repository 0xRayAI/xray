---
title: Bifrost
sidebar_label: Bifrost
plate_type: pipeline
---

# Bifrost

Bifrost is an autonomous AI fleet management system. Every PR, issue and comment becomes a card on one board and a line in the right seat's inbox, and the seat is woken to act on it.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│   │ GitHub       │ │ seat         │ │ Railway deploys,  │  │
│   │ PR / issue / │ │ presence +   │ │ /healthz probes   │  │
│   │ comment      │ │ activity     │ │                   │  │
│   └──────┬───────┘ └──────┬───────┘ └─────────┬─────────┘  │
│          └────────────────┴───────────────────┘            │
└─────────────────────────────┬──────────────────────────────┘
                              v
┌─────────────────────────────┼──────────────────────────────┐
│ PROCESSING LAYER            v                              │
│   ┌────────────────────────────────────────────────────┐   │
│   │ burst-live collector on Railway                    │   │
│   │ every PR, issue, comment → a card + an inbox line  │   │
│   │ (open, closed or merged); new head → reviewer wake │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌──────────────┐ ┌──────────────────┐ ┌───────────────┐  │
│   │ the board    │ │ seat inboxes +   │ │ seat presence │  │
│   │ (cards)      │ │ wake webhooks    │ │ + archive     │  │
│   └──────────────┘ └──────────────────┘ └───────────────┘  │
└────────────────────────────────────────────────────────────┘
```

The governor runs inside the server. Its tripwire is the trigger: when nothing on the board moves for a set window, it starts the clock. On a stalled board, every seat with open work is woken with a deadline. On an empty board, the CoS seat is woken to pull the next work. The countdown shows on the board until a seat moves something, and the CoS can start the same timed run by hand. On the same tick the watchdog flags stalled lines (one bounded re-wake per window, an ack clears it), seats with no route, and seats whose wake has gone quiet.

Code lives under `house/live/` (collector, board, inbox routing, server) and `house/live-mesh/` (`fetch_feed.py`). Deploy only via `house/live/app/deploy.sh`: it assembles `collector/`, and a build straight from git stops with "collector/ is not assembled". The plate that belongs here is house.

stamped · 0xray 4.0.43
