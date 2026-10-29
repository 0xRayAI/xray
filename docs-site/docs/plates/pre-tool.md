---
title: Pre tool
sidebar_label: Pre tool
plate_type: pipeline
---

# Pre tool

Two host edges join the same fields, run the delegation gate, then one lens deny.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ tool name · command · content · paths                │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ PROCESSING LAYER             v                               │
│   ┌────────────────────────────┐ ┌─────────────────────────┐ │
│   │ Cursor edge                │ │ Grok edge               │ │
│   │ evaluatePreToolGate        │ │ evaluatePreToolGate     │ │
│   │ then lensDecision          │ │ then lensBeforeResearch │ │
│   └─────────────┬──────────────┘ └────────────┬────────────┘ │
└─────────────────┼──────────────────────────────┼─────────────┘
                  └──────────────┬───────────────┘              
                                 v                              
┌────────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                   v                             │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ deny when the lens denies                            │   │
│   └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

Both hosts run `evaluatePreToolGate` before the lens. Cursor joins the command, the written content, and the paths, then calls `lensDecision` (`src/integrations/cursor/hooks/pre-tool-use.js:114-118`) after the gate (`:99-107`). Grok joins the same fields and calls `lensBeforeResearch` (`src/integrations/grok/hooks/pre-tool-use.js:84-90`) after the gate (`:60`). A deny ends the hook (`cursor :116-117`, `grok :86-87`). The plate that belongs here is lens-gate.

stamped · 0xray 4.1.4
