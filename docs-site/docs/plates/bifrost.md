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
│   │ collector board (live_mesh.py) on Railway          │   │
│   │ PR, issue, review, push, and merge → beats         │   │
│   │ inbox lines use routing/inbox-roles.json           │   │
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

The governor runs inside the server (`house/live/app/server.mjs`). Bifrost is optional. When `LIVE_URL` is unset, the board is hand-kept `house/WAVEBOARD.md`. When `LIVE_URL` is set, the board is Bifrost (`GET /cards`). When nothing on the board moves for `BIFROST_TRIPWIRE_MINUTES` (default 30), the tripwire starts a timed run. On a stalled board, every seat with open work is woken with a deadline, and the CoS role is told. On an empty board, the CoS role is woken to pull the next work, unless weekly burn is at or above 75% (`BIFROST_WEEKLY_BURN` of `0.75` or `75`): that empty-board wake stays quiet and no seat is woken. Below 75% the empty board still wakes the CoS role. The same burn keeps a due plan card quiet. The CoS role can start the same run with `POST /clock`. A seat's move clears the clock.

A new pull request starts packet-first: a short packet (scope, files, plates and docs, tests, out of scope) gets critic PASS before any code. While a PR's cloud is live, follow-ups collapse into one `batch` string. That string flushes on `run_end` or `ci_pass` only. A green head queues critic on `run_end` when the checks are already green, and on `ci_pass` when the run has already ended. A collector ci row carries `head_sha` when it has no `sha`. A green event seen before `run_end` is not replayed. A required-check failure on `run_end` goes back to the worker. A pending check waits. A buffered PR stays in-beat, so nudge L1 does not fire while events are waiting.

`evalNudges` is the one nudge path. A live card with no beat for `NUDGE_L1_S` (default 3600) sends L1 to the next owner, or else the card owner. L2 goes to the CoS role after `NUDGE_L2_S` (default 1800). L3 repeats to that L1 seat after `NUDGE_L3_S` (default 7200), and the CoS role is woken once to reassign. An unacked inbox line steps L1, L2, and L3 on that same seat, `NUDGE_LINE_S` apart (default 900), and the CoS role is woken at L3. A missing handoff nudges the owing seat at L1, again at L2, and again at L3, and the CoS role is woken once at L3. Seats with no route, and seats whose wake has gone quiet, each hold one nudge to the CoS role.

A cloud agent is its own board row (`cloud_agents`, also copied onto `board.cloud_agents`): `bcId`, owning seat, linked card, `pr`, and state `running`, `finished`, or `failed`. The Cursor webhook and seat activity `kind: cloud_agent` feed that row. The pull URL is the row's `pr`.

A packet post creates the card; the chat refuses a missing card id; the cloud agent pushes; the seat App opens the pull request; the server attaches both; the activity line gains no new field.

Code lives under `house/live/` (collector, board, inbox routing, server). `house/live/feed/live_mesh.py` runs the collector and the board. `house/live-mesh/fetch_feed.py` is the upstream feed the deploy assembles. Deploy only via `house/live/app/deploy.sh`. A Railway build straight from git stops in the Dockerfile with `ERROR: collector/ is not assembled`. The plate that belongs here is house.

stamped · 0xray 4.1.0
