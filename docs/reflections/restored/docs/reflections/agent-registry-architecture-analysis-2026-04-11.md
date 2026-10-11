# Agent Registry Architecture: Forensic Analysis & Remediation Plan

**Date**: 2026-04-11
**Type**: Reflection / Architecture Analysis
**Status**: Analysis Complete, Remediation Planned
**Severity**: Critical — 12 of 25 agents silently broken

---

## 1. Executive Summary

The 0xRay framework maintains **seven independent agent registries** that must be manually kept in sync. They aren't. This analysis discovered that **12 out of 25 registered agents are silently broken**: the enforcer's keyword routing table correctly routes tasks to them, but the delegator's hardcoded `ALLOWED_AGENTS` allowlist blocks execution with a hard throw. The user never sees an error — the delegator falls back to `ruleValidationSelf()` and the enforcer handles the task itself, badly.

**Impact**:
- `backend-engineer`, `strategist`, `content-creator`, `seo-consultant`, `growth-strategist`, `frontend-engineer`, `frontend-ui-ux-engineer`, `database-engineer`, `devops-engineer`, `mobile-developer`, `performance-engineer`, and `multimodal-looker` — all routed to, all blocked at execution
- `default-agents.ts` reports only 11 agents exist when 25 do
- The `storyteller` agent is referenced in routing config but doesn't exist in the TypeScript barrel — causes runtime crash
- Two identical 752-line routing JSON files exist simultaneously
- 15 test artifacts pollute the learned routing data

**Root cause**: Six development phases created seven registries. No single registry derives from any other. No validation exists. Each new agent requires manually updating 5+ files in different locations and formats.

---

## 2. Architecture Map — The 7 Independent Registries

| # | Registry | Location | Format | Agent Count | Role | Consumed By |
|---|----------|----------|--------|-------------|------|-------------|
| 1 | TS barrel | `src/agents/index.ts` | TypeScript `Record<string, AgentConfig>` | 25 | Runtime agent config lookup | `AgentDelegator.executeDelegation()` |
| 2 | Default list | `src/config/default-agents.ts` | TypeScript `DefaultAgentConfig[]` | 11 | Delegation metadata | `AgentDelegator.getAvailableAgents()` |
| 3 | Allowlist | `src/delegation/agent-delegator.ts:621-633` | TypeScript `Set<string>` | 11 | Execution gate (security) | `AgentDelegator.validateAgentName()` |
| 4 | Keyword routing | `src/enforcement/enforcer-tools.ts:29-165` | TypeScript `ROUTING_MAPPINGS[]` | ~100 entries | Keyword → agent mapping | `getTaskRoutingRecommendation()` |
| 5 | Learned routing | `.opencode/strray/routing-mappings.json` + `.strray/routing-mappings.json` | JSON array | 29 base + 15 test | ML-derived routing overrides | `AgentDelegator.matchRoutingMappings()` |
| 6 | OpenCode config | `opencode.json` → `agent` section | JSON object | ~26 active, ~30+ disabled | CLI agent spawning | OpenCode runtime |
| 7 | YAML configs | `agents/*.yml` (26 files) + `.opencode/agents/*.yml` (45 files) | YAML | 71 files total | Rich agent configs (logging, pipelines, error handling) | OpenCode YAML system only — NOT TypeScript code |

**Key finding**: Registry #1 (barrel) is the most complete at 25 agents. Registry #2 (default list) and #3 (allowlist) are both stale at 11. Registry #4 (keyword routing) routes to agents that registries #2 and #3 don't know about. This creates a pipeline where routing succeeds but execution fails.

### Additional Naming Overlap

Beyond the 7 registries, there are:
- **25 MCP skill servers** in `src/mcps/knowledge-skills/*.server.ts` — many named after agents (e.g., `strategist.server.ts`, `seo-consultant.server.ts`)
- **42 skill directories** in `src/skills/*/SKILL.md` — many sharing names with agents
- **8 hardcoded agent descriptions** in `src/mcps/framework-help.server.ts` — disagreeing with the 24 agents listed in its own command output

---

## 3. The 4 Invocation Paths

### Path A: Enforcer-Initiated Delegation (Primary Runtime Path — BROKEN for 12 agents)

