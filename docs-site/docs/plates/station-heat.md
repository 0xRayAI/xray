---
title: Station heat
sidebar_label: Station heat
---

# Station heat

On a compact event applyStationHeat stamps the notes pickup line.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the compact hook                                   │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ stamp the pickup line                              │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the pickup matches intent                          │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

`isCompactHook` is true when the hook name contains compact. The body of NOTES.md is left alone. The plates that belong here are pickup-stamp and notes-page.

stamped · 0xray 4.0.40
