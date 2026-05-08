# Recovery Mechanisms Audit - StringRay Consumer Perspective
**Date**: 2026-05-08  
**Scope**: Consumer experience after `npm install strray-ai`

## Executive Summary

**Health Score: 4/10** ⚠️

StringRay ships impressive recovery *code*, but critical integration gaps make most mechanisms **non-functional for consumers**. The framework has excellent architecture on paper, but the wiring between components is incomplete.

### Key Findings
- **2 INTEGRATED** mechanisms (work out of the box)
- **2 PARTIAL** mechanisms (coded but needs config/hooks)
- **4 VAPORWARE** mechanisms (code exists but never called)
- **1 MISSING** implementation (circuit breaker runtime)

---

## Categorized Findings

| File | Mechanism | Status | Evidence | Consumer Impact |
|------|------------|--------|----------|-----------------|
| `src/monitoring/nudge-watchdog.ts` | Nudge detection (think-loop, syntax-loop, etc.) | **VAPOR** | Class exists, exports `recordThinkTag()` etc., but these are never called by plugin hooks | Consumers get zero nudge protection. AI can loop indefinitely. |
| `src/processors/implementations/nudge-processor.ts` | NudgeProcessor | **VAPOR** | `NudgeProcessor` class exists but is NOT in `processor-manager.ts:registerBuiltInFactories()` (lines 171-493). No registration = never instantiated. | Processor never runs. Nudge detection code is dead code. |
| `src/postprocessor/escalation/EscalationEngine.ts` | EscalationEngine | **INTEGRATED** ✅ | Wired in `PostProcessor.ts:77` constructor. `evaluateEscalation()` called at line 1317. | Works out of the box. Triggers on failure thresholds (2/3/5 attempts). |
| `src/postprocessor/autofix/AutoFixEngine.ts` | AutoFixEngine | **INTEGRATED** ✅ | Wired in `PostProcessor.ts:66-68`. `applyFixes()` called at line 1276. Runs `npm audit fix`, `npm run lint:fix`. | Works if npm scripts exist. Depends on project having lint/build scripts. |
| `src/inference/inference-cycle.ts` | Inference Cycle + `heuristicFallbackVote()` | **PARTIAL** ⚠️ | `maybeRunCycle()` called in `strray-codex-injection.ts:1012-1026`, but ONLY in `tool.execute.after` hook and only every 100 tool calls (`INFERENCE_TUNE_INTERVAL = 100`). | Rarely triggers. Timeout + SIGKILL in `invokeViaOpencode()` works (lines 718-776). |
| `src/inference/inference-cycle.ts` | `governExternalProposals()` | **PARTIAL** ⚠️ | Called via MCP orchestrator server (`src/mcps/orchestrator/server.ts:line`) and OpenClaw API (`src/integrations/openclaw/api-server.ts`). Not called in normal consumer flow. | Only works if consumers explicitly use MCP orchestrator or OpenClaw API. |
| `src/validation/agent-config-validator.ts` | Circuit Breaker Config Validation | **VAPOR** | Validates `circuit_breaker` config (lines 388-407), but NO runtime implementation exists in `src/`. Only in `advanced-features/distributed/` (non-consumer). | Config validation passes, but breaker never trips. Dead config. |
| `src/processors/implementations/performance-budget-processor.ts` | PerformanceBudgetProcessor | **PARTIAL** ⚠️ | Registered in `processor-manager.ts:389-407`. But NOT in `features.json` `processors.post_processors.priority_order` (lines 379-387). | Code exists, registered in manager, but NOT enabled by default for consumers. |
| `src/processors/processor-manager.ts` | StaggerPolicy | **VAPOR** | `StaggerPolicy` interface at line 8-10. Enforced in `executePreProcessors()` (line 682) and `executePostProcessors()` (line 753). BUT no processor sets `stagger` config. | Mechanism exists but no processor uses it. Never triggers. |
| `src/plugin/strray-codex-injection.ts` | Plugin Hooks (tool.execute.before/after) | **PARTIAL** ⚠️ | Hooks exist (lines 774, 898). `before` runs enforcer + pre/post processors. `after` runs outcome tracker + inference cycle. BUT never calls `recordThinkTag()`, `recordToolCall()`, etc. | Nudge methods exist in watchdog but plugin never calls them. Hooks are wired but incomplete. |

