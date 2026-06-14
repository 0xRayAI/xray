# Hermes Bridge Remediation Plan

**Date:** 2026-06-14
**Scope:** Eliminate the `bridge.mjs` Node.js subprocess from Hermes Agent integration, replacing it with in-process enforcement gate (TypeScript side) and CLI / MCP calls (Python side).

---

## 1. Assessment — Every Bridge Call Site

### 1.1 Python Plugin Hooks (`__init__.py`)

| # | Call Site | Line | Bridge Command | Payload | Fallback? |
|---|---|---|---|---|---|
| 1 | `_on_pre_tool_call` | 243 | `pre-process` | `{tool, args}` | None — blocks if bridge errors |
| 2 | `_on_post_tool_call` | 354 | `post-process` | `{tool, args, result, error}` | None — degrades silently |
| 3 | `_xray_command("status")` | 453 | `health` | `{}` | Static string if bridge fails |
| 4 | `_validate_subagent_changes` | 632 | `validate` | `{files, operation}` | None — skips validation |

### 1.2 Python Plugin Tools (`tools.py`)

| # | Call Site | Line | Bridge Command | Payload | Fallback |
|---|---|---|---|---|---|
| 5 | `xray_validate` | 90 | `validate` | `{files, operation}` | `npx 0xray validate` |
| 6 | `xray_codex_check` (with code) | 134 | `codex-check` | `{code, focusAreas}` | Static analysis note |
| 7 | `xray_codex_check` (no code) | 163 | `health` | `{}` | `npx 0xray health` |
| 8 | `xray_health` | 193 | `health` | `{}` | `npx 0xray health` |
| 9 | `xray_hooks` | 222 | `hooks` | `{action, hooks}` | Direct file ops in Python |

### 1.3 TypeScript Integration (`hermes-agent-integration.ts`)

| # | Call Site | Line | Bridge Command | Payload | Enforcement Gate? |
|---|---|---|---|---|---|
| 10 | `onPreToolCall` | 340 | `pre-process` | `{tool, args}` | **Redundant** — `beforeToolHook` called at line 331 |
| 11 | `onPostToolCall` | 415 | `post-process` | `{tool, args, result, error}` | **Redundant** — `afterToolHook` called at line 429 |
| 12 | `validate` | 453 | `validate` | `{files, operation}` | No gate equivalent |
| 13 | `codexCheck` (with code) | 478 | `codex-check` | `{code, focusAreas}` | No gate equivalent |
| 14 | `checkBridgeHealth` | 265 | `health` | `{}` | No gate equivalent |
| 15 | `getBridgeStats` | 589 | `stats` | `{}` | No gate equivalent |

### 1.4 Bridge Capabilities (`bridge.mjs`)

| Command | What Bridge Does | Lines |
|---|---|---|
| `health` | Lazy-loads framework, reports components | 364-391 |
| `pre-process` | `runQualityGateCheck` + `runProcessors(phase="pre")` | 393-427 |
| `post-process` | `runProcessors(phase="post")` | 429-458 |
| `validate` | Quality gate on each file | 460-481 |
| `codex-check` | Quality gate + `ValidatorRegistry.getAllValidators()` | 483-558 |
| `stats` | Returns boolean flags for loaded modules | 690-698 |
| `hooks` | Install/uninstall/list git hooks (symlinks) | 560-688 |
| `govern` | Loads `InferenceCycle`, runs `governExternalProposals` | 700-719 |
| `apply` | Loads `InferenceCycle`, runs `governExternalProposals` with apply | 721-739 |

---

## 2. Path Recommendation

### Recommendation: **Hybrid (customized)** — TypeScript drops bridge entirely; Python uses CLI + MCP.

**Why not pure A (in-process enforcement gate):**
- The Python plugin cannot import TypeScript modules in-process. Hermes runs plugins in `cpython`, so `enforcement-gate.ts` is unreachable from `__init__.py`.
- The TypeScript side (`hermes-agent-integration.ts`) already calls `beforeToolHook`/`afterToolHook` — bridge calls here are truly redundant.

**Why not pure B (MCP-native):**
- MCP tool calls require an MCP server round-trip and async orchestration. Synchronous hooks (pre/post tool call) need a blocking call, which MCP does not offer from Python plugin code.
- MCP auto-discovery (`mcp_<server>_<tool>`) is excellent for LLM-facing tools but not for internal hook invocations.

**Why not pure C (keep bridge for complex ops):**
- The bridge duplicates framework loading logic already present in `enforcement-gate.ts`.
- All bridge operations map 1:1 to existing MCP tools or CLI commands. Keeping it for "complex" ops is unnecessary maintenance burden.

