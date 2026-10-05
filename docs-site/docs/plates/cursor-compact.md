---
title: Cursor compact
sidebar_label: Cursor compact
---

# Cursor compact

Cursor preCompact writes the station card and cannot block the compact.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the host fires preCompact                          │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ write the station card                             │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the compact continues                              │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

The file is `src/integrations/cursor/hooks/pre-compact.js`. The message tells the seat to read STATION.md. The plates that belong here are payload-heat and station-heat.

stamped · 0xray 4.0.40
