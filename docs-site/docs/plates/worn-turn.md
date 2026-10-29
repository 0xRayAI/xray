---
title: Worn turn
sidebar_label: Worn turn
plate_type: pipeline
---

# Worn turn

The hook chain on a tool call. It does not replace pre-tool, delegation-gate, lens-gate, or routing. Shipped `inference_governance.enabled` is false (`xray/features.json:199-200`). This chain does not call `InferenceCycle` or Dynamo.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ tool name · command · written content · paths        │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ PROCESSING LAYER             v                               │
│   ┌────────────────────────────┐ ┌─────────────────────────┐ │
│   │ Cursor                     │ │ Grok                    │ │
│   │ empty input deny           │ │ evaluatePreToolGate     │ │
│   │ evaluatePreToolGate        │ │ 2+7 on top of 11+29     │ │
│   │ Codex 11 and 29 on writes  │ │ lensBeforeResearch      │ │
│   │ lensDecision               │ │ repertoireRoute         │ │
│   │ repertoireRoute            │ │ a thrown load denies    │ │
│   └─────────────┬──────────────┘ └────────────┬────────────┘ │
└─────────────────┼──────────────────────────────┼─────────────┘
                  v                              v              
┌─────────────────┼──────────────────────────────┼─────────────┐
│ OUTPUT LAYER    v                              v             │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ allow or deny                                        │   │
│   │ a deny stops the hook                                │   │
│   └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

Cursor (`src/integrations/cursor/hooks/pre-tool-use.js`) denies empty input (`:82-84`), then `evaluatePreToolGate` (`:99-107`), then Codex 11 and 29 on writes (`:109-111`), then `lensDecision` (`:114-118`), then `repertoireRoute` (`:122`). That gate import is `src/integrations/cursor/hooks/cursor-hook-utils.js:21-23`, from `delegation-gate-runtime.mjs`. `cursorHookErrorPermission` allows only `EACCES` and denies every other error (`pre-tool-use.js:21-23`). `ERR_MODULE_NOT_FOUND` allows only the bootstrap build commands (`:29-32`). Any other load failure denies (`:143`, `:162-169`).

Grok (`src/integrations/grok/hooks/pre-tool-use.js`) uses the same order with different edges: `evaluatePreToolGate` (`:60`), extra Codex 2 and 7 on writes (`:77-81`), `lensBeforeResearch` (`:84-90`), `repertoireRoute` (`:93`). A thrown load denies (`:112-124`).

stamped · 0xray 4.1.4
