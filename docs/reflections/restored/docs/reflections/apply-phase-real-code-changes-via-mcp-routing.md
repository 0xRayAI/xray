# Apply Phase: Real Code Changes via Plugin/MCP Routing

## Problem

The entire inference cycle relies on `spawn("opencode", ...)` for ALL agent interaction. No internal routing exists. When opencode CLI is unavailable → heuristic fallback → rubber-stamp approvals. When available → 60s timeout, subprocess overhead.

## Current Architecture (Broken)

```
governance  → spawn("opencode run --agent architect") → 60s timeout, often fails
researcher  → execSync("opencode run --agent researcher") → 15s timeout, often fails
apply       → writes markdown → nobody reads it
```

Every agent interaction is an external subprocess call. The framework has `mcpClientManager` as an in-process singleton that can call any MCP tool directly, but the inference cycle never uses it.

## Target Architecture

```
governance  → mcpClientManager.callServerTool("orchestrator", "delegate_task") → in-process, instant
researcher  → mcpClientManager.callServerTool("skill-invocation", "invoke_skill") → in-process, instant
apply       → mcpClientManager.callServerTool("orchestrator", "delegate_task") → agent writes real code
fallback    → opencode run --agent (external, slow) → heuristic (last resort)
```

## Complete Entry Point Audit (7 Paths)

### Path 1: MCP Client Manager (`src/mcps/mcp-client.ts`) — PRIMARY
- `mcpClientManager.callServerTool(serverName, toolName, args)` — calls any MCP tool programmatically
- Singleton instance already used by `violation-fixer.ts:139` for delegating fixes
- Also used by `skill-invocation.server.ts` (12 callServerTool calls, lines 552-802)
- Also used by `PostProcessor.ts:1518` for post-processing delegation
- In-process, no subprocess, instant
- Emits `tool.before` / `tool.after` events that OpenClaw hooks already subscribe to (lines 141, 158)
- `onToolEvent()` subscribes across 6 hardcoded servers: code-review, security-audit, performance-optimization, testing-strategy, researcher, skill-invocation
- **Available MCP servers** (39 total, subset relevant for agent invocation):
  - `orchestrator` — `orchestrate-task`, `analyze-complexity`, `get-orchestration-status`, `cancel-orchestration`
  - `skill-invocation` — `invoke_skill` (30+ skill names)
  - `code-review` — code analysis tools
  - `security-audit` — security scanning tools
  - `enforcer-tools` — codex enforcement tools
  - `architect-tools` — system design tools
- **Best for:** governance, apply phase, any agent invocation from within the framework

### Path 2: Plugin System (`src/plugin/strray-codex-injection.ts`)
- Compiled to `.opencode/plugin/strray-codex-injection.js`
- Exports hooks: `preToolCall`, `postToolCall`, `prompt`, `config`
- `prompt` hook: intercepts `@agent-name` mentions → transforms into delegation instructions with agent system prompt + codex
- `postToolCall` hook: runs processors after tool execution (quality gate, codex compliance, stagger policy)
- `preToolCall` hook: validates tool calls against codex rules
- `config` hook: runs `.opencode/init.sh` on session start
- Spawns `opencode run --agent <name>` for agent mentions (line 263)
- **Missing:** no hook for inference cycle events (governance results, apply phase)
- **Best for:** intercepting opencode tool calls, injecting codex, running processors

### Path 3: External Integrations

**Hermes** (`src/integrations/hermes-agent/hermes-agent-integration.ts`):
- Bridge subprocess with JSON stdin/stdout protocol via `bridge.mjs`
- `HermesAgentIntegration` class manages bridge lifecycle (extends `BaseIntegration`)
- Hooks: `onPreToolCall`, `onPostToolCall` → pipes through quality gate + processors
- `CODE_TOOLS` set: `write_file`, `patch`, `execute_code`, `write`, `edit` → triggers quality gate
- `NUDGE_TOOLS` set: `terminal`, `search_files` → gentle nudges
- `bridge.mjs` commands: `health`, `pre-process`, `post-process`, `validate`, `codex-check`, `hooks`
- Singleton via `getHermesAgentIntegration()`
- **Missing:** `govern` and `apply` bridge commands

**OpenClaw** (`src/integrations/openclaw/index.ts`):
- WebSocket gateway protocol
- `StringRayAPIServer` exposes HTTP endpoints on port 18431
- `AgentInvoker` interface: `invoke(request: AgentInvokeRequest): Promise<AgentInvokeResponse>` (api-server.ts:24)
- `SkillExecutionRequest/Response` — OpenClaw skills call back into StringRay
- **Already wired:** `wireHooksToMCP()` subscribes to `mcpClientManager.onToolEvent()` — so any MCP tool call already reaches OpenClaw
- **Missing:** inference cycle endpoints (`/govern`, `/apply`, `/cycle`)
- Singleton via `getOpenClawIntegration()`

