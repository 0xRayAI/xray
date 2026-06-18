# Repertoire Integration (v3.3+)

[Repertoire](https://github.com/0xRayAI/repertoire) (`@0xray/repertoire`) is the default **memory routing provider** for the 0xRay framework repo. It ingests enriched Groover inference logs, maintains `curated_signals.json`, and enriches orchestrator routing through the `MemoryRoutingProvider` contract.

## When to use Repertoire

| Scenario | Surface |
|----------|---------|
| 0xRay orchestrator in-process (ExecutionPlanner, thinDispatch) | `features.json` → `memory_routing` |
| External LLM host (Hermes, Grok, OpenCode MCP) | `repertoire-mcp` stdio server |
| Ad-hoc signal queries / ingest pipeline | Repertoire CLI (`npm run query`, `pipeline`) |

## Setup (framework monorepo)

```bash
# Sibling layout (default in 0xRay repo)
git clone https://github.com/0xRayAI/repertoire ../repertoire
cd ../repertoire && npm install && npm run build

# 0xRay xray/features.json already ships:
```

```json
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
```

Consumer projects without Repertoire checked out:

```json
"memory_routing": { "enabled": false, "provider": "null" }
```

## `features.json` fields (`memory_routing`)

Validated by `xray/features.schema.json` at load time:

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `enabled` | yes | `true` / `false` | Master switch |
| `provider` | yes | `null`, `repertoire`, `custom` | Provider kind |
| `module_path` | when enabled + repertoire/custom | path string | ESM module exporting `createMemoryRoutingProvider()` |
| `config` | optional | object | Passed to provider factory |

### Repertoire `config` keys

| Key | Default | Description |
|-----|---------|-------------|
| `dataDir` | `../repertoire/data` | Registry + inference state root |
| `signalsPath` | `data/curated_signals.json` | Primitive registry file |
| `statePath` | `data/inference-state.json` | Idempotent ingest cursor |
| `logDir` | `logs/groover-inference` | Enriched JSONL log directory |

Paths resolve relative to the 0xRay package root unless absolute.

## What Repertoire enriches in 0xRay

### ExecutionPlanner (v3.3.1 confidence gate)

When `getTaskConfidence()` is available on the provider:

- `calculateTaskComplexity()` adds `complexityBoost` from matched signals
- Trap tasks (`ontological-trap`, high-confidence primitives) get higher complexity scores
- `selectAgent()` receives trap hints via `TYPE: ontological-trap` in operation text
- `enrichTasks()` attaches `memorySignals`, `memorySignalConfidences`, `memoryComplexityBoost` to task metadata

### thinDispatch

- `resolveThinDispatch()` may override tier-default agent (e.g. → `architect` when `highConfidenceTrapPresent` and score ≥ 26)
- `provenance-failure` tag can route to `bug-triage-specialist`

### Researcher (`analyze_proposal`)

Module: `src/mcps/researcher-confidence.ts`

- Triggers on trap language or high-confidence primitive matches
- Calls `getTaskConfidence()` via `MemoryRoutingProvider`
- Appends auditable `MEMORY_ROUTING:` block to governance output

### Feedback loop

Per-task `ingestFeedback()` (v3.3 — not aggregate-only) records orchestrator outcomes back to Repertoire.

## MemoryRoutingProvider contract

Custom providers export `createMemoryRoutingProvider(config)` implementing:

| Method | Pipeline stage |
|--------|----------------|
| `buildRoutingContext(operation)` | Signal/tag matching |
| `enhanceAgentCapabilities(map)` | Agent capability enrichment |
| `enrichTasks(tasks)` | Pre-planning metadata |
| `buildInheritedContext(tasks)` | AsideContext / plan metadata |
| `selectAgent(...)` | ExecutionPlanner assignment |
| `resolveThinDispatch(...)` | thinDispatch score + override |
| `getTaskConfidence?(task)` | Confidence gate (v3.3.1) |
| `ingestFeedback?(entry)` | Per-task learning loop |

See `src/memory-routing/types.ts` and Repertoire's `docs/MEMORY-ROUTING-PROVIDER.md`.

## Repertoire MCP server (external hosts)

Add alongside 0xRay's 7 MCP servers in `.mcp.json`:

```json
"repertoire": {
  "command": "npx",
  "args": ["-y", "@0xray/repertoire", "mcp"]
}
```

Or after local build:

```json
"repertoire": {
  "command": "node",
  "args": ["../repertoire/dist/mcp/server.js"],
  "env": {
    "REPERTOIRE_DATA_DIR": "../repertoire/data",
    "CURATED_SIGNALS_PATH": "../repertoire/data/curated_signals.json"
  }
}
```

### MCP tools

| Tool | Purpose |
|------|---------|
| `repertoire__get_high_confidence_signals` | List signals above threshold |
| `repertoire__get_task_confidence` | Full confidence context for a task |
| `repertoire__search_primitives` | Text search against registry |
| `repertoire__ingest_feedback` | Record orchestrator outcome |

Hermes/OpenCode agents should call `repertoire__get_task_confidence` directly; in-process orchestrator code uses `getMemoryRoutingProviderSync()`.

## Repertoire CLI

```bash
cd repertoire
npm run ingest -- --source /path/to/groover/logs
npm run pipeline          # ingest + meta-inference
npm run query             # ad-hoc confidence query
npm run test:e2e          # enriched loop regression
npm run test:mcp          # stdio MCP smoke
```

## Data model (summary)

| Artifact | Role |
|----------|------|
| `data/curated_signals.json` | Primitive registry with `observation_stats` |
| `data/inference-state.json` | Ingest idempotency cursor |
| `logs/groover-inference/*.jsonl` | Enriched entries (strict enriched-only ingest) |

Confidence values come from `observation_stats` or explicit task metadata — no text-score fallbacks.

## Testing

0xRay framework repo:

```bash
npm test -- src/__tests__/unit/memory-routing-integration.test.ts
npm test -- src/__tests__/unit/memory-routing-provider.test.ts
npm test -- src/__tests__/unit/researcher-confidence.test.ts
npm test -- src/__tests__/unit/researcher-repertoire-wiring.test.ts
```

## Related

- [Memory Routing](./memory-routing.md) — provider plug-in model
- [Features Since 3.1](./features-since-3.1.md) — full changelog of capabilities
- [features.json Reference](./features-json.md)
- [Platform Integrations](./integrations.md)