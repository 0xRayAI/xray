---
title: Processor
sidebar_label: Processor
---

# Processor

`ProcessorManager` runs the enabled pre processors, then the enabled post processors. Prompt text longer than 10 characters is checked inside the pre pass.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│   │ tool         │   │ args         │   │ operation      │  │
│   └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
└──────────┼──────────────────┼───────────────────┼───────────┘
           v                  v                   v
┌──────────┼──────────────────┼───────────────────┼───────────┐
│ PROCESSING LAYER             │                   │           │
│          v                  v                   v           │
│   ┌──────────────────────────────────────────────────────┐ │
│   │ executePreProcessors                                 │ │
│   │ prompt-security-validator when the prompt is longer  │ │
│   │ than 10 characters                                   │ │
│   │ enabled pre processors, by priority                  │ │
│   └──────────────────────────┬───────────────────────────┘ │
│                              v                             │
│   ┌──────────────────────────────────────────────────────┐ │
│   │ executePostProcessors                                │ │
│   │ enabled post processors, by priority                 │ │
│   │ a stagger waits out its minimum interval             │ │
│   │ pre results are passed in                            │ │
│   └──────────────────────────┬───────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────┘
                               v
┌──────────────────────────────┼──────────────────────────────┐
│ OUTPUT LAYER                 v                              │
│   ┌──────────────────────────┐   ┌───────────────────────┐ │
│   │ pre result               │   │ post results          │ │
│   │ success and results      │   │                       │ │
│   └──────────────────────────┘   └───────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```
