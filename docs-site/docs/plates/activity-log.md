---
title: Activity log
sidebar_label: Activity log
---

# Activity log

A tool hook appends one JSON line, and reporting, pulse, and monitor read that same file back.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌──────────────┐ ┌────────────┐ ┌─────────┐ ┌────────┐ │
│   │ pipeline hook│ │ grok hook  │ │ hermes  │ │ logger │ │
│   └──────┬───────┘ └─────┬──────┘ └────┬────┘ └───┬────┘ │
│          └───────────────┴─────────────┴─────┬────┘      │
└──────────────────────────────────────────────┼───────────┘
                                               v
┌──────────────────────────────────────────────┼───────────┐
│ PROCESSING LAYER                             v           │
│   ┌────────────────────────────────────────────────────┐ │
│   │ append one JSON line                               │ │
│   └──────────────────────────┬─────────────────────────┘ │
└──────────────────────────────┼───────────────────────────┘
                               v
┌──────────────────────────────┼───────────────────────────┐
│ OUTPUT LAYER                 v                           │
│   ┌──────────────────────────────────────────────────┐  │
│   │ .xray/logs/activity.log                          │  │
│   └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

Today those writers append `logs/framework/activity.log`. The features default still says `.opencode/logs`. The file they share after the rewire is `.xray/logs/activity.log`.

When: on the tool hook, on framework logger flush, and on boot when file logging is on. Why: the report and the pulse read one tail, not a pile of copies.

stamped · 0xray 4.0.42