### Decision Table

| Surface | Current | Target | Rationale |
|---|---|---|---|
| TS hooks `onPreToolCall` | bridge + enforcement-gate | **enforcement-gate only** | Bridge call is redundant |
| TS hooks `onPostToolCall` | bridge + enforcement-gate | **enforcement-gate only** | Bridge call is redundant |
| TS `validate()` | bridge | **`mcpClientManager.callServerTool("enforcer", "run-pre-commit-validation")`** | MCP is the canonical tool path |
| TS `codexCheck()` | bridge | **`mcpClientManager.callServerTool("enforcer", "codex-enforcement")`** | MCP codex-enforcement tool |
| TS `health()` | bridge | **`mcpClientManager.callServerTool("enforcer", "get-enforcement-status")`** | MCP status tool |
| TS `getBridgeStats()` | bridge | **Remove** (stats in `HermesAgentStatistics`) | Dead code |
| Python hooks `__init__.py` | bridge | **`npx 0xray enforce`** (new CLI command) | Subprocess needed; use canonical CLI |
| Python tools `tools.py` | bridge → CLI fallback | **CLI primary, bridge removed** | CLI is already the fallback; make it primary |
| Python hooks tool calls | bridge | **Hermes MCP servers** (`.mcp.json` config) | LLM-facing tools discovered automatically |
| `bridge.mjs` | active | **Deprecated with warning, removed in v2.3** | All functionality replaced |

---

## 3. Migration Steps — File-by-File

### Step 1: Create `npx 0xray enforce` CLI command

**File: `src/cli/index.ts`** — Add new command block after `health` (~line 323):

```
.command("enforce")
.description("Run enforcement gate (pre/post/validate) — designed for Hermes Python plugin hooks")
.option("--phase <phase>", "Pipeline phase: pre, post, validate, codex-check, health")
.option("--tool <tool>", "Tool name (for pre/post)")
.option("--args <json>", "Tool arguments as JSON")
.option("--result <json>", "Tool result as JSON (for post)")
.option("--error <string>", "Error string (for post)")
.option("--files <json>", "File paths as JSON array (for validate)")
.option("--code <string>", "Code string (for codex-check)")
.option("--focus-areas <json>", "Focus areas as JSON array (for codex-check)")
.action(async (options) => {
  const { enforceCommand } = await import("./commands/enforce.js");
  await enforceCommand(options);
});
```

**File: `src/cli/commands/enforce.ts`** (new) — Wraps `beforeToolHook`/`afterToolHook`/MCP client calls:

```typescript
import { beforeToolHook, afterToolHook } from "../../integrations/enforcement-gate.js";
import { mcpClientManager } from "../../mcps/mcp-client.js";

interface EnforceOptions {
  phase: string;
  tool?: string;
  args?: string;   // JSON
  result?: string; // JSON
  error?: string;
  files?: string;  // JSON
  code?: string;
  focusAreas?: string; // JSON
}

export async function enforceCommand(options: EnforceOptions) {
  const phase = options.phase || "health";
  let parsedArgs: Record<string, unknown> | null = null;
  if (options.args) try { parsedArgs = JSON.parse(options.args); } catch {}

  switch (phase) {
    case "pre": {
      const result = await beforeToolHook(options.tool || "unknown", parsedArgs);
      process.stdout.write(JSON.stringify(result));
      break;
    }
    case "post": {
      let parsedResult: unknown = null;
      if (options.result) try { parsedResult = JSON.parse(options.result); } catch {}
      const result = await afterToolHook(options.tool || "unknown", parsedArgs, parsedResult, options.error || null);
      process.stdout.write(JSON.stringify(result));
      break;
    }
    case "validate": {
      let files: string[] = [];
      if (options.files) try { files = JSON.parse(options.files); } catch {}
      const result = await mcpClientManager.callServerTool("enforcer", "run-pre-commit-validation", { files });
      process.stdout.write(JSON.stringify(result));
      break;
    }
    case "codex-check": {
      let focusAreas: string[] = [];
      if (options.focusAreas) try { focusAreas = JSON.parse(options.focusAreas); } catch {}
      const result = await mcpClientManager.callServerTool("enforcer", "codex-enforcement", {
        operation: "write",
        newCode: options.code || "",
        focusAreas,
      });
      process.stdout.write(JSON.stringify(result));
      break;
    }
    case "health": {
      const result = await mcpClientManager.callServerTool("enforcer", "get-enforcement-status", {});
      process.stdout.write(JSON.stringify(result));
      break;
    }
    default:
      process.stderr.write(`Unknown phase: ${phase}`);
      process.exit(1);
  }
}
```

