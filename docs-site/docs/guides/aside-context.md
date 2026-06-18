# AsideContext (v3.2+)

**AsideContext** is a bounded sub-investigation layer in the MCP orchestrator. It lets multi-step orchestration spawn structured subcontexts that inherit session state, accumulate observations from governance/orchestration/complexity flows, and feed results back into the pipeline.

Restored and wired in **v3.2.0** (was briefly removed as dead code in v3.0 cleanup). Plugin module split shipped alongside it in **v3.1.1**.

## What it does

```
orchestrate-task / analyze-complexity / govern-and-apply
       │
       ▼
  spawnAside(options)  ──► ActiveAside (observations[], inheritedContext)
       │
       ├── addObservations (governance, orchestration, complexity extractors)
       ├── get-orchestration-status reports activeAsideCount
       └── closeAside / closeAllAsides on completion or cancel
```

| Concept | Description |
|---------|-------------|
| **Aside** | Short-lived subcontext with `asideId`, `description`, structured `observations` |
| **AsideObservation** | `{ key, value, source }` — audit trail from subsystems |
| **inheritedContext** | Optional record passed in (e.g. Repertoire `memoryRouting` from execution plan) |
| **priorVerdictContext** | Governance verdict hints (e.g. `decision: approve`) |

## Module location

| File | Role |
|------|------|
| `src/mcps/orchestrator/aside-context.ts` | Core: `spawnAside`, `closeAside`, observation extractors |
| `src/mcps/orchestrator/types.ts` | `AsideContextOptions`, `AsideResult`, `AsideObservation` |
| `src/mcps/orchestrator/index.ts` | Barrel export |
| `src/__tests__/unit/mcps/orchestrator/aside-context.test.ts` | Unit tests |

## MCP orchestrator wiring

### `orchestrate-task`

Spawns aside with task count + execution mode; passes `asideId` to `taskHandler`:

```typescript
const aside = await spawnAside({
  description: `Orchestration: ${description}`,
  sessionId,
  inheritedContext: { taskCount, executionMode },
});
// taskHandler receives { asideId: aside.asideId }
```

### `analyze-complexity`

Spawns aside per complexity analysis batch; observations extracted via `extractComplexityObservations`.

### `govern-and-apply`

Spawns aside around `InferenceCycle.governExternalProposals()`; `extractGovernanceObservations` records vote counts, corpus stats.

### `get-orchestration-status`

Reports `activeAsideCount` and `activeAsideIds` from live aside registry.

### `cancel-orchestration`

`force` or session-wide cancel calls `closeAllAsides()` or per-session `closeAside`.

## Memory routing + Repertoire integration (v3.3+)

When memory routing is enabled, **ExecutionPlanner** attaches Repertoire context to the execution plan:

```typescript
plan.memoryContext = provider.buildInheritedContext(memoryTasks);
```

**task-handler** spawns an aside with that context:

```typescript
await spawnAside({
  description: `Orchestrate: ${description}`,
  sessionId,
  inheritedContext: {
    memoryRouting: executionPlan.memoryContext,
  },
});
```

This links Repertoire matched signals / synthesis excerpt into the aside layer for layered exploration without a separate MCP round-trip.

Flow:

```
Repertoire.buildInheritedContext(tasks)
       → ExecutionPlan.memoryContext
       → AsideContext.inheritedContext.memoryRouting
       → observations + governance loop
```

## Observation extractors

| Function | Source data |
|----------|-------------|
| `extractGovernanceObservations` | `InferenceCycleResult` — votes, corpus summary |
| `extractOrchestrationObservations` | `OrchestrationResult` — tasks completed/failed |
| `extractComplexityObservations` | `ComplexityAnalysis` — per-agent scores |

## API summary

```typescript
// Spawn
const result = await spawnAside({
  description: string;
  sessionId?: string;
  parentAsideId?: string;       // nested asides: parent.aside-N
  inheritedContext?: Record<string, unknown>;  // Repertoire memoryRouting
  priorVerdictContext?: Record<string, unknown>;
});

// Lifecycle
closeAside(asideId);
closeAllAsides();
getActiveAsideCount();
getActiveAsideIds();
addObservations(asideId, observations);
```

## Plugin module split (v3.1.1 / v3.2.0)

AsideContext restoration shipped with the plugin codex-injection split into modules — orchestrator MCP handlers now import aside-context directly rather than monolithic plugin paths.

## Testing

```bash
npm test -- src/__tests__/unit/mcps/orchestrator/aside-context.test.ts
```

Covers: spawn/close lifecycle, nested aside IDs, `priorVerdictContext` → `governanceDecision` observation, governance/orchestration/complexity extractors.

## Related

- [Repertoire Integration](./repertoire.md) — `buildInheritedContext` feeds AsideContext
- [Memory Routing](./memory-routing.md) — provider contract
- [Features Since 3.1](./features-since-3.1.md)
- [Platform Integrations](./integrations.md) — orchestrator MCP server