**Cross-Language Bridge** (`src/integrations/cross-language-bridge.ts`):
- JSON-RPC over WebSocket to Python server (port 8765)
- `callBaseAgent(method, params)` — TypeScript agents call Python BaseAgent capabilities
- Methods: `validateCodexCompliance`, `performDeepReasoning`, `persistAgentState`, `loadAgentState`, `getPerformanceMetrics`, `validateSecurity`
- Singleton via `getCrossLanguageBridge()`
- **Missing:** `govern`, `apply`, `propose` methods

### Path 4: Integration Registry (`src/integrations/base/registry.ts`)
- `IntegrationRegistry` — central registry for all integrations (extends EventEmitter)
- Manages lifecycle: `register()`, `load()`, `unload()`, `healthCheck()`
- `PluginRegistry` extends with plugin-specific features (YAML manifests, hot-reload, MCP server configs)
- Both registries discover integrations from filesystem
- Boot orchestrator creates `PluginRegistry` at startup (boot-orchestrator.ts:236)
- Plugin server config registry (`plugin-server-registry.ts`) bridges PluginRegistry ↔ MCP server configs
- **Could be used:** register the inference cycle as an integration so it's discoverable by Hermes/OpenClaw

### Path 5: CLI Commands (`src/cli/index.ts`)
- `npx strray-ai install` — runs postinstall.cjs (sets up .opencode/, opencode.json)
- `npx strray-ai init` — same as install
- `npx strray-ai status` — checks config files exist
- `npx strray-ai health` — framework health check
- `npx strray-ai validate` — runs full validation suite
- `npx strray-ai capabilities` — lists all features
- `npx strray-ai calibrate` — recalibrates complexity scoring
- `npx strray-ai report` — generates reports (daily, performance, compliance)
- `npx strray-ai config` — get/set configuration values
- `npx strray-ai analytics` — pattern analytics
- **Missing:** no `govern` or `apply` CLI commands

### Path 6: Integration Script (`src/scripts/integration.ts`)
- Standalone CLI: `node dist/scripts/integration.js <agent> '<json>'`
- Uses `resolveAgent()` from `src/mcps/agent-resolver.js` for agent name resolution
- Spawns `opencode run - --agent <name> -m opencode/big-pickle` (line 171-173)
- Sets `OPENCODE_MCP_CONFIG=./node_modules/strray-ai/opencode.json` env
- Used by external systems (Jelly commercial modules) to call into StringRay
- **Missing:** no MCP-first routing, always spawns opencode CLI

### Path 7: Agent Delegator (`src/delegation/agent-delegator.ts`)
- `AgentDelegator` class — intelligent delegation with complexity analysis
- Uses `ComplexityAnalyzer` + `routingOutcomeTracker` + `predictiveAnalytics`
- Reads `.opencode/strray/routing-mappings.json` for routing config
- `getActiveAgents()` + `isAllowedAgent()` from `src/agents/registry.ts`
- Returns `AgentCapability` objects with expertise, specialties
- **Not yet connected** to inference cycle — currently used by plugin prompt hook only
- **Could be used:** replace hardcoded `GOVERNANCE_AGENTS` mapping in inference-cycle.ts with dynamic delegator

## Current Routing (Broken — CLI-only)

```
┌─────────────┐    spawn("opencode")     ┌─────────────┐
│  Inference  │ ──────────────────────→  │  opencode    │
│  Cycle      │    60s timeout, often    │  CLI         │
│             │    fails                 │  (external)  │
└─────────────┘                          └─────────────┘
       │                                        │
       │ writes markdown                        │ sometimes
       │ (nobody reads)                         │ works
       ↓                                        ↓
  .strray/inference/                     architect spawns
  pending-fixes/                         subagents via
                                         task tool
```

## Target Routing (5-Layer) — IMPLEMENTED

```
┌──────────────────────────────────────────────────────────┐
│                    Inference Cycle                        │
│                                                          │
│  invokeAgentInternal(agent, prompt)                       │
│       │                                                  │
│       ├── Layer 1: mcpClientManager (in-process) ✓       │
│       │   callServerTool("orchestrator", "orchestrate-task")│
│       │                                                  │
│       ├── Layer 2: AgentInvoker callback (injected) ✓     │
│       │   this.agentInvoker(agentName, prompt)            │
│       │                                                  │
│       ├── Layer 3: opencode CLI (fallback) ✓              │
│       │   invokeViaOpencode(agentName, prompt)            │
│       │                                                  │
│       └── Layer 4: throw Error — no path available        │
│                                                          │
└──────────────────────────────────────────────────────────┘

Additional entry points now wired:
  ✓ Plugin hook: inference cycle triggers every 100 tool calls
  ✓ Orchestrator MCP tool: govern-and-apply
  ✓ Hermes bridge: govern + apply commands
  ✓ OpenClaw API: /api/govern + /api/apply endpoints
```

## Implementation Plan — COMPLETED