```
User task
  │
  ▼
enforcer-tools.ruleValidation()
  │
  ├── preProcessAndRoute()
  │     └── getTaskRoutingRecommendation()
  │           └── ROUTING_MAPPINGS[] ← hardcoded in enforcer-tools.ts (~100 entries)
  │                 └── Returns: { suggestedAgent, suggestedSkill, confidence }
  │
  ├── [confidence >= 0.50 AND agent NOT in ENFORCER_HANDLES]
  │     │
  │     ▼ delegateToAgent()
  │       │
  │       ├── new AgentDelegator()
  │       │
  │       ├── delegator.analyzeDelegation()
  │       │     ├── matchRoutingMappings() ← reads routing-mappings.json (Path B)
  │       │     ├── determineAgents() ← hardcoded if/else logic
  │       │     └── predictiveAnalytics.predictSync() ← ML fallback
  │       │
  │       └── delegator.executeDelegation()
  │             │
  │             ├── import("../agents/index.js")
  │             │     └── builtinAgents[agentName] ← 25 entries, covers most agents
  │             │
  │             ├── validateAgentName() ← ALLOWED_AGENTS check
  │             │     └── ONLY 11 ENTRIES — THROWS for 14 agents
  │             │     └── "Agent 'backend-engineer' is not in the allowed list"
  │             │
  │             └── [if survives allowlist]
  │                   └── import(`../agents/${agentName}.js`) ← dynamic import
  │                         └── agent.execute(request)
  │
  └── [else: low confidence or enforcer handles]
        └── ruleEnforcer.validateOperation() ← enforcer does it itself
```

**Critical failure point**: `validateAgentName()` at `agent-delegator.ts:639-654`. This is a hardcoded allowlist with only 11 entries. When the enforcer routes to `backend-engineer` (confidence 0.95), the delegator throws: `Agent "backend-engineer" is not in the allowed list`. The error is caught in `delegateToAgent()` which falls back to `ruleValidationSelf()` — meaning the enforcer does the work itself, poorly.

### Path B: Learned Routing Override (Runtime JSON)

```
AgentDelegator.determineAgents()
  │
  ├── loadRoutingMappings()
  │     ├── .strray/routing-mappings.json       ← tried first (EXACT DUPLICATE)
  │     ├── strray/routing-mappings.json
  │     ├── .opencode/strray/routing-mappings.json
  │     └── routing-mappings.json
  │
  └── matchRoutingMappings(description)
        └── keyword matching with confidence >= 0.7 threshold
              └── Overrides hardcoded logic if score is higher
```

This path adds a second keyword routing layer on top of `enforcer-tools.ts`. Both can produce different answers for the same input. The JSON files also contain 15 test artifacts (`stress-test-0`, `e2e-1`, `test-0.5529761171611898`) that pollute the routing table.

### Path C: MCP Skill Invocation (Parallel Universe)

```
User → OpenCode tool call
  │
  ▼
skill-invocation.server.ts
  │
  ├── invoke-skill { skillName, toolName }
  │     ├── skillAliases map (only 6 entries)
  │     │     "architect" → "architecture-patterns"
  │     │     "code-reviewer" → "code-review"
  │     │     "security-auditor" → "security-audit"
  │     │     "performance-engineer" → "performance-optimization"
  │     │     "testing-lead" → "testing-strategy"
  │     │     "architect-tools" → "architect"
  │     │
  │     ├── availableServers hardcoded list (~40 entries)
  │     └── mcpClientManager.callServerTool(resolvedSkill, toolName, args)
  │           └── Calls MCP server in src/mcps/knowledge-skills/
  │
  └── [e.g., skill-strategist, skill-security-audit, skill-code-review]
        └── Each has its own MCP server .ts file with independent tool definitions
```

This path is completely independent from the agent delegation system. It calls MCP skill servers directly, bypassing `AgentDelegator` entirely. The `skillAliases` map creates naming confusion — `"security-auditor"` (an agent name) gets silently redirected to `"security-audit"` (a skill name).

### Path D: OpenCode Direct (@agent Invocation) — Bypasses All TypeScript Code

```
User: @architect design this API
  │
  ▼
OpenCode reads opencode.json → agent.architect config
  │
  └── Spawns subagent directly
        └── Completely independent from registries 1-5
        └── Uses YAML config from agents/*.yml if available
        └── No strray TypeScript code involved
```

