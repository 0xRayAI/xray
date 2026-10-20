---
title: Kept line
sidebar_label: Kept line
---

# Kept line

A station rewrite keeps one Fresh line and drops the copies. `Skills:` and `Keys:` are kept the same way when the new card does not already carry them. A fleet `Plane:` (core, integration, ecosystem, distribution, live) replaces the stock plane line.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the card already on disk                              │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ keep the latest Fresh line                            │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ one Fresh line in the stock card                      │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

mergeStationMarkdown in src/integrations/hooks/station-hook-runtime.cjs treats a Fresh line as stock. Copies are not preserved. When the new card has no Fresh line, the latest one is kept. The plates that belong here are station-card and work-fresh.

stamped · 0xray 4.1.0