### Step 2: Update Python Plugin Hooks (`__init__.py`)

Replace `_call_bridge()` calls with `_run_xray_enforce()`:

```python
def _run_xray_enforce(phase: str, **kwargs) -> dict:
    """Run npx 0xray enforce with phase and kwargs, return parsed dict."""
    args = ["npx", "0xray", "enforce", "--phase", phase]
    for k, v in kwargs.items():
        if v is not None:
            args.extend([f"--{k.replace('_', '-')}", json.dumps(v) if not isinstance(v, str) else v])
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            return {"error": result.stderr[:300] or "enforce failed"}
        return json.loads(result.stdout)
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        return {"error": str(e)}
```

Change the three call sites:

1. **`_on_pre_tool_call`** (line 243):
   - Replace `_call_bridge({"command": "pre-process", ...})` with:
   - `_run_xray_enforce("pre", tool=tool_name, args=args)` then adapt response format

2. **`_on_post_tool_call`** (line 354):
   - Replace `_call_bridge({"command": "post-process", ...})` with:
   - `_run_xray_enforce("post", tool=tool_name, args=args, result=result, error=error)` then adapt response format

3. **`_xray_command("status")`** (line 453):
   - Replace `_call_bridge({"command": "health"})` with:
   - `_run_xray_enforce("health")` or fallback to static string

4. **`_validate_subagent_changes`** (line 632):
   - Replace `_call_bridge({"command": "validate", ...})` with:
   - `_run_xray_enforce("validate", files=abs_files, operation="modify")` then adapt response format

### Step 3: Update Python Plugin Tools (`tools.py`)

For each tool handler, **remove the bridge `_bridge_call()` attempt** and keep only the `npx 0xray` CLI fallback (or the static/fallback logic):

1. **`xray_validate`** (line 89-115):
   - Remove lines 89-103 (bridge attempt), keep lines 105-116 (CLI fallback as primary)

2. **`xray_codex_check`** with code (line 133-159):
   - Remove lines 133-150 (bridge attempt), keep lines 151-159 (static note as primary)

3. **`xray_codex_check`** without code (line 162-183):
   - Remove lines 162-172 (bridge attempt), keep lines 174-182 (CLI fallback as primary)

4. **`xray_health`** (line 192-206):
   - Remove lines 192-203 (bridge attempt), keep lines 205-206 (CLI fallback as primary)

5. **`xray_hooks`** (line 220-235):
   - Remove lines 220-235 (bridge attempt), keep lines 237-313 (direct Python file ops as primary)
   - Bridge's hook implementation and Python's hook implementation are functionally identical

Remove `_bridge_call()` function entirely from `tools.py`.

### Step 4: Update TypeScript Integration (`hermes-agent-integration.ts`)

1. **`onPreToolCall`** (line 340):
   - Remove `sendToBridge` call (lines 340-345)
   - Keep `beforeToolHook` call (line 331) — that's the real enforcement gate

2. **`onPostToolCall`** (line 414):
   - Remove `sendToBridge` call (lines 415-422)
   - Keep `afterToolHook` call (line 429) — that's the real enforcement gate

3. **`validate`** (line 449-458):
   - Replace `sendToBridge` with:
   ```typescript
   const result = await mcpClientManager.callServerTool("enforcer", "run-pre-commit-validation", { files, operation });
   return result as BridgeValidateResponse;
   ```

4. **`codexCheck`** (line 463-483):
   - If no code: return health from MCP
   - If code: replace `sendToBridge` with:
   ```typescript
   const result = await mcpClientManager.callServerTool("enforcer", "codex-enforcement", {
     operation: "write",
     newCode: code,
     focusAreas,
   });
   return result as BridgeCodexCheckResponse;
   ```

5. **`checkBridgeHealth`** (line 255-284):
   - Replace `sendToBridge` with MCP call:
   ```typescript
   try {
     const result = await mcpClientManager.callServerTool("enforcer", "get-enforcement-status", {});
     // Map to BridgeHealthResponse shape
     return { status: "ok", framework: "loaded", ... };
   } catch {
     return { status: "error", framework: "not_loaded", ... };
   }
   ```

6. **`getBridgeStats`** (line 588-592):
   - Remove entire method; stats are already tracked in `hermesStats` property.

7. **Type cleanup**:
   - Remove `BridgeRequest`, `BridgeResponse`, and bridge-specific types from `types.ts` that are no longer needed.
   - Remove `sendToBridge`, `execFile` import, bridge path logic.
   - Remove bridge-related fields from `HermesAgentConfig` (`bridgePath`, `bridgeTimeout`).

