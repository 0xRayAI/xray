---
title: Suit wear
sidebar_label: Suit wear
---

# Suit wear

Wear copies hooks, features.json, and the consumer gitignore into the project, and those copies still name the old log folder.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌──────────────────────┐                                 │
│   │ wear / postinstall   │                                 │
│   └──────────┬───────────┘                                 │
└──────────────┼─────────────────────────────────────────────┘
               v
┌──────────────┼─────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ hooks · features.json · consumer gitignore         │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌──────────────────────────────────────────────────┐    │
│   │ consumer .xray/logs and .xray/inference          │    │
│   └──────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

`xray/features.json` sets `activity_logging.log_path` to `.opencode/logs`. `scripts/node/consumer-gitignore.cjs` ignores `logs/framework/`. The installed hooks append that old path.

A worn project is a consumer. Its writes go to its own `.xray/logs` and `.xray/inference`, not into `docs/` and not into `.opencode/logs`.

A fresh wear fastens mill and inspect. Grok's Goggles launcher stays on that install: the checkout script when the package name is `0xray`, and `node_modules/0xray` for every other project.

stamped · 0xray 4.0.42
