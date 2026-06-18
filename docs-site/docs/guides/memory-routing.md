# Memory Routing (v3.3+)

Pluggable memory-routing enrichment for orchestrator agent selection, thinDispatch scoring, and researcher votes.

## Overview

Memory routing lets 0xRay consult an external signal provider before dispatching work. The framework repo ships with **Repertoire** as the default provider; consumer projects can disable routing or plug in their own module.

## Configuration

Add to `.xray/features.json` (validated by `features.schema.json`):

```json
{
  "memory_routing": {
    "enabled": true,
    "provider": "repertoire",
    "module_path": "../repertoire/dist/provider/memory-routing-provider.js",
    "config": {
      "dataDir": "../repertoire/data",
      "signalsPath": "../repertoire/data/curated_signals.json",
      "logDir": "../repertoire/logs/groover-inference"
    }
  }
}
```

### Disable for consumers without a provider

```json
"memory_routing": { "enabled": false }
```

## What it enriches

| Surface | Behavior |
|---------|----------|
| Orchestrator | Agent selection informed by curated signals |
| thinDispatch | Complexity scoring boost from confidence signals |
| Researcher | Vote weighting from memory-routing context |
| Feedback | Per-task `ingestFeedback` (not aggregate-only) |

## Confidence gate (v3.3.1)

Orchestrator execution planning applies a **confidence gate** before multi-agent dispatch — complementary to memory-routing signals.

## Testing

Framework repo includes memory-routing integration tests (`src/__tests__/unit/memory-routing-integration.test.ts` and related).

## Related

- [Consumer Migration](./consumer-migration.md) — v3.4+ integration
- [Full Reference](../full-reference.md) — `features.json` fields