---
title: "Multi-Agent Architecture Audit - Reality vs Hype"
date: "2026-04-02"
author: "StringRay Multi-Agent Team"
category: "architecture"
tags: ["audit", "multi-agent", "orchestration", "technical-debt"]
---

# Multi-Agent Architecture Audit - Reality vs Hype

## Executive Summary

A 4-agent audit of StringRay's multi-agent capabilities revealed significant gaps between marketing claims and code reality. This reflection documents findings and fixes applied.

## The Audit Team

- **@architect** - Config vs code analysis
- **@enforcer** - Codex enforcement validation  
- **@orchestrator** - Self-introspection
- **@security-auditor** - Inter-agent communication security

## Claims vs Reality

| Claim | Reality | Status |
|-------|---------|--------|
| "25 agents" | 11 agents in `.opencode/agents/` | ❌ Overstated |
| "max_concurrent_agents: 25" | Config dead code - never wired | ❌ Bug |
| "expert_priority" resolution | expertiseScore never populated | ❌ Broken |
| "consensus" resolution | Returns undefined - silent failure | ❌ Bug |
| "MCP shared state" | Process-local Maps, not shared | ❌ Overstated |
| "Event broadcasts" | Emitters exist, no subscribers | ❌ Broken |
| "60 Codex terms enforced" | Only 9 terms validated (~15%) | ❌ Gap |
| "99.6% error prevention" | Aspirational target, not measured | ⚠️ Marketing |

## What Actually Works

- ✅ Dependency graph building with parallel execution
- ✅ Session coordination per-agent  
- ✅ Workflow validation (circular dependency detection)
- ✅ Majority vote conflict resolution (the only working one)
- ✅ Codex enforcement for 9 terms (console.log, empty catch, @ts-ignore, etc.)

## Root Causes

### 1. Config-to-Code Disconnect
The config file `.strray/features.json` defines `max_concurrent_agents` but the orchestrator expects `maxConcurrentTasks`. Different key names, no wiring.

### 2. Expertise Score Never Set
`conflict_resolution: "expert_priority"` requires `expertiseScore` but no code ever populates this field.

### 3. Consensus Silent Failure
When agents disagree, `resolveByConsensus()` returns `undefined` instead of falling back to majority vote.

### 4. Process-Local State
`StringRayStateManager` uses in-memory Maps. Each agent process gets its own - not actually shared.

### 5. No Event Consumers
Events are emitted (`tool.before`, `tool.after`) but nothing subscribes to react to them.

## Fixes Applied

### April 2, 2026 - Session 1

1. **Enforcement System Fix** - Connected plugin to RuleEnforcer with 86+ rules
2. **False Positive Reduction** - Comment stripping, doc rules → warnings
3. **Post-Processor Context** - Metadata now passes through pipeline
4. **Storytelling Trigger** - Fixed to read from correct context path

### April 2, 2026 - Session 2 (This Audit)

1. **Config Wiring** - Planned: Connect features.json to OrchestratorConfig
2. **Expertise Score** - Planned: Add expertise scoring based on agent type
3. **Consensus Fallback** - Planned: Fall back to majority_vote on undefined
4. **MCP State** - Planned: Add inter-process state synchronization
5. **Event System** - Planned: Add subscriber handlers
6. **Codex Expansion** - Planned: Add enforcement for more terms

## Key Takeaways

> "The core enforcement system IS working. The multi-agent orchestration is functional but aspirational in parts. This is fixable - we now know exactly what's broken."

- Don't trust config - verify code actually uses it
- Conflict resolution strategies mostly broken except majority_vote
- MCP "shared state" is process-local - needs inter-process sync
- Event system is one-way (emit only, no consume)
- 9/60 Codex terms enforced - significant expansion opportunity

## What's Next

The team will systematically fix each broken component, starting with the highest impact: config-to-code wiring and consensus fallback.

---

*This reflection triggered by: Publishing v1.18.6 and reviewing multi-agent capabilities*