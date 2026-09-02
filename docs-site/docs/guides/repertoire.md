# Repertoire Integration (v3.3+)

[Repertoire](https://github.com/0xRayAI/repertoire) (`@0xray/repertoire`) is the default **memory routing provider** for the 0xRay framework repo. It ingests enriched Groover inference logs, maintains `curated_signals.json`, and enriches orchestrator routing through the `MemoryRoutingProvider` contract.

## When to use Repertoire

| Scenario | Surface |
|----------|---------|
| 0xRay orchestrator in-process (ExecutionPlanner, thinDispatch) | `features.json` → `memory_routing` |
| External LLM host (Hermes, Grok, OpenCode MCP) | `repertoire-mcp` stdio server |
| Ad-hoc signal queries / ingest pipeline | Repertoire CLI (`npm run query`, `pipeline`) |

## Setup

`0xray@4.0.0` vendors `@0xray/repertoire@0.2.0`. Fresh `npm install 0xray` ships `memory_routing.enabled: true`. Explicit opt-out: `enabled: false` with `provider: "repertoire"`. This is not an 8th 0xRay MCP.

Shipped `xray/features.json`:

```json
"memory_routing": {
  "enabled": true,
  "provider": "repertoire",
  "module_path": "node_modules/@0xray/repertoire/dist/provider/memory-routing-provider.js",
  "config": {
    "signalsPath": "node_modules/@0xray/repertoire/data/curated_signals.json",
    "statePath": ".xray/state/repertoire/inference-state.json",
    "feedbackDir": ".xray/state/repertoire/feedback"
  }
}
```

Optional sibling (framework monorepo only):

```bash
git clone https://github.com/0xRayAI/repertoire ../repertoire
cd ../repertoire && npm install && npm run build
```

Grok session-start writes a one-line `repertoireResume` into `.xray/state/session-boot.json` (signal count when the registry is readable). Leftover default-off also **resolves at runtime** in `loadMemoryRoutingProvider` / `getMemoryRoutingConfig` when the module is on disk — ExecutionPlanner and thinDispatch then use Repertoire without a features rewrite. Station heat persists **working state** (not Bedrock primitives) to `.xray/state/repertoire-working.json` and a `Working:` line on `STATION.md`. Compact may `ingestFeedback` for non-Bedrock matches. Explicit opt-out remains `enabled: false` + `provider: "repertoire"`.

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
| `dataDir` | package `data/` (vendored 0.2) | Registry + inference state root |
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
| `buildInheritedContext(tasks)` | → `ExecutionPlan.memoryContext` → [AsideContext](./aside-context.md) `inheritedContext.memoryRouting` |
| `selectAgent(...)` | ExecutionPlanner assignment |
| `resolveThinDispatch(...)` | thinDispatch score + override |
| `getTaskConfidence?(task)` | Confidence gate (v3.3.1) |
| `ingestFeedback?(entry)` | Per-task learning loop |

See `src/memory-routing/types.ts` and Repertoire's `docs/MEMORY-ROUTING-PROVIDER.md`.

## Repertoire MCP server (external hosts)

Not an 8th 0xRay server. Wear adds a `repertoire` extra when the module resolves (Hermes / OpenCode / OpenClaw / project `.mcp.json` / Grok `.grok/config.toml`).

Server tools are **unprefixed** so Grok TUI can register them (`server__tool` → `repertoire__get_task_confidence`). Hermes/OpenCode see the unprefixed names.

```json
"repertoire": {
  "command": "node",
  "args": ["node_modules/@0xray/repertoire/dist/mcp/server.js"]
}
```

In-repo launcher (cwd-proof): `scripts/mjs/run-repertoire-mcp.mjs`.

### MCP tools

| Server name | Grok TUI name | Purpose |
|-------------|---------------|---------|
| `get_high_confidence_signals` | `repertoire__get_high_confidence_signals` | List signals above threshold |
| `get_task_confidence` | `repertoire__get_task_confidence` | Full confidence context for a task |
| `search_primitives` | `repertoire__search_primitives` | Text search against registry |
| `ingest_feedback` | `repertoire__ingest_feedback` | Record orchestrator outcome |

In-process orchestrator code uses `getMemoryRoutingProviderSync()`.

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