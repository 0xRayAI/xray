# Apply Phase: Real Code Changes via Plugin/MCP Routing

## Problem

`applyProposal()` writes markdown markers instead of real code. No agent is invoked to make changes. The governance system approves proposals but nothing acts on them.

## Current Architecture

```
governance approves → applyProposal() → writes .md/.json marker → nothing reads it
```

## Target Architecture

```
governance approves → applyProposal() → calls MCP skill tool → agent writes code → deploy verify
```

## Available Internal Routing

### 1. MCP Client Manager (`src/mcps/mcp-client.ts`)
- `mcpClientManager.callServerTool(serverName, toolName, args)` — calls any MCP tool programmatically
- Singleton instance already used by `violation-fixer.ts` for delegating fixes
- **This is the answer.** It's already the internal routing layer.

### 2. Skill Invocation Server (`src/mcps/knowledge-skills/skill-invocation.server.ts`)
- `invoke_skill` tool — invokes any registered skill by name
- `code_review` tool — runs code review on provided code
- `security_audit` tool — audits files
- **Gateway to all 30+ skills from within the framework.**

### 3. Orchestrator Server (`src/mcps/orchestrator/server.ts`)
- `orchestrate_task` tool — coordinates multi-agent tasks
- `delegate_task` tool — delegates to specific agent by type
- **Can spawn the right agent for each proposal type.**

### 4. Hermes Bridge (`src/integrations/hermes-agent/bridge.mjs`)
- `codex-check` command — runs codex validation
- `validate` command — runs file validation
- `post-process` command — runs post-processors
- **CLI bridge for Python/external invocation.**

### 5. OpenCode CLI (`opencode run --agent <name>`)
- External process — works but slow (60s+ boot)
- Already used by `invokeArchitect()` in governance
- **Fallback when MCP unavailable.**

## Implementation Plan

### Phase 1: Wire `mcpClientManager` into apply methods

Replace each `applyX()` method's markdown writing with MCP tool calls:

| Proposal Type | MCP Server | Tool | Agent |
|--------------|-----------|------|-------|
| `fix` | `orchestrator` | `delegate_task` | code-reviewer → refactorer |
| `refactor` | `orchestrator` | `delegate_task` | refactorer |
| `guard` | `skill-invocation` | `invoke_skill` | code-review (add codex term) |
| `automate` | `orchestrator` | `orchestrate_task` | architect |
| `codify` | (keep as-is) | pattern-catalog.md write | n/a |

### Phase 2: Add `govern-and-apply` MCP tool

New tool on the orchestrator server:

```typescript
{
  name: "govern_and_apply",
  description: "Govern proposals then apply approved ones via agent delegation",
  inputSchema: {
    proposals: InferenceProposal[],
    skipApply: boolean,
  }
}
```

This makes the full governance→apply pipeline callable from any MCP client (opencode, hermes, external).

### Phase 3: Wire into `strray-codex-injection.ts` plugin

The plugin already hooks into opencode lifecycle events. Add a `post-command` hook that:
1. Checks if governance cycle was triggered
2. If proposals were approved, calls `govern_and_apply` tool
3. Returns the applied changes to the opencode session

### Phase 4: Fallback chain

```
1. mcpClientManager.callServerTool() — internal, fast, no subprocess
2. opencode run --agent <name> — external, slow, guaranteed
3. Write pending-fixes/ JSON — last resort when neither available
```

## Key Files to Modify

| File | Change |
|------|--------|
| `src/inference/inference-cycle.ts` | Replace `applyX()` markdown writes with `mcpClientManager.callServerTool()` calls |
| `src/mcps/orchestrator/server.ts` | Add `govern_and_apply` tool |
| `src/mcps/orchestrator/handlers/task-handler.ts` | Add handler for govern-and-apply |
| `src/plugin/strray-codex-injection.ts` | Add post-command hook for apply phase |

## Why Not Just Use `opencode run`?

The governance already uses `opencode run --agent architect` via `invokeArchitect()`. But this spawns a full opencode process (60s+). MCP tool calls are in-process — same Node runtime, no boot time. The framework already has `mcpClientManager` as a singleton. We just need to use it.

## Precedent

`violation-fixer.ts` already does this at line 132:
```typescript
const { mcpClientManager } = await import('../../mcps/mcp-client.js');
const result = await mcpClientManager.callServerTool(server, tool, args);
```

This is the exact pattern apply methods should follow.

## Blocked By

- None. All infrastructure exists. Just need to wire it.
