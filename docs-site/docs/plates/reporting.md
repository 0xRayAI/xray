---
title: Reporting
sidebar_label: Reporting
---

# Reporting

Logs become a report. Session start can also drop a schedule marker. The marker is a side output, not a second chain through the formatter.

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
│   │ cache a fresh report, then write the file          │  │
│   └──────────────────────────┬─────────────────────────┘  │
│                              │                            │
│   ┌──────────────────────────┼─────────────────────────┐  │
│   │ SessionStart marker      │                         │  │
│   │ autonomous-reporting     │  side output            │  │
│   │ scheduled flag           │                         │  │
│   └──────────────────────────┼─────────────────────────┘  │
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