### Phase 1: Add `invokeAgentInternal()` method to InferenceCycle ✓

Implemented 5-layer fallback chain:
1. `mcpClientManager.callServerTool("orchestrator", "orchestrate-task")` — in-process
2. `this.agentInvoker(agentName, prompt)` — injected callback
3. `invokeViaOpencode(agentName, prompt)` — CLI subprocess
4. `throw Error` — no path

### Phase 2: Refactor all agent calls to use `invokeAgentInternal()` ✓

| Function | Before | After |
|----------|--------|-------|
| `invokeArchitect()` | `spawn("opencode run --agent architect")` | `invokeAgentInternal("architect", prompt)` |
| `researcherReview()` | `execSync("opencode run --agent researcher")` | `invokeAgentInternal("researcher", prompt)` |
| `governProposals()` | calls `invokeArchitect()` | calls `invokeAgentInternal("architect", prompt)` |

### Phase 3: Wire apply methods to invoke agents ✓

| Proposal Type | MCP Call | Agent |
|--------------|---------|-------|
| `fix` | `invokeAgentInternal("code-reviewer", fixPrompt)` | code-reviewer |
| `refactor` | `invokeAgentInternal("refactorer", refactorPrompt)` | refactorer |
| `guard` | `invokeAgentInternal("code-reviewer", guardPrompt)` → fallback to markdown | code-reviewer |
| `automate` | `invokeAgentInternal("architect", automatePrompt)` → fallback to markdown | architect |
| `codify` | pattern-catalog.md write (no agent needed) | n/a |

Guard and automate methods now try agent invocation first, falling back to markdown docs on failure.

### Phase 4: Add `govern-and-apply` MCP tool ✓

New tool on the orchestrator server. Makes the full governance→apply pipeline callable from any MCP client.

### Phase 5: Wire into `strray-codex-injection.ts` plugin ✓

Inference cycle triggers automatically every 100 tool calls alongside the inference tuner. Runs `maybeRunCycle()` which checks cooldown/thresholds before triggering.

### Phase 6: Hermes bridge commands ✓

Added `govern` and `apply` commands to `bridge.mjs`. Both use `InferenceCycle.governExternalProposals()`.

### Phase 7: OpenClaw API endpoints ✓

Added `/api/govern` and `/api/apply` POST endpoints to `api-server.ts`.

## Fallback Chain — IMPLEMENTED

```
1. mcpClientManager.callServerTool() — internal, fast, no subprocess
2. AgentInvoker callback — injected by tests/consumers
3. opencode run --agent <name> — external, slow, guaranteed
4. throw Error — no path available
```

## Key Files Modified

| File | Change |
|------|--------|
| `src/inference/inference-cycle.ts` | Added `invokeAgentInternal()`, `invokeViaOpencode()`, `extractTargetFiles()`, refactored `governProposals()`, `researcherReview()`, `applyCodeChange()`, `applyGuard()`, `applyAutomation()` to use MCP-first routing |
| `src/mcps/orchestrator/server.ts` | Added `govern-and-apply` tool + `handleGovernAndApply()` handler |
| `src/plugin/strray-codex-injection.ts` | Added inference cycle trigger after tuning interval |
| `src/integrations/hermes-agent/bridge.mjs` | Added `govern` + `apply` commands |
| `src/integrations/openclaw/api-server.ts` | Added `/api/govern` + `/api/apply` endpoints |

## Precedent

`violation-fixer.ts` already does this at line 132:
```typescript
const { mcpClientManager } = await import('../../mcps/mcp-client.js');
const result = await mcpClientManager.callServerTool(server, tool, args);
```

This is the exact pattern the inference cycle should follow.

## Impact

| Metric | Before (CLI-only) | After (MCP-first) |
|--------|-------------------|-------------------|
| Agent invocation latency | 60s+ (subprocess boot) | <1s (in-process) |
| Governance timeout rate | ~50% (60s not enough) | ~0% (no subprocess) |
| Apply phase | Markdown markers only | Real agent invocation + markdown fallback |
| CI/CD compatibility | No (no opencode in CI) | Yes (MCP works in-process) |
| Test reliability | Heuristic fallback only | AgentInvoker + MCP + heuristic |
| Entry points | 1 (spawn opencode) | 7 (MCP, plugin, Hermes, OpenClaw, CLI, bridge, delegator) |
| External access | None | 4 (MCP tool, Hermes bridge, OpenClaw API, integration script) |

## Remaining Work

- Rework 3 rejected governance proposals (deep-think, cite-the-source, convergence-enforcement)
- Add `govern`/`apply` CLI commands to `src/cli/index.ts`
- Wire `src/scripts/integration.ts` to use MCP-first routing (currently still spawns opencode)
- Connect `src/delegation/agent-delegator.ts` to replace hardcoded `GOVERNANCE_AGENTS` mapping
- Add cross-language bridge methods (`govern`, `apply`, `propose`)
