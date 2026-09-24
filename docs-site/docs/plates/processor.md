---
title: Processor
sidebar_label: Processor
---

# Processor

Three pipelines run in parallel. A is the live suit. B is the legacy processor manager. C is mill, git, and CI. Nothing in A is an input to B or C.

```
┌────────────────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                            │
│                                                                        │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│   │ tool / session   │  │ prompt text      │  │ commit / release   │  │
│   └────────┬─────────┘  └────────┬─────────┘  └─────────┬──────────┘  │
└────────────┼─────────────────────┼──────────────────────┼─────────────┘
             v                     v                      v
┌────────────┼─────────────────────┼──────────────────────┼─────────────┐
│ PROCESSING LAYER   three parallel pipelines             │             │
│            │                     │                      │             │
│  ┌─────────┴──────────┐ ┌────────┴─────────┐ ┌──────────┴──────────┐ │
│  │ A suit (live OS)   │ │ B legacy manager │ │ C mill / git / CI   │ │
│  │                    │ │                  │ │                     │ │
│  │ SessionStart       │ │ prompt-security  │ │ mint                │ │
│  │        v           │ │        v         │ │        v            │ │
│  │ PreToolUse         │ │ executePre       │ │ inspect             │ │
│  │        v           │ │        v         │ │        v            │ │
│  │ tool runs          │ │ work             │ │ pre-commit          │ │
│  │        v           │ │        v         │ │        v            │ │
│  │ PostToolUse        │ │ executePost      │ │ pre-push            │ │
│  │        v           │ │                  │ │        v            │ │
│  │ compact heat       │ │                  │ │ foundry release     │ │
│  │                    │ │                  │ │        v            │ │
│  │                    │ │                  │ │ CI quality → docs   │ │
│  └─────────┬──────────┘ └────────┬─────────┘ └──────────┬──────────┘ │
└────────────┼─────────────────────┼──────────────────────┼────────────┘
             v                     v                      v
┌────────────┴─────────────────────┴──────────────────────┴────────────┐
│ OUTPUT LAYER                                                          │
│                                                                       │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│   │ allow / deny     │  │ processor result │  │ gate / tag         │ │
│   └──────────────────┘  └──────────────────┘  └────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```
