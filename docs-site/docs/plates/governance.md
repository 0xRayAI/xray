---
title: Governance
sidebar_label: Governance
plate_type: pipeline
---

# Governance

Two doors run today. One vote comes out: approve, reject, or needs_revision. The PreToolUse gate stands beside that vote. It is delegation-gate, not a step inside `govern()`.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│   ┌────────────────────────────┐ ┌─────────────────────────┐ │
│   │ GovernanceService          │ │ inference:run           │ │
│   └─────────────┬──────────────┘ └────────────┬────────────┘ │
└─────────────────┼──────────────────────────────┼─────────────┘
                  v                              v              
┌─────────────────┼──────────────────────────────┼─────────────┐
│ PROCESSING LAYER  v                            v             │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ door A: code-review, security-audit, researcher      │   │
│   │ Dynamo when require external stays true              │   │
│   │ a lens mismatch downgrades approve                   │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ door B: local matrix. Dynamo is not called           │   │
│   └──────────────────────────┬───────────────────────────┘   │
│   ┌──────────────────────────┼───────────────────────────┐   │
│   │ delegation-gate          │  beside the vote          │   │
│   └──────────────────────────┼───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ OUTPUT LAYER                 v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ approve / reject / needs_revision                    │   │
│   └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

`GovernanceService` calls `code-review`, `security-audit`, and `researcher` (`src/governance/governance-service.ts:163-168`). `resolveRequireExternalDynamo` defaults to true (`:134-149`) unless the caller passes the flag, `XRAY_LOCAL_MODE` is set, or features say otherwise. A lens mismatch downgrades an approve to `needs_revision` (`:243-252`).

`inference:run` does not use that default. With shipped `inference_governance.enabled` false (`xray/features.json:199-200`), `governProposals` returns `governWithLocalMatrix` (`src/inference/inference-cycle.ts:406-407`, `:445-460`). The comment in that function says Dynamo is not called.

stamped · 0xray 4.1.4
