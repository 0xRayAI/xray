---
title: Work fresh
sidebar_label: Work fresh
---

# Work fresh

Refresh writes one Fresh line from git and the published package.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the repo and the published version                    │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ describe one Fresh line                               │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ one line on the station card                          │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

refreshFreshness in src/nucleus/work-freshness.mjs fetches origin, reads npm view 0xray version, and returns that one line. A compact hook does not call it. The plate that belongs here is station-card.

stamped · 0xray 4.0.42