### Step 5: Deprecate `bridge.mjs`

Add a deprecation warning at the top of `main()`:

```javascript
// DEPRECATION WARNING v2.2+
// Bridge subprocess is deprecated. The Hermes Python plugin now uses `npx 0xray enforce`
// (CLI) for hook invocations and Hermes' integrated MCP client for tool calls.
// Remove this file in v2.3.
process.stderr.write('[DEPRECATED] bridge.mjs — use npx 0xray enforce instead\n');
```

Leave the file in place for one release cycle so users on older plugin versions don't break. Remove in v2.3.

### Step 6: Register MCP Servers in Hermes Config

**File: `src/cli/commands/hermes-install.ts`** — When installing the Hermes plugin, write a `.mcp.json` next to the plugin config (same pattern as Grok's `.mcp.json`):

```json
{
  "mcpServers": {
    "xray-governance": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "governance"]
    },
    "xray-enforcer": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "enforcer"]
    },
    "xray-researcher": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "researcher"]
    },
    "xray-code-review": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "code-review"]
    }
  }
}
```

This enables Hermes' `mcp_<server>_<tool>` auto-discovery:
- `mcp_xray_enforcer_rule_validation`
- `mcp_xray_enforcer_codex_enforcement`
- `mcp_xray_enforcer_quality_gate_check`
- `mcp_xray_enforcer_get_enforcement_status`
- `mcp_xray_enforcer_run_pre_commit_validation`
- `mcp_xray_researcher_analyze_codebase`
- `mcp_xray_code_review_analyze_code_quality`

### Step 7: Clean Up `types.ts`

Remove bridge-specific types:
- `BridgeRequest`, `BridgeResponse` and all `Bridge*Response` interfaces
- `BridgeCommand` type
- `bridgePath`, `pluginInitPath`, `bridgeTimeout` from `HermesAgentConfig`
- `bridgeErrors` from `HermesAgentStatistics` (replace with generic `enforceErrors` if needed)

---

## 4. Fallback Strategy

| Component | During Migration | Graceful Degradation |
|---|---|---|
| Python hooks (`_on_pre_tool_call`) | Try `npx 0xray enforce --phase pre`; if fails → log warning + allow tool | Fails open — tool call proceeds without enforcement |
| Python hooks (`_on_post_tool_call`) | Try `npx 0xray enforce --phase post`; if fails → log warning | Fails open — post-processing skipped |
| Python hooks (`_xray_command`) | Try `npx 0xray enforce --phase health`; if fails → show static status | Static status string shown |
| Python tools | If `npx 0xray` not found → graceful error message returned to LLM | LLM sees actionable "install 0xray" message |
| TypeScript hooks | If `beforeToolHook`/`afterToolHook` fails → `allowed: true`, log error | Fails open — already the current behavior |
| TypeScript MCP calls | Try MCP; if enforcer server unavailable → fall back to simulation or graceful error | Returns error to caller, doesn't crash |

**Key principle:** Every replacement has a no-spawn fallback. The bridge failure mode was "tool proceeds without enforcement" — the replacement maintains the same contract.

---

## 5. Backward Compatibility

| Concern | Mitigation |
|---|---|
| **Existing Hermes users** on v2.0/v2.1 with `bridge.mjs` | Bridge file is deprecated but not removed until v2.3. Old plugin will still find `bridge.mjs` during the deprecation window. |
| **Session continuity** | Restart required for Python plugin changes (reload plugin). The TypeScript integration picks up changes on next `initializeHermesAgentIntegration()` call. |
| **Log format** | `activity.log` and `plugin-tool-events.log` formats unchanged. The `_log_to_file()` calls remain identical — only the enforcement backend changes. |
| **Statistics shape** | `_session_stats` keys: `bridge_calls` and `bridge_errors` replaced by `enforce_calls` and `enforce_errors` in v2.3. During v2.2 deprecation, both counters are populated. |
| **Tool response format** | `xray_validate`, `xray_codex_check`, `xray_health` return slightly different shaped JSON (no `via: "bridge"` field). The LLM adapts automatically since the response schema is descriptive, not typed. |

### Migration Timeline

| Version | Python Plugin | TypeScript Integration | `bridge.mjs` |
|---|---|---|---|
| **v2.2** (now) | Dual-write: try bridge first, then CLI | Remove bridge calls; use MCP | Deprecation warning, still functional |
| **v2.3** (next) | CLI primary, bridge removed | MCP only | Deleted |
| **v2.4** | CLI + MCP only | MCP only | Removed entirely |

---

## 6. Verification

### Unit Tests

| Test | File | What to Assert |
|---|---|---|
| `enforce-command-pre` | `src/__tests__/unit/enforce-command.test.ts` | `npx 0xray enforce --phase pre --tool write_file --args '{"filePath":"x.ts"}'` returns `{allowed: boolean, violations: [...]}` |
| `enforce-command-post` | same | Post-phase returns `{processed: true, processorResults: [...]}` |
| `enforce-command-health` | same | Health phase returns component status |
| `enforce-command-validate` | same | Validate phase calls enforcer MCP `run-pre-commit-validation` |
| `enforce-command-codex` | same | Codex-check phase calls enforcer MCP `codex-enforcement` |

### Integration Tests

| Test | What to Verify |
|---|---|
| `hermes-integration-no-bridge` | `onPreToolCall` calls `beforeToolHook` and does NOT call `sendToBridge` |
| `hermes-integration-mcp-validate` | `validate()` calls `mcpClientManager.callServerTool("enforcer", ...)` |
| `hermes-mcp-json-config` | Hermes install writes `.mcp.json` with correct `mcpServers` entries |
| `bridge-deprecation-warning` | `bridge.mjs` prints deprecation warning to stderr on invocation |

### Manual E2E Verification

```bash
# 1. Verify enforce CLI works
npx 0xray enforce --phase health
# → {"status":"ok","framework":"loaded","components":{...}}

npx 0xray enforce --phase pre --tool write_file --args '{"filePath":"test.ts","content":"let x = 1"}'
# → {"allowed":true,"violations":[],"resonance":0.85,"duration":42}

# 2. Verify Hermes plugin loads without bridge
mv src/integrations/hermes-agent/bridge.mjs src/integrations/hermes-agent/bridge.mjs.bak
npx 0xray hermes install
# → Plugin installed with MCP servers, no bridge dependency

# 3. Verify tool calls work end-to-end
# In Hermes, call xray_health tool
# → Returns status without bridge fallback

# 4. Verify MCP auto-discovery
# In Hermes, check available tools list
# → mcp_xray_enforcer_* tools present

# Restore bridge if needed for rollback
mv src/integrations/hermes-agent/bridge.mjs.bak src/integrations/hermes-agent/bridge.mjs
```

### Regression: Run Full Test Suite

```bash
npx vitest run  # 2527 tests must pass
```

---

## Summary of Changes

| File | Change Type | Lines Changed |
|---|---|---|
| `src/cli/index.ts` | Add `enforce` command (≈20 lines) | +20 |
| `src/cli/commands/enforce.ts` | **New file** — wraps enforcement gate + MCP | +80 |
| `src/integrations/hermes-agent/__init__.py` | Replace `_call_bridge` → `_run_xray_enforce` | ≈40 modified |
| `src/integrations/hermes-agent/tools.py` | Remove bridge calls, CLI becomes primary | ≈60 modified, -15 |
| `src/integrations/hermes-agent/hermes-agent-integration.ts` | Remove redundant bridge calls, use MCP | ≈100 modified, -80 |
| `src/integrations/hermes-agent/types.ts` | Remove bridge types | ≈-120 |
| `src/integrations/hermes-agent/bridge.mjs` | Add deprecation warning (no removal yet) | +5 |
| `src/cli/commands/hermes-install.ts` | Write `.mcp.json` for Hermes | ≈+30 |
| `src/__tests__/unit/enforce-command.test.ts` | **New file** | +100 |

**Net change:** ~300 lines added, ~215 removed (not counting new test file).

---

## Architecture After Migration

```
┌──────────────────────────────────────────────────────────┐
│                    Hermes Agent                           │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │  Python Plugin       │   │  TypeScript Integration  │  │
│  │                      │   │                          │  │
│  │  _on_pre_tool_call ──┼───┼→ beforeToolHook()       │  │
│  │  _on_post_tool_call ─┼───┼→ afterToolHook()        │  │
│  │                      │   │                          │  │
│  │  xray_validate ──────┼───┼→ mcpClientManager       │  │
│  │  xray_codex_check ───┼───┼→ callServerTool()       │  │
│  │  xray_health ────────┼───┼→ "enforcer" server      │  │
│  │                      │   │                          │  │
│  │  [MCP auto-disc.]    │   │  .mcp.json → npx 0xray  │  │
│  │  mcp_xray_enforcer_* │   │  mcp enforcer           │  │
│  └─────────────────────┘   └──────────────────────────┘  │
│                                                           │
│  NO MORE: bridge.mjs subprocess                           │
│  INSTEAD: npx 0xray enforce (CLI) + MCP (tool calls)     │
└──────────────────────────────────────────────────────────┘
```
