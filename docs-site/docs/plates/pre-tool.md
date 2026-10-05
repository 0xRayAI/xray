---
title: Pre tool
sidebar_label: Pre tool
---

# Pre tool

The tool hook is where the lens gate runs.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the tool name and its arguments                       │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ join the command, the content, and the paths          │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ deny when the lens gate denies                        │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

pre-tool-use.js joins the command, the written content, and the paths, then calls lensBeforeResearch. A deny ends the hook. The plate that belongs here is lens-gate.

stamped · 0xray 4.0.40