This path works correctly for all agents listed in `opencode.json` because it doesn't touch the TypeScript delegation pipeline at all. It's a parallel universe that happens to use the same agent names.

---

## 4. Critical Bugs Found

### Bug 1: ALLOWED_AGENTS Allowlist Blocks 14 Agents (SEVERITY: CRITICAL)

**File**: `src/delegation/agent-delegator.ts:621-633`

```typescript
private static readonly ALLOWED_AGENTS = new Set([
    'enforcer', 'architect', 'orchestrator',
    'bug-triage-specialist', 'code-reviewer', 'security-auditor',
    'refactorer', 'testing-lead', 'log-monitor', 'researcher', 'analyzer',
]);
```

Only 11 entries. The `enforcer-tools.ts` routing table routes to `backend-engineer`, `strategist`, `content-creator`, `seo-consultant`, `growth-strategist`, `frontend-engineer`, `frontend-ui-ux-engineer`, `database-engineer`, `devops-engineer`, `mobile-developer`, `performance-engineer`, `multimodal-looker`, `tech-writer`, and `code-analyzer` — all blocked.

**Missing agents**: `backend-engineer`, `strategist`, `content-creator`, `seo-consultant`, `growth-strategist`, `frontend-engineer`, `frontend-ui-ux-engineer`, `database-engineer`, `devops-engineer`, `mobile-developer`, `performance-engineer`, `multimodal-looker`, `tech-writer`

### Bug 2: default-agents.ts Reports Only 11 of 25 Agents (SEVERITY: HIGH)

**File**: `src/config/default-agents.ts:21-129`

`DEFAULT_AGENTS` array has 11 entries. `AgentDelegator.getAvailableAgents()` returns only these 11. Any code querying "what agents exist?" gets the wrong answer. The following 14 agents are invisible to the delegation system's agent-discovery API:

**Missing**: `backend-engineer`, `strategist`, `content-creator`, `seo-consultant`, `growth-strategist`, `frontend-engineer`, `frontend-ui-ux-engineer`, `database-engineer`, `devops-engineer`, `mobile-developer`, `performance-engineer`, `multimodal-looker`, `tech-writer`, `code-analyzer`

### Bug 3: 'analyzer' vs 'code-analyzer' Name Mismatch (SEVERITY: MEDIUM)

**File**: `src/delegation/agent-delegator.ts:632`

`ALLOWED_AGENTS` contains `'analyzer'` but the agent is registered as `'code-analyzer'` in `builtinAgents`. The allowlist check will throw for the correct name.

### Bug 4: 'storyteller' Routed But Doesn't Exist (SEVERITY: MEDIUM)

**Files**: `.opencode/strray/routing-mappings.json:323-324`, `.strray/routing-mappings.json:323-324`

Both routing JSON files contain:
```json
{ "keywords": ["story", "narrative", "journey", "saga", "reflection", ...], "agent": "storyteller" }
```

But `src/agents/index.ts` has no `storyteller` export. When `executeDelegation()` runs `builtinAgents["storyteller"]`, it gets `undefined` and throws: `"Agent storyteller not found in builtin agents"`.

### Bug 5: Two Identical routing-mappings.json Files (SEVERITY: LOW)

**Files**: `.opencode/strray/routing-mappings.json` (752 lines), `.strray/routing-mappings.json` (752 lines)

These are **byte-for-byte identical**. The delegator tries both paths in sequence. Pure waste and confusion.

### Bug 6: Test Artifacts Polluting Routing Data (SEVERITY: LOW)

**Files**: Both `routing-mappings.json` files

~15 entries are test artifacts with keywords like `stress-test-0`, `e2e-1`, `test-0.2,533104`, `pipeline-0` — all marked `autoGenerated: true`. These should have been cleaned up after test runs.

### Bug 7: framework-help.server.ts Has Disagreeing Lists (SEVERITY: LOW)

**File**: `src/mcps/framework-help.server.ts`

- `handleGetCapabilities()` at line 130 lists **8 agents** in the capabilities object
- `handleGetCommands()` at line 196 lists **24 agents** in the agent-commands output
- Neither is derived from any registry

---

## 5. Root Cause Analysis

### Why 7 Registries Exist

The framework evolved through 6 development phases, each adding a new registry:

