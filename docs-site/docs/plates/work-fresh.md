---
title: Work fresh
sidebar_label: Work fresh
plate_type: pipeline
---

# Work fresh

Refresh writes one Fresh line from git and the published package.

```
┌───────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                   │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ the repo and the published version                    │   │
│   └──────────────────────────┬────────────────────────────┘   │
└──────────────────────────────┼────────────────────────────────┘
             v                                                   
┌────────────┼──────────────────────────────────────────────────┐
│ PROCESSING LAYER                                              │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ describe one Fresh line                               │   │
│   └──────────────────────────┬────────────────────────────┘   │
└──────────────────────────────┼────────────────────────────────┘
                               v                                 
┌──────────────────────────────┼────────────────────────────────┐
│ OUTPUT LAYER                 v                                │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ one line on the station card                          │   │
│   └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

refreshFreshness in src/nucleus/work-freshness.mjs fetches origin, reads npm view 0xray version, and returns that one line. A compact hook does not call it. The plate that belongs here is station-card.

`localResidue` in the same module is the clean-tree gate on the way out. It reads this checkout. Suit files under `.xray` stay out of the count. A clean checkout that is only behind main waits for the next edit.

stamped · 0xray 4.2.1
