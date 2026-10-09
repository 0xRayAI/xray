---
title: Reporting
sidebar_label: Reporting
---

# Reporting

Logs become a report. A valid cache returns the formatted report and does not write the file again.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│                                                            │
│   ┌──────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│   │ activity log     │  │ schedule     │  │ CLI request │ │
│   └────────┬─────────┘  └──────┬───────┘  └──────┬──────┘ │
│            └───────────────────┴────────┬────────┘        │
└─────────────────────────────────────────┼──────────────────┘
                                          v
┌─────────────────────────────────────────┼──────────────────┐
│ PROCESSING LAYER                        v                  │
│   ┌────────────────────────────────────────────────────┐  │
│   │ FrameworkReportingSystem                           │  │
│   │ collect logs → metrics → formatReport              │  │
│   │ cache the fresh report                             │  │
│   │ write the file when outputPath is set              │  │
│   └──────────────────────────┬─────────────────────────┘  │
└──────────────────────────────┼────────────────────────────┘
                               v
┌──────────────────────────────┼────────────────────────────┐
│ OUTPUT LAYER                 v                            │
│   ┌──────────────────────────┐   ┌─────────────────────┐ │
│   │ report file              │   │ realtime health     │ │
│   │ markdown or json         │   │ score and alerts    │ │
│   └──────────────────────────┘   └─────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

stamped · 0xray 4.0.42