```
Phase 1 (Core):        default-agents.ts (11 agents)
                        └── The original minimal set for the delegation system

Phase 2 (Growth):      src/agents/*.ts + index.ts barrel (25 agents)
                        └── Runtime expansion with full AgentConfig objects

Phase 3 (Routing):     enforcer-tools.ts ROUTING_MAPPINGS
                        └── Keyword routing hardcoded separately from agent definitions

Phase 4 (Learning):    routing-mappings.json
                        └── Inference tuner output, yet another routing layer

Phase 5 (OpenCode):    opencode.json + YAML files
                        └── OpenCode CLI integration — separate framework entirely

Phase 6 (Skills):      MCP servers named after agents
                        └── Confusion between skills and agents
```

### Why Drift Was Inevitable

1. **No registration function exists.** Adding a new agent requires manually touching 5+ files in different directories and formats.

2. **No derivation.** None of the registries generates or validates any other. Each is independently maintained.

3. **No compile-time safety.** The `ALLOWED_AGENTS` allowlist is a `Set<string>` — a typo or omission causes a runtime throw with no TypeScript error.

4. **Silent failure mode.** When `validateAgentName()` throws, the error is caught in `delegateToAgent()` which falls back to `ruleValidationSelf()`. The task completes — just with the wrong agent. No alert, no log at warning level, just an info-level log entry.

5. **No consistency tests.** No test verifies that `ALLOWED_AGENTS` matches `builtinAgents` keys, or that `default-agents.ts` covers the barrel, or that routing targets exist.

### The Silent Kill Switch Pattern

The `ALLOWED_AGENTS` hard-coded allowlist at `agent-delegator.ts:621` is the architectural antipattern that made this failure invisible:

```typescript
// This is a silent kill switch — if an agent is not listed, it gets
// routed to but then blocked at execution. The error is caught and
// the task falls back to the enforcer doing it poorly.
private static readonly ALLOWED_AGENTS = new Set([
    'enforcer', 'architect', 'orchestrator',
    'bug-triage-specialist', 'code-reviewer', 'security-auditor',
    'refactorer', 'testing-lead', 'log-monitor', 'researcher', 'analyzer',
]);
```

When a new agent is added to the barrel and routing tables but not to this allowlist, the system appears to work (routing succeeds, confidence is high) but execution silently degrades (falls back to enforcer self-handling).

---

## 6. Refactoring Plan Summary

### Phase 1: Immediate Fixes (Stop the Bleeding) — All LOW risk

| Step | Change | File | Lines |
|------|--------|------|-------|
| 1.1 | Expand `ALLOWED_AGENTS` 11 → 23, fix `'analyzer'` → `'code-analyzer'` | `src/delegation/agent-delegator.ts` | 621-633 |
| 1.2 | Expand `DEFAULT_AGENTS` 11 → 23 with full `DefaultAgentConfig` entries | `src/config/default-agents.ts` | 21-129 |
| 1.3 | Clean test artifacts from both `routing-mappings.json` files | `.opencode/strray/routing-mappings.json`, `.strray/routing-mappings.json` | Remove auto-generated entries |
| 1.4 | Delete duplicate `.strray/routing-mappings.json` | `.strray/routing-mappings.json` | Delete entire file |
| 1.5 | Fix `'storyteller'` → `'tech-writer'` in routing JSON | Both routing JSON files | ~324 |
| 1.6 | Fix agent-capabilities key mismatch if present | `src/delegation/agent-capabilities.ts` | Verify all keys |

### Phase 2: Single Source of Truth

| Step | Change | Rationale |
|------|--------|-----------|
| 2.1 | Create `src/agents/registry.ts` with a single `AGENT_REGISTRY` constant | One array of `{ name, config, allowed, capabilities }` that all consumers import |
| 2.2 | Derive `builtinAgents` from `AGENT_REGISTRY` | `index.ts` becomes `AGENT_REGISTRY.reduce(...)` |
| 2.3 | Derive `ALLOWED_AGENTS` from `AGENT_REGISTRY` | `new Set(AGENT_REGISTRY.map(a => a.name))` — no manual list |
| 2.4 | Derive `DEFAULT_AGENTS` from `AGENT_REGISTRY` | Filter and map to `DefaultAgentConfig` format |

