# Memory Routing (v3.3+)

Pluggable memory-routing enrichment for orchestrator agent selection, thinDispatch scoring, researcher votes, and per-task feedback.

**Default provider:** [Repertoire](./repertoire.md) (`@0xray/repertoire`) in the framework repo.

## Overview

```
features.json (memory_routing)
       │
       ▼
provider-loader.ts ──► createMemoryRoutingProvider()
       │
       ├── ExecutionPlanner (enrichTasks, getTaskConfidence, selectAgent)
       ├── thinDispatch.scoreAndRoute (resolveThinDispatch)
       ├── Researcher analyzeProposal (researcher-confidence.ts)
       └── ingestFeedback (per-task, v3.3)
```

## Configuration

In `.xray/features.json` or `xray/features.json` (validated by `features.schema.json`):

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

### Provider options

| `provider` | Use case |
|------------|----------|
| `"null"` | Disable enrichment (consumer default without Repertoire) |
| `"repertoire"` | Repertoire `MemoryRoutingProvider` |
| `"custom"` | Your own `createMemoryRoutingProvider()` export |

### Disable

```json
"memory_routing": { "enabled": false, "provider": "null" }
```

Full field reference: [features.json](./features-json.md).

## Pipeline integration

| Surface | Method | Behavior (v3.3–3.3.1) |
|---------|--------|------------------------|
| **ExecutionPlanner** | `enrichTasks`, `getTaskConfidence`, `selectAgent` | Complexity boost, trap hints, signal-aware agent pick |
| **thinDispatch** | `resolveThinDispatch` | Score adjustment; architect override on high-confidence traps |
| **Researcher** | `getTaskConfidence` via provider sync | `MEMORY_ROUTING:` block in governance output |
| **[AsideContext](./aside-context.md)** | `buildInheritedContext` → `inheritedContext.memoryRouting` on `spawnAside` |
| **Feedback** | `ingestFeedback` | Per-task outcome loop (not aggregate-only) |

## Confidence gate (v3.3.1)

`ExecutionPlanner.calculateTaskComplexity()` calls `getTaskConfidence()` when the provider implements it:

- Adds `complexityBoost` from matched primitives
- Detects `highConfidenceTrapPresent` / `ontologicalTrapDetected`
- Passes trap context to `selectAgent()` for trap-capable routing

Example: trap tasks score higher complexity than plain tasks at the same `estimatedComplexity`.

## Repertoire MCP (external hosts)

In-process routing uses `MemoryRoutingProvider`. External LLM sessions (Hermes, Grok) should use **repertoire-mcp**:

```json
"repertoire": {
  "command": "npx",
  "args": ["-y", "@0xray/repertoire", "mcp"]
}
```

Tools: `repertoire__get_task_confidence`, `repertoire__get_high_confidence_signals`, `repertoire__search_primitives`, `repertoire__ingest_feedback`.

See [Repertoire Integration](./repertoire.md) for full setup.

## Custom providers

Export from your package:

```typescript
export function createMemoryRoutingProvider(
  config?: Record<string, unknown>
): MemoryRoutingProvider
```

Implement the contract in `src/memory-routing/types.ts`. Repertoire is the reference implementation.

## Testing

```bash
npm test -- src/__tests__/unit/memory-routing-integration.test.ts
npm test -- src/__tests__/unit/memory-routing-provider.test.ts
npm test -- src/__tests__/unit/researcher-confidence.test.ts
npm test -- src/__tests__/unit/researcher-repertoire-wiring.test.ts
```

## Related

- [Repertoire Integration](./repertoire.md)
- [Features Since 3.1](./features-since-3.1.md)
- [features.json Reference](./features-json.md)
- [Consumer Migration](./consumer-migration.md)