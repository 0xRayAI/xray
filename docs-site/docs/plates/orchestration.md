---
title: Orchestration
sidebar_label: Orchestration
---

# Orchestration

Each tool is its own call. `spawnAside` opens around `orchestrate-task`, `analyze-complexity`, and `govern-and-apply`. `closeAside` runs when that call returns.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│                                                            │
│   ┌──────────────────────┐      ┌──────────────────────┐  │
│   │ tool name            │      │ arguments            │  │
│   └──────────┬───────────┘      └──────────┬───────────┘  │
└──────────────┼─────────────────────────────┼──────────────┘
               v                             v
┌──────────────┼─────────────────────────────┼──────────────┐
│ PROCESSING LAYER                            │              │
│              v                             v              │
│   ┌────────────────────────────────────────────────────┐ │
│   │ orchestrate-task                                   │ │
│   │ spawnAside · handleOrchestrateTask · closeAside    │ │
│   └──────────────────────────┬─────────────────────────┘ │
│                              v                           │
│   ┌────────────────────────────────────────────────────┐ │
│   │ analyze-complexity                                 │ │
│   │ a due synthesis checkpoint can return first        │ │
│   │ spawnAside · handleAnalyzeComplexity · closeAside  │ │
│   └──────────────────────────┬─────────────────────────┘ │
│                              v                           │
│   ┌────────────────────────────────────────────────────┐ │
│   │ govern-and-apply                                   │ │
│   │ a due synthesis checkpoint blocks first            │ │
│   │ spawnAside · governExternalProposals · closeAside  │ │
│   └──────────────────────────┬─────────────────────────┘ │
│                              v                           │
│   ┌────────────────────────────────────────────────────┐ │
│   │ get-orchestration-status                           │ │
│   └──────────────────────────┬─────────────────────────┘ │
│                              v                           │
│   ┌────────────────────────────────────────────────────┐ │
│   │ cancel-orchestration                               │ │
│   │ closeAside on a forced cancel or a matching session│ │
│   └──────────────────────────┬─────────────────────────┘ │
│                              v                           │
│   ┌────────────────────────────────────────────────────┐ │
│   │ optimize-orchestration                             │ │
│   └──────────────────────────┬─────────────────────────┘ │
└──────────────────────────────┼────────────────────────────┘
                               v
┌──────────────────────────────┼────────────────────────────┐
│ OUTPUT LAYER                 v                            │
│   ┌─────────────────────┐    ┌─────────────────────────┐ │
│   │ tool result         │    │ aside id                │ │
│   └─────────────────────┘    └─────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

stamped · 0xray 4.0.41
