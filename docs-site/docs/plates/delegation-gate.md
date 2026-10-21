---
title: Delegation gate
sidebar_label: Delegation gate
plate_type: pipeline
---

# Delegation gate

The pre-tool gate for every host. The loader is `src/integrations/hooks/delegation-gate-runtime.mjs`, which re-exports `evaluatePreToolGate` (`delegation-gate-runtime.mjs:87`). The header on the gate names that runtime (`src/nucleus/delegation-gate.ts:3`).

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ a tool call                                          │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ PROCESSING LAYER             v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ evaluatePreToolGate                                  │   │
│   │ station heat, then constitution                      │   │
│   │ synthesis and pending, unless ceremony is lite       │   │
│   │ then the spawn plan                                  │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ evaluateConstitutionGate                             │   │
│   │ Codex 70 stale checkout on a write                   │   │
│   │ Codex 69 new surface                                 │   │
│   │ Codex 11 any, or a suppression comment               │   │
│   │ Codex 29 direct dynamic-code call                    │   │
│   │ destructive shell                                    │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ OUTPUT LAYER                 v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ allow, or deny                                       │   │
│   └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

`evaluateConstitutionGate` (`src/nucleus/delegation-gate.ts:636-696`) denies a write that touches a stale checkout (Codex 70, `:646-652`), a new surface (Codex 69, `:656-667`), an unrestricted type or a suppression comment (Codex 11, `:671-677`), a direct dynamic-code call (Codex 29, `:679-685`), and a destructive shell (`:688-693`). `evaluatePreToolGate` (`:699-738`) runs station heat, then constitution, then synthesis and pending delegations unless ceremony is lite (`:718-734`), then the spawn plan (`:736`). A path outside this copy is allowed. A worktree is judged on its own HEAD. A spawn with no plan follows the host temperament.

stamped · 0xray 4.1.4
