# Memory Routing (v3.3+)

Pluggable **judgment** enrichment for orchestrator agent selection, thinDispatch scoring, researcher votes, and per-task feedback. Not session continuity — that is [Station vs Repertoire 0.1](./station-vs-repertoire.md).

**Repertoire is preferred.** [Repertoire](./repertoire.md) (`@0xray/repertoire@0.2.8` vendored) ships **on**. Dest is named invariants (factory + stack laws), not hangar `repo-*` or git slugs. Station is the compact ticket, not a substitute. Explicit opt-out only: `"enabled": false, "provider": "repertoire"`.

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
 "module_path": "node_modules/@0xray/repertoire/dist/provider/memory-routing-provider.js",
 "config": {
 "signalsPath": ".xray/state/repertoire/curated_signals.json",
 "statePath": ".xray/state/repertoire/inference-state.json",
 "feedbackDir": ".xray/state/repertoire/feedback"
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
"memory_routing": { "enabled": false, "provider": "repertoire" }
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

## Lessons, caps, and one plate

A grade that passes appends one lesson on the named law. The same task id does not step the average again. `LESSON_LINE_CAP` is 20: past that window the oldest line leaves only after its task id is in the ledger. `RETAINED_LESSON_ID_CAP` is 20, insertion order, oldest first. Speech that names no stored signal mints one proposed signal tagged `learned`. The same speech does not mint twice. `LEARNED_SIGNAL_CAP` is 24 and evicts only signals that are both `proposed` and `learned`. Factory signals stay.

A plate is the pipeline schematic. Lessons are episodes on a signal. Station keeps the short subsystem table and one pointer line, `Plate: <id> — .xray/state/plates/<id>.md`, when intent names one pipeline. Pre-compact and the `MEMORY_ROUTING` inject carry that one schematic, not the whole plate set. Stamps live in [Plates](../plates/index.md). The npm package ships `docs-site/docs/plates/`, so a worn suit resolves the stamp from the installed reader.

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