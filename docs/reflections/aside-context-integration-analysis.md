# AsideContext Integration Analysis

Restored `src/mcps/orchestrator/aside-context.ts` from commit `2c0fbfc2^1` (deleted as dead code). Module compiles cleanly, import path `../../core/framework-logger.js` correct.

## Current State

- 160 lines, 5 exports: `spawnAside`, `closeAside`, `closeAllAsides`, `getActiveAsideCount`, `getActiveAsideIds`
- 3 types: `AsideContextOptions`, `AsideObservation`, `AsideResult`
- 1 internal interface: `ActiveAside`
- **Zero consumers** in the codebase — no file imports any aside-context symbol

## Dead Keys Cleaned

Removed 3 dead keys from `extractObservations` that nothing in the codebase ever sets:
- `reclamationPressureSummary`
- `codexBoostActive`
- `perProcPreferredForTheseFlows`

Only `decision` (governanceDecision) kept — the only key that could realistically be populated by upstream callers.

## Integration Points

### Server (`server.ts`)
6 tool handlers, all candidates for aside wiring:
1. `orchestrate-task` (~L169): prime candidate — dispatches sub-tasks via MCP skills
2. `govern-and-apply` (~L219): governance deliberation per proposal
3. `analyze-complexity` (~L267): per-agent complexity deep-dives
4. `cancel-orchestration` (~L283): should call `closeAllAsides()` for that session
5. `get-orchestration-status` (~L293): could report active aside counts
6. `optimize-orchestration` (~L325): analyze aside patterns

### Handlers
- **`task-handler.ts`** (lines 138-160): MCP skill dispatch — prime wiring point for `spawnAside`
- **`status-handler.ts`**: already has `bottlenecks`/`recommendations` — aside metrics slot in naturally
- **`complexity-handler.ts`** (lines 139-190): parallel processing block — aside candidate per agent analysis

### Lifecycle
- `server.ts` has `cleanup()` method — should call `closeAllAsides()`

## Export Gap

No barrel export (`src/mcps/orchestrator/index.ts` doesn't exist). `src/mcps/index.ts` is MCP server manifest but doesn't re-export orchestration internals.

## Tests

Existing test file: `src/__tests__/unit/orchestrator.test.ts` — tests `KernelOrchestrator` (core), not MCP orchestrator. No aside-context tests exist.

## Recommendation

1. Keep module restored but unwired until architect's Phase 3 integration plan lands
2. When wiring: create `src/mcps/orchestrator/index.ts` barrel, add `AsideContextOptions` to `types.ts`, wire `spawnAside` into `task-handler.ts` MCP skill calls
3. Add `src/__tests__/unit/orchestrator-aside-context.test.ts`
