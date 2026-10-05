---
title: Write home
sidebar_label: Write home
---

# Write home

Every runtime write belongs under .xray, and the consumers and organs that still name logs/framework, docs/inference, or .opencode/logs have to be pointed at that home.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌──────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│   │ activity log │ │ inference files │ │ cycle state   │  │
│   └──────┬───────┘ └────────┬────────┘ └───────┬───────┘  │
│          └──────────────────┴─────────┬────────┘          │
└────────────────────────────────────────┼──────────────────┘
                                         v
┌────────────────────────────────────────┼──────────────────┐
│ PROCESSING LAYER                       v                  │
│   ┌────────────────────────────────────────────────────┐  │
│   │ write-home.cjs · one path for every writer        │  │
│   └──────────────────────────┬─────────────────────────┘  │
└──────────────────────────────┼────────────────────────────┘
                               v
┌──────────────────────────────┼────────────────────────────┐
│ OUTPUT LAYER                 v                            │
│   ┌──────────────────────────┐   ┌─────────────────────┐ │
│   │ .xray/logs/activity.log  │   │ .xray/inference     │ │
│   └──────────────────────────┘   └─────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

The path table is `src/integrations/hooks/write-home.cjs`. Writers use it. Readers open the new file, and the old file only when the new one is not there yet.

Still on the old path until each caller is rewired: the activity logger, the framework logger, the pipeline hook, the Grok hook, the Hermes bridge, station capture, `saveSessionInference`, reporting, pulse, monitor, and `features.json` `log_path`.

stamped · 0xray 4.0.40