---

## Integration Gaps

### 1. NudgeProcessor Not Registered (CRITICAL)
**Gap**: `NudgeProcessor` exists in `src/processors/implementations/nudge-processor.ts` but is not in `processor-manager.ts:registerBuiltInFactories()`.

**Fix**: Add to `registerBuiltInFactories()`:
```typescript
f.set("nudge", {
  execute: async (ctx) => {
    const { NudgeProcessor } = await import("./implementations/nudge-processor.js");
    const p = new NudgeProcessor();
    const r = await p.execute(ctx as ProcessorContext);
    return r.data;
  },
});
```

**Then register in `PostProcessor.ts`**:
Add to `POST_PROCESSOR_MAP` or register directly:
```typescript
processorManager.registerProcessor({ name: "nudge", type: "post", priority: 100, enabled: true });
```

### 2. Plugin Hooks Don't Call Nudge Methods (CRITICAL)
**Gap**: `strray-codex-injection.ts` hooks never call `recordThinkTag()`, `recordToolCall()`, `recordFixAttempt()`, or `recordExplanation()`.

**Fix**: In `tool.execute.before` hook (line 774), add:
```typescript
const { recordToolCall } = await import("../monitoring/nudge-watchdog.js");
recordToolCall(input.tool, JSON.stringify(input.args || {}));
```

In `tool.execute.after` hook (line 898), add:
```typescript
const { recordThinkTag, recordExplanation } = await import("../monitoring/nudge-watchdog.js");
if (input.result?.content) {
  // Check for thinking tags
  if (/<thinking>[\s\S]*?<\/thinking>/gi.test(input.result.content)) {
    recordThinkTag();
  }
}
```

### 3. Circuit Breaker Has No Runtime Implementation (HIGH)
**Gap**: `agent-config-validator.ts` validates `circuit_breaker` config, but no `CircuitBreaker` class exists in `src/` for consumers. Only in `advanced-features/distributed/` (not shipped to consumers).

**Fix**: Create `src/monitoring/circuit-breaker.ts` with:
- `CircuitBreaker` class with `failure_threshold`, `recovery_timeout_ms`
- Integration into `ProcessorManager` or agent invocation
- Export from main package

### 4. PerformanceBudgetProcessor Not in Default Config (MEDIUM)
**Gap**: Processor is registered in code but not enabled in `features.json`.

**Fix**: Add to `features.json`:
```json
"processors": {
  "post_processors": {
    "enabled": true,
    "priority_order": [
      "performanceBudget",  // Add this
      "storytellingTrigger",
      ...
    ]
  }
}
```

### 5. StaggerPolicy Not Used by Any Processor (LOW)
**Gap**: `StaggerPolicy` mechanism exists but no built-in processor configures it.

**Fix**: Add stagger config to heavy processors:
```typescript
f.set("testExecution", {
  execute: async (ctx) => { ... },
  // Add stagger policy
  stagger: { minIntervalMs: 5000 }  // 5 second minimum interval
});
```

### 6. Inference Cycle Triggers Too Rarely (MEDIUM)
**Gap**: `INFERENCE_TUNE_INTERVAL = 100` in `strray-codex-injection.ts:612` means inference only runs every 100 tool calls.

**Fix**: Lower to 10-20 for consumers, or make configurable:
```typescript
const INFERENCE_TUNE_INTERVAL = config.inference?.workflow_dir ? 20 : 100;
```

---

## Consumer Out-of-Box Experience

### What Works Immediately After `npm install strray-ai`