### Phase 3: Eliminate Redundancy

| Step | Change | Rationale |
|------|--------|-----------|
| 3.1 | Merge `enforcer-tools.ts ROUTING_MAPPINGS` into `routing-mappings.json` | Single routing config file, no more hardcoded keyword table |
| 3.2 | Delete all `disable: true` entries from `opencode.json` | 30+ dead entries cluttering the config |
| 3.3 | Dynamic skill discovery in `skill-invocation.server.ts` | Replace hardcoded `availableServers` list with filesystem scan |

### Phase 4: Validation & Safety

| Step | Change | Rationale |
|------|--------|-----------|
| 4.1 | Registry consistency test | Verify `ALLOWED_AGENTS` ⊇ `builtinAgents` keys, `DEFAULT_AGENTS` covers all, routing targets exist |
| 4.2 | Startup validation function | Log warnings for any registry inconsistencies at framework boot |
| 4.3 | CI gate | Fail build if registries disagree |
| 4.4 | JSON schema for routing-mappings.json | Prevent malformed entries |

### Phase 5: Structural Cleanup

| Step | Change | Rationale |
|------|--------|-----------|
| 5.1 | Resolve phantom agents (`multimodal-looker`, `explore`) | Either register properly or remove from routing |
| 5.2 | Dynamic agent lists in `framework-help.server.ts` | Derive from registry, not hardcoded |
| 5.3 | Agent ↔ skill naming convention | Establish rule: agents use kebab-case, skills use kebab-case, no overlap |
| 5.4 | Decide YAML config fate | Either generate YAML from TS or mark as OpenCode-only documentation |

---

## 7. Priority Matrix

| Step | Impact | Effort | Risk | Priority |
|------|--------|--------|------|----------|
| 1.1 Expand ALLOWED_AGENTS | **HIGH** (unblocks 12 agents) | LOW | LOW | **P0** |
| 1.3 Clean test artifacts | MEDIUM | LOW | LOW | **P0** |
| 1.5 Fix storyteller routing | MEDIUM | LOW | LOW | **P0** |
| 1.2 Expand DEFAULT_AGENTS | MEDIUM | LOW | LOW | **P1** |
| 1.6 Fix capabilities key | LOW | LOW | LOW | **P1** |
| 1.4 Remove duplicate JSON | LOW | LOW | LOW | **P2** |
| 2.1 Create registry | **HIGH** | MEDIUM | MEDIUM | **P1** |
| 4.1 Consistency tests | **HIGH** | MEDIUM | LOW | **P1** |
| 2.2-2.4 Derive consumers | MEDIUM | MEDIUM | MEDIUM | **P2** |
| 3.1 Merge routing tables | MEDIUM | MEDIUM | MEDIUM | **P2** |
| 4.2-4.4 Validation infra | MEDIUM | MEDIUM | LOW | **P2** |
| 5.1-5.4 Structural cleanup | LOW | HIGH | MEDIUM | **P3** |

---

## 8. Lessons Learned

### 1. Hardcoded Allowlists Are Silent Kill Switches

A `Set<string>` allowlist that doesn't match the actual registry doesn't cause a compile error or a visible failure. It causes silent degradation — the system appears to work but routes to the wrong agent. This is worse than a crash because it's invisible.

**Rule**: Any security allowlist must be derived from the source of truth at initialization time, not hardcoded.

### 2. Multiple Registries Without Derivation = Guaranteed Drift

If you have N registries that must agree, and none generates any other, you have O(N) manual update points per change. With N=7, every new agent requires 7 manual file edits. Humans will miss at least one.

**Rule**: One registry is the source of truth. All others derive from it.

### 3. No Validation = No Visibility Into Breakage

The framework has extensive logging but no startup validation that checks "do all registries agree?" The bug existed for months because nothing ever checked.

**Rule**: Framework boot must validate cross-registry consistency and fail loudly on mismatch.

### 4. Agent ↔ Skill Naming Overlap Creates Constant Confusion

`"security-auditor"` is an agent. `"security-audit"` is a skill. `"security-scan"` is also a skill. The `skillAliases` map tries to bridge this but only covers 6 cases. Humans and AI alike can't tell which is which.

**Rule**: Establish a naming convention. Agents and skills should have distinct naming patterns.

### 5. Test Artifacts in Production Config Are Technical Debt

