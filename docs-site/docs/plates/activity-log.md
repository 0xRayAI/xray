---
title: Activity log
sidebar_label: Activity log
---

# Activity log

Three paths. They are not one file. The activity logger does not call write-home (`src/core/activity-logger.ts:18-21`).

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ activity_logging.log_path, or none                   │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v
┌──────────────────────────────┼───────────────────────────────┐
│ PROCESSING LAYER             v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ initializeActivityLogger                             │   │
│   │ strip a trailing /logs, else logs/framework          │   │
│   │ write-home names a third path and does not run here  │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v
┌──────────────────────────────┼───────────────────────────────┐
│ OUTPUT LAYER                 v                               │
│   ┌────────────────┐ ┌──────────────────┐ ┌───────────────┐  │
│   │ .opencode/     │ │ logs/framework/  │ │ .xray/logs/   │  │
│   │ activity.log   │ │ activity.log     │ │ activity.log  │  │
│   └────────────────┘ └──────────────────┘ └───────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

`initializeActivityLogger` uses `config.log_path`, and if that is absent it uses `logs/framework` (`src/core/activity-logger.ts:73-81`). Shipped `activity_logging.log_path` is `.opencode/logs` (`xray/features.json:105`). The logger strips a trailing `/logs`, so that value lands in `.opencode/activity.log` (`activity-logger.ts:73-81`). `write-home.cjs` names the home `.xray/logs/activity.log` (`src/integrations/hooks/write-home.cjs:8-13`) and treats `.opencode/logs`, `.opencode`, `logs`, `logs/framework`, and any path ending in `/logs/framework` as legacy (`:39-48`).

stamped · 0xray 4.1.3
