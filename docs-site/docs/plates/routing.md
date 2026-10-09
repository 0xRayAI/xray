---
title: Routing
sidebar_label: Routing
---

# Routing

Task text becomes an agent. `scoreAndRoute` scores the work, then `routeToAgent` picks the tier agent. Repertoire may replace that agent when a law matches. Naming no plane stops before that pick and returns nobody.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│   │ task text    │   │ context      │   │ thresholds     │  │
│   └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
│          └──────────────────┴─────────┬─────────┘           │
└────────────────────────────────────────┼─────────────────────┘
                                         v
┌────────────────────────────────────────┼─────────────────────┐
│ PROCESSING LAYER                       │                     │
│                                        v                     │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ scoreComplexity                                      │  │
│   │ ≤15 simple · single-agent                            │  │
│   │ ≤25 moderate · multi-agent                           │  │
│   │ ≤50 complex · orchestrator-led                       │  │
│   │ >50 enterprise · orchestrator-led                    │  │
│   └──────────────────────────┬───────────────────────────┘  │
│                              v                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ lensPlane                                            │  │
│   │ no plane named stops here and the agent is empty     │  │
│   │ one plane attaches that file                         │  │
│   └──────────────────────────┬───────────────────────────┘  │
│                              v                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ routeToAgent                                         │  │
│   │ simple → code-reviewer                               │  │
│   │ moderate, complex, enterprise → architect            │  │
│   └──────────────────────────┬───────────────────────────┘  │
│                              v                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ resolveThinDispatch                                  │  │
│   │ worn repertoire may change agent and score           │  │
│   │ null provider leaves the score alone                 │  │
│   │ a stop never reaches this step                       │  │
│   └──────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               v
┌──────────────────────────────┼──────────────────────────────┐
│ OUTPUT LAYER                 v                              │
│   ┌────────────┐   ┌────────────────┐   ┌────────────────┐ │
│   │ agent      │   │ strategy       │   │ adjusted score │ │
│   └────────────┘   └────────────────┘   └────────────────┘ │
│   ┌────────────┐                                            │
│   │ file       │                                            │
│   └────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

stamped · 0xray 4.0.42