The `routing-mappings.json` files contain test entries from stress tests and E2E tests that were never cleaned up. These entries have random keywords that could theoretically match user input.

**Rule**: Test-generated config must be cleaned up automatically or isolated in test-specific files.

### 6. The "Fall Back to Self" Pattern Masks Errors

When delegation fails, `delegateToAgent()` catches the error and falls back to `ruleValidationSelf()`. This is architecturally reasonable (resilience) but it means routing failures are invisible. The task completes, just poorly.

**Rule**: Fallback paths must log at warning level with enough context to detect systematic routing failures.

---

## Appendix A: Complete Agent Coverage Matrix

| Agent | Barrel (#1) | Default (#2) | Allowlist (#3) | Routing (#4) | JSON (#5) | OpenCode (#6) |
|-------|:-----------:|:------------:|:--------------:|:------------:|:---------:|:-------------:|
| enforcer | YES | YES | YES | YES | YES | YES |
| architect | YES | YES | YES | YES | YES | YES |
| orchestrator | YES | YES | YES | YES | YES | YES |
| bug-triage-specialist | YES | YES | YES | YES | YES | YES |
| code-reviewer | YES | YES | YES | YES | YES | YES |
| security-auditor | YES | YES | YES | YES | YES | YES |
| refactorer | YES | YES | YES | YES | YES | YES |
| testing-lead | YES | YES | YES | YES | YES | YES |
| log-monitor | YES | YES | YES | YES | YES | YES |
| researcher | YES | YES | YES | YES | YES | YES |
| code-analyzer | YES | YES | **NO** (says 'analyzer') | YES | YES | YES |
| **backend-engineer** | YES | **NO** | **NO** | YES | YES | YES |
| **strategist** | YES | **NO** | **NO** | YES | YES | YES |
| **content-creator** | YES | **NO** | **NO** | YES | YES | YES |
| **seo-consultant** | YES | **NO** | **NO** | YES | YES | YES |
| **growth-strategist** | YES | **NO** | **NO** | YES | YES | YES |
| **frontend-engineer** | YES | **NO** | **NO** | YES | YES | YES |
| **frontend-ui-ux-engineer** | YES | **NO** | **NO** | YES | YES | YES |
| **database-engineer** | YES | **NO** | **NO** | YES | YES | YES |
| **devops-engineer** | YES | **NO** | **NO** | YES | YES | YES |
| **mobile-developer** | YES | **NO** | **NO** | YES | YES | YES |
| **performance-engineer** | YES | **NO** | **NO** | YES | YES | YES |
| **multimodal-looker** | YES | **NO** | **NO** | YES | YES | YES |
| **tech-writer** | YES | **NO** | **NO** | YES | YES | YES |
| librarian-agents-updater | YES | **NO** | **NO** | **NO** | **NO** | YES |
| storyteller | **NO** | **NO** | **NO** | **YES** | **YES** | **NO** |

**Bold rows** = agents routed to but blocked at execution by the allowlist.

## Appendix B: File Locations Reference

| File | Role | Lines |
|------|------|-------|
| `src/agents/index.ts` | Barrel — exports `builtinAgents` | 77 |
| `src/agents/types.ts` | `AgentConfig` interface | 53 |
| `src/config/default-agents.ts` | `DEFAULT_AGENTS` array (11 entries) | 138 |
| `src/delegation/agent-delegator.ts` | `AgentDelegator` class + `ALLOWED_AGENTS` | 1004 |
| `src/enforcement/enforcer-tools.ts` | `ROUTING_MAPPINGS` + routing functions | 1254 |
| `src/mcps/framework-help.server.ts` | Hardcoded capability listings | 485 |
| `src/mcps/knowledge-skills/skill-invocation.server.ts` | Skill invocation + aliases | 761 |
| `opencode.json` | OpenCode agent config | 339 |
| `.opencode/strray/routing-mappings.json` | Learned routing (29 base + 15 test) | 752 |
| `.strray/routing-mappings.json` | Duplicate of above | 752 |
| `agents/*.yml` | 26 YAML agent configs | ~100 lines each |
| `.opencode/agents/*.yml` | 45 YAML agent configs | ~50 lines each |

---

*End of analysis. Next step: Execute Phase 1 immediate fixes.*
