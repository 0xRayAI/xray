---
title: Live mesh
sidebar_label: Live mesh
plate_type: pipeline
---

# Live mesh

Ping-pong eng events become one ordered JSON feed, then a mesh render. Markdown is never the source.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐ │
│   │ GitHub REST  │ │ deploy   │ │ /health │ │ X ledger  │ │
│   │ PR/issue     │ │ muse     │ │ probe   │ │ herald    │ │
│   └──────┬───────┘ └────┬─────┘ └────┬────┘ └─────┬─────┘ │
│          └──────────────┴────────────┴────────────┘        │
└─────────────────────────────┬──────────────────────────────┘
                              v
┌─────────────────────────────┼──────────────────────────────┐
│ PROCESSING LAYER            v                              │
│   ┌────────────────────────────────────────────────────┐  │
│   │ fetch_feed.py                                      │  │
│   │ poll → dedupe on id → rewrite live-events.json     │  │
│   │ --watch keeps the feed warm                        │  │
│   └──────────────────────────┬─────────────────────────┘  │
└──────────────────────────────┼────────────────────────────┘
                               v
┌──────────────────────────────┼────────────────────────────┐
│ OUTPUT LAYER                 v                            │
│   ┌──────────────────────┐  ┌──────────────────────────┐ │
│   │ live-events.json     │  │ render_mesh.py           │ │
│   │ (+ jsonl append)     │  │ mp4 / --follow           │ │
│   └──────────────────────┘  └──────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

Paths live under `house/live-mesh/`. Schema is `schema.json`. The plate that belongs here is house.

stamped · 0xray 4.0.41