✅ **Working**:
1. **EscalationEngine** - Automatically triggers when CI/CD pipeline fails 2+ times
2. **AutoFixEngine** - Attempts `npm audit fix` and `npm run lint:fix` on failures
3. **Codex Injection** - Plugin loads, enforces codex rules in system prompt
4. **Processor Pipeline** - Pre-processors (preValidate, codexCompliance) run on write/edit

⚠️ **Partially Working** (needs config or only works in specific scenarios):
1. **Inference Cycle** - Only triggers every 100 tool calls
2. **PerformanceBudgetProcessor** - Code registered but not in default `features.json`
3. **Post-processors** - Only runs processors listed in `features.json` priority_order

❌ **Not Working** (dead code for consumers):
1. **Nudge/Watchdog System** - Code exists but never called by plugin hooks
2. **Circuit Breaker** - Config validated but no runtime implementation
3. **StaggerPolicy** - Mechanism exists but no processor uses it

### What Consumers Need to Do After `npm install`

**Minimal setup** (if they want nudge protection):
```bash
# No additional setup needed for basic functionality
npx strray-ai install  # Sets up git hooks, basic config
```

**To enable nudge protection** (currently requires manual wiring):
```typescript
// In their project's entry point or opencode plugin config:
import { registerProcessor } from "strray-ai/dist/processors/processor-manager.js";
import { NudgeProcessor } from "strray-ai/dist/processors/implementations/nudge-processor.js";

// Manually register (should be automatic)
registerProcessor({ name: "nudge", type: "post", priority: 100, enabled: true });
```

**To enable performance budget**:
```json
// .opencode/strray/features.json
{
  "processors": {
    "post_processors": {
      "enabled": true,
      "priority_order": ["performanceBudget", "storytellingTrigger", ...]
    }
  }
}
```

---

## Recommended Actions (Prioritized)

### 🔴 P0 - Critical (Fix Immediately)

1. **Wire NudgeProcessor into ProcessorManager**
   - Add to `registerBuiltInFactories()` in `processor-manager.ts`
   - **Impact**: Enables think-loop, syntax-loop, death-spiral detection
   - **Effort**: 10 lines of code

2. **Call Nudge Methods in Plugin Hooks**
   - Modify `strray-codex-injection.ts` `tool.execute.before` and `tool.execute.after`
   - **Impact**: Actually records AI behavior patterns
   - **Effort**: 20 lines of code

### 🟠 P1 - High (Fix This Sprint)

3. **Implement CircuitBreaker Runtime**
   - Create `src/monitoring/circuit-breaker.ts`
   - Integrate into agent invocation or ProcessorManager
   - **Impact**: Prevents cascading failures in agent calls
   - **Effort**: ~100 lines of code

4. **Lower Inference Cycle Trigger Interval**
   - Change `INFERENCE_TUNE_INTERVAL` from 100 to 20
   - Or make it configurable in `features.json`
   - **Impact**: More frequent self-improvement cycles
   - **Effort**: 5 lines of code

### 🟡 P2 - Medium (Fix Next Sprint)

5. **Add PerformanceBudget to Default Config**
   - Update `features.json` `processors.post_processors.priority_order`
   - **Impact**: Enforces codex term #28 (Performance Budgets) by default
   - **Effort**: 1 line change

6. **Add StaggerPolicy to Heavy Processors**
   - Add `stagger: { minIntervalMs: 5000 }` to testExecution, regressionTesting
   - **Impact**: Prevents processor overload
   - **Effort**: 10 lines of code

### 🟢 P3 - Low (Backlog)

7. **Add Integration Tests for Recovery Mechanisms**
   - Test that nudge triggers on think-loop
   - Test that escalation triggers on repeated failures
   - Test that circuit breaker trips
   - **Effort**: ~200 lines of test code

8. **Document Consumer Recovery Setup**
   - Add section to README: "What gets wired automatically"
   - Add troubleshooting guide for recovery mechanisms
   - **Effort**: Documentation only

---

## Code References (Exact Locations)

