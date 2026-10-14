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

A governor watches the fleet: an inbox line left unacked past `BIFROST_STALL_MINUTES` is flagged stalled and re-wakes its seat once per window (never a loop, an ack clears it); the server checks at startup that every seat has a route; and the board shows each seat's last good wake and flags a quiet one.

Code lives under `house/live/` (collector, board, inbox routing, server) and `house/live-mesh/` (`fetch_feed.py`). Deploy only via `house/live/app/deploy.sh`: it assembles `collector/`, and a build straight from git stops with "collector/ is not assembled". The plate that belongs here is house.

stamped · 0xray 4.0.43
