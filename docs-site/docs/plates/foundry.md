---
title: Foundry
sidebar_label: Foundry
---

# Foundry

The mill builds and ships a suit.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ a version bump                                     │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ gate, then publish, then tag                       │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the registry lists that version                    │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

The card owns `scripts/foundry`. The release script is `scripts/foundry/release.mjs`. That script is the only stamp. A longer card still wins. A live publish needs `--i-mean-it`. The OTP link is the `npm-publish` lens.

stamped · 0xray 4.1.0