### Nudge/Watchdog System
- **NudgeWatchdog class**: `src/monitoring/nudge-watchdog.ts:92-409`
- **Exported functions**: `src/monitoring/nudge-watchdog.ts:413-443`
- **NudgeProcessor class**: `src/processors/implementations/nudge-processor.ts:34-173`
- **NOT registered in**: `src/processors/processor-manager.ts:171-493` (registerBuiltInFactories)
- **Plugin hooks (no nudge calls)**: `src/plugin/strray-codex-injection.ts:774-896`

### Escalation Engine
- **EscalationEngine class**: `src/postprocessor/escalation/EscalationEngine.ts:48-633`
- **Wired in PostProcessor**: `src/postprocessor/PostProcessor.ts:77`
- **Called at**: `src/postprocessor/PostProcessor.ts:1317-1323`

### Auto-Fix Engine
- **AutoFixEngine class**: `src/postprocessor/autofix/AutoFixEngine.ts:24-396`
- **Wired in PostProcessor**: `src/postprocessor/PostProcessor.ts:66-68`
- **Called at**: `src/postprocessor/PostProcessor.ts:1276`

### Inference Cycle
- **InferenceCycle class**: `src/inference/inference-cycle.ts:74-1044`
- **heuristicFallbackVote()**: `src/inference/inference-cycle.ts:868-879`
- **governExternalProposals()**: `src/inference/inference-cycle.ts:91-141`
- **governProposals()**: `src/inference/inference-cycle.ts:579-676`
- **invokeViaOpencode() with timeout**: `src/inference/inference-cycle.ts:718-776`
- **Called in plugin (every 100 calls)**: `src/plugin/strray-codex-injection.ts:1012-1026`
- **INFERENCE_TUNE_INTERVAL**: `src/plugin/strray-codex-injection.ts:612`

### Circuit Breaker
- **Config validation**: `src/validation/agent-config-validator.ts:40-44, 388-407`
- **NO runtime implementation in src/** (only in advanced-features/distributed/)**

### Performance Budget Processor
- **PerformanceBudgetProcessor class**: `src/processors/implementations/performance-budget-processor.ts:68-255`
- **Registered in manager**: `src/processors/processor-manager.ts:389-407`
- **NOT in features.json**: `.opencode/strray/features.json:379-387`

### StaggerPolicy
- **Interface definition**: `src/processors/processor-manager.ts:8-10`
- **Enforced in executePreProcessors()**: `src/processors/processor-manager.ts:682-694`
- **Enforced in executePostProcessors()**: `src/processors/processor-manager.ts:753-765`
- **NOT used by any built-in processor**

### Plugin System Integration
- **Plugin definition**: `src/plugin/strray-codex-injection.ts:732-1150`
- **tool.execute.before hook**: `src/plugin/strray-codex-injection.ts:774-896`
- **tool.execute.after hook**: `src/plugin/strray-codex-injection.ts:898-1031`
- **chat.message hook**: `src/plugin/strray-codex-injection.ts:1033-1104`
- **registerAllProcessors()**: `src/plugin/strray-codex-injection.ts:669-676` (does NOT include nudge)

---

## Summary

StringRay has **excellent recovery architecture** but **poor integration**. The recovery mechanisms exist as:
- ✅ Well-implemented classes
- ✅ Proper configuration schemas
- ❌ Missing wiring between components
- ❌ No calls from plugin hooks to recovery methods

**Biggest gap**: The nudge/watchdog system (443 lines of code) is completely invisible to consumers because the plugin never calls `recordThinkTag()`, `recordToolCall()`, etc.

**Quick win**: Adding 30 lines of code to wire NudgeProcessor and call nudge methods from plugin hooks would immediately give consumers think-loop detection, syntax-loop detection, and death-spiral detection.

**Time to fix all P0/P1 issues**: ~2 hours of coding.

---

**Audit performed by**: AI Assistant (Deep Analysis)  
**Methodology**: Read source files, traced imports, verified registrations, checked plugin hooks, validated configuration defaults  
**Tools used**: grep, read, glob, bash (for pattern searching)
