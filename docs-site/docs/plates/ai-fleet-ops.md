---
title: AI Fleet Ops
sidebar_label: AI Fleet Ops
plate_type: pipeline
---

# AI Fleet Ops

One control plane and one queue run the fleet.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────┐   │
│   │ One plane    │   │ One queue    │   │ Spend policy   │   │
│   │ one picture  │   │ one item     │   │ money waits    │   │
│   │ of the fleet │   │ one owner    │   │ for a human    │   │
│   └──────┬───────┘   └──────┬───────┘   └───────┬────────┘   │
│          └──────────────────┴─────────┬─────────┘            │
└────────────────────────────────────────┼─────────────────────┘
                                         v                      
┌────────────────────────────────────────┼─────────────────────┐
│ PROCESSING LAYER                       │                     │
│                                        v                     │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ Frameworks build                                     │   │
│   │ agents and tools are built here                      │   │
│   │ tests finish before they run                         │   │
│   │ the build does not run the fleet                     │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ Ops runs                                             │   │
│   │ operations runs the fleet                            │   │
│   │ day to day, on one queue                             │   │
│   │ it does not do the build                             │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ Pilot                                                │   │
│   │ a bounded trial                                      │   │
│   │ a receipt before it widens                           │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ Ship gate                                            │   │
│   │ production waits on this gate                        │   │
│   │ spend policy still holds                             │   │
│   │ live means it runs for real                          │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ OUTPUT LAYER                 v                               │
│   ┌────────────┐   ┌────────────────┐   ┌────────────────┐   │
│   │ Production │   │ Policy held    │   │ Consult        │   │
│   │ runs live  │   │ spend in rule  │   │ ops.0xray.dev  │   │
│   └────────────┘   └────────────────┘   └────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

Work enters one picture and one queue. Each item is one issue or pull request, on its own branch, and it does not sit on a second pile (`grok-bot/OP-PROC.md:6`). Only one pass of that queue is active at a time (`grok-bot/OP-PROC.md:20`). The queue moves from a source, to an owner, to an artifact, to evidence, to the next owner (`grok-bot/ops/OPS-SPEC.md:26`).

The control plane under that queue has three layers: the instructions agents follow, the automatic checks on the host, and the tools they invoke (`grok-bot/ops/THREE-LAYERS.md:9`, `grok-bot/ops/THREE-LAYERS.md:10`, `grok-bot/ops/THREE-LAYERS.md:11`). Mixing those layers fogs the picture (`grok-bot/ops/THREE-LAYERS.md:5`).

Frameworks build. Operations runs. The build publishes the artifact (`grok-bot/ops/OPS-SPEC.md:17`). Operations keeps that queue moving (`grok-bot/ops/OPS-SPEC.md:19`). It assigns the work and keeps the receipt, and it does not execute the build (`grok-bot/ops/OPS-SPEC.md:110`). Agents execute and prove. Humans approve money, public posts, and credentials (`grok-bot/ops/OPS-SPEC.md:8`).

Pilot, then production. A trial is not the live system. Done means the change is on the default branch and live where it runs (`grok-bot/ops/OPS-SPEC.md:23`). Ship, live, security, and identity wait on the strict gate (`grok-bot/ops/OPS-SPEC.md:32`).

Spend and policy stay with a person. Spend, credentials, and destructive deletes do not ride along with the build (`grok-bot/ops/OPS-SPEC.md:89`, `grok-bot/LEXICON.md:49`). Publish, production, pay, secrets, and deletes ask first (`grok-bot/OP-PROC.md:62`).

Who does which job is a separate plate (`docs-site/docs/plates/fleet.md`).

Write consult@0xray.dev. The ops site is https://ops.0xray.dev.

stamped · 0xray 4.1.5
