---
title: Routing
sidebar_label: Routing
plate_type: pipeline
---

# Routing

Task text becomes an agent. `scoreAndRoute` scores the work, then `routeToAgent` picks the tier agent. Repertoire may replace that agent when a law matches. A look that names no plane stops before that pick and returns nobody. One card attaches its first file. Two names stay quiet.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────┐   │
│   │ task text    │   │ context      │   │ thresholds     │   │
│   └──────┬───────┘   └──────┬───────┘   └───────┬────────┘   │
│          └──────────────────┴─────────┬─────────┘            │
└────────────────────────────────────────┼─────────────────────┘
                                         v                      
┌────────────────────────────────────────┼─────────────────────┐
│ PROCESSING LAYER                       │                     │
│                                        v                     │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ scoreComplexity                                      │   │
│   │ ≤15 simple · single-agent                            │   │
│   │ ≤25 moderate · multi-agent                           │   │
│   │ ≤50 complex · orchestrator-led                       │   │
│   │ >50 enterprise · orchestrator-led                    │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ lensPlane                                            │   │
│   │ a look with no plane stops; agent is empty           │   │
│   │ one card attaches its first file                     │   │
│   │ two names stay quiet and attach no file              │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ routeToAgent                                         │   │
│   │ simple → code-reviewer                               │   │
│   │ moderate, complex, enterprise → architect            │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ resolveThinDispatch                                  │   │
│   │ worn repertoire may change agent and score           │   │
│   │ null provider leaves the score alone                 │   │
│   │ a stop never reaches this step                       │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ OUTPUT LAYER                 v                               │
│   ┌────────────┐   ┌────────────────┐   ┌────────────────┐   │
│   │ agent      │   │ strategy       │   │ adjusted score │   │
│   └────────────┘   └────────────────┘   └────────────────┘   │
│   ┌────────────┐                                             │
│   │ file       │                                             │
│   └────────────┘                                             │
└──────────────────────────────────────────────────────────────┘
```

stamped · 0xray 4.1.5
