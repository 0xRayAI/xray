# Target Architecture — Recommendations

This document catalogs what exists, what appears orphaned, and what
questions remain to decide. It does NOT prescribe — it flags.

---

## Current State

```
src/  — 345 files, 132,000 lines, 26 directories
```

The framework has grown organically. Two distinct categories of code
need decisions:

1. **Confirmed dead** — zero reachable consumers at runtime (no boot
   path, no plugin hook, no CLI command, no processor registration
   leads to them). These are safe to delete.

2. **Uncertain** — have consumers but the consumer chain itself is
   suspect, OR partial overlap with alive code, OR "maybe should exist
   but nobody calls it."

---

## Recommendation 1: Delete Entire Directories

These directories have zero consumers in any runtime path (plugin,
boot, CLI, processor, MCP server). They export nothing that anything
uses.

| Directory | Files | Lines | First appeared |
|-----------|-------|-------|---------------|
| `src/api-gateway/` | 0 source files | 0 | Empty shell — 8 empty subdirectories |
| `src/benchmark/` | 1 file | 569 | `PerformanceBenchmark` — zero imports outside itself |
| `src/infrastructure/` | 2 files | 1,199 | `iac-validator.ts` + `cloud-schemas.ts` — zero imports |
| `src/performance/` | 2 files | ~1,090 | `performance-budget-enforcer.ts` + `regression-tester.ts` — zero imports |
| `src/testing/` | 1 file | 350 | `memory-regression-suite.ts` — zero imports |

**Total: ~3,200 lines.** These are unambiguous — nothing references them.

---

## Recommendation 2: Delete PostProcessor Tree

`src/postprocessor/` contains 13 subdirectories (~5,000 lines) forming
a standalone CI/CD automation system:

- `analysis/FailureAnalysisEngine.ts` (336L)
- `autofix/AutoFixEngine.ts` + `FixValidator.ts` (496L)
- `monitoring/MonitoringEngine.ts` (170L)
- `redeploy/RedeployCoordinator.ts` + `RetryHandler.ts` (653L)
- `escalation/EscalationEngine.ts` (633L)
- `success/SuccessHandler.ts` (202L)
- `triggers/GitHookTrigger.ts`, `WebhookTrigger.ts`, `APITrigger.ts` (1,158L)
- `services/RegressionAnalysisService.ts` (200L)
- `validation/ComprehensiveValidator.ts`, `LightweightValidator.ts` (200L)

**Reachability analysis:**
- `PostProcessor.ts` IS dynamically imported by `core/strray-activation.ts:265`
- `strray-activation.ts` IS loaded via `core/index.ts` barrel → `src/index.ts`
- BUT the function that instantiates PostProcessor (`activatePostProcessor()`) is
  ONLY called from within `activateStringRayFramework()` — which is **exported but
  never invoked** by any code
- So the class definition is loaded into memory, but `new PostProcessor()` never
  happens, and `executePostProcessorLoop()` is never called
- The 13 subdirectories are only imported by `PostProcessor.ts` itself

**Question:** Was this intended to replace the processor pipeline, or was it
a parallel experiment? The active pipeline uses `ProcessorManager` +
`postprocessor-chain-validator.ts` (218L) instead.

**Decision needed:** DELETE or INVEST to wire into boot.

---

## Recommendation 3: Delete or Wire Unplumbed Orchestrator Files

Four files in `src/orchestrator/` are built but never called:

| File | Lines | What it does | Status |
|------|-------|-------------|--------|
| `intelligent-commit-batcher.ts` | 508 | Groups file changes into optimal git commits | Only imported by test |
| `self-direction-activation.ts` | 352 | Self-monitoring + self-evolution cycles | Only imported by test. Returns placeholder data (health=0.75) |
| `universal-registry-bridge.ts` | 344 | External agent registry loader (file/HTTP/npm) | Zero imports anywhere |
| `universal-librarian-consultation.ts` | 381 | Consultation system for architectural changes | Imported by `orchestrator.ts:14` but NEVER called — zero method invocations in the file body |

**Decision needed:** DELETE all four, or INVEST to wire them in.

---

## Recommendation 4: Security Files

### Keep (have consumers)
| File | Lines | Consumer |
|------|-------|---------|
| `security-hardener.ts` | 232 | `boot-orchestrator.ts:39` |
| `security-headers.ts` | ~300 | `boot-orchestrator.ts:40` |
| `security-scanner.ts` | ~600 | `enforcer-tools.server.ts` |
| `prompt-security-validator.ts` | ~400 | `enforcer-tools.server.ts` + `processor-manager.ts` |
| `security-auditor.ts` | 722 | `security-hardener.ts` + `cli/commands/security-audit.ts` |
| `comprehensive-security-audit.ts` | 1,308 | `cli/commands/security-audit.ts` |

### Delete candidates (no consumers)

| File | Lines | Notes |
|------|-------|-------|
| `security-hardening-system.ts` | 1,021 | **PARTIAL overlap** — headers/input validation/rate limiting overlap with `security-hardener.ts` + `security-headers.ts`. BUT also has **unique functionality**: AES-256-GCM encryption (`encryptData`/`decryptData`), scrypt password hashing (`hashPassword`/`verifyPassword`), CSRF token validation, typed security event system. These features exist nowhere else. |
| `security-orchestration-layer.ts` | 767 | Coordinates virtual security agents with weighted voting. Only in barrel (`security/index.ts`). Nothing imports from barrel. |
| `security-agent-coordinator.ts` | 307 | Wraps orchestration layer with agent registry. Same problem. |

**Decision needed for hardening-system:** The unique parts (encryption, hashing,
CSRF, events) are real implementations that someone built — are they needed
but unplumbed, or were they speculative? If needed, the `encryptData`/`decryptData`
utilities could be useful for state persistence, but nothing currently uses them.

**Decision needed for orchestration-layer + agent-coordinator:** DELETE or INVEST.

---

## Recommendation 5: Architect

| File | Lines | Status |
|------|-------|--------|
| `architect/architect-tools.ts` | 757 | Exports 4 analysis functions (contextAnalysis, codebaseStructure, dependencyAnalysis, architectureAssessment). Uses real delegation-system analyzers (AST parser, dependency graph builder). |
| `mcps/architect-tools.server.ts` | 775 | MCP server providing the same 4 tools with simplified inline implementations. Comment at line 205: *"This would integrate with the actual architect-tools.ts functions…"* |

The MCP server provides the same surface area but with simpler logic. The
library version produces better analysis. **Decision:** If the MCP server
is sufficient, `architect-tools.ts` is dead weight. If the deeper analysis
matters, wire the library into the MCP server and delete the inline impls.

---

## Recommendation 6: Unplumbed Processors

| File | Lines | Status |
|------|-------|--------|
| `processors/implementations/nudge-processor.ts` | 181 | Full `PostProcessor` subclass with `execute()` method. Uses `nudge-watchdog` from monitoring. NOT in any processor registration array (boot orchestrator PROCESSOR_DEFS, plugin registerAllProcessors, plugin registerAfterPostProcessors, or PostProcessor.ts maps). |

**Decision needed:** Register it or delete it. If registered, it would run
on every tool execution — is that the desired behavior?

`monitoring/nudge-watchdog.ts` (~200L) depends on nudge-processor. If nudge
goes, the watchdog goes too.

---

## Recommendation 7: Unplumbed Integrations

| File | Lines | Status |
|------|-------|--------|
| `integrations/cross-language-bridge.ts` | 391 | Full WebSocket JSON-RPC bridge for TypeScript ↔ Python IPC. Zero framework imports. No WebSocket server exists in the framework to connect to. |
| `integrations/hermes-agent/hermes-agent-integration.ts` + `index.ts` + `types.ts` | ~650 | Complete bridge with tool event hooks, quality gates, processor pipeline integration. `initializeHermesAgentIntegration()` is exported but never called. |

The Python bridge (`hermes-agent/__init__.py`, `tools.py`) and `bridge.mjs`
work as standalone tools — those should stay. The TypeScript integration
layer (`hermes-agent-integration.ts`) is the part that's unplumbed.

**Decision needed:** Delete the TS integration wrappers, or invest to wire
`initializeHermesAgentIntegration()` into the boot sequence.

---

## Recommendation 8: Transitively Dead Files

These are alive only if something else is wired in first:

| File | Lines | Depends on |
|------|-------|-----------|
| `agents/librarian-agents-updater.ts` | 447 | Dynamically imported by `PostProcessor.ts` success handler → dead unless PostProcessor runs |
| `reporting/report-formatter.ts` | ~200 | Exports `formatReport`, `formatAsMarkdown`, `formatAsHtml`. `framework-reporting-system.ts` does NOT import it — only test file does |

**Decision needed:** DELETE both.

---

## Recommendation 9: Test-Only Validation Files

| File | Lines | Why flag |
|------|-------|---------|
| `validation/session-coordination-validator.ts` | ~200 | Only imported by its own test |
| `validation/session-migration-validator.ts` | ~200 | Only imported by its own test |
| `validation/session-security-validator.ts` | ~200 | Only imported by its own test |

These may be scaffolding for future features. If the session management
system is considered stable, they're dead code.

**Decision needed:** DELETE or KEEP as future-proofing.

---

## Summary of Decisions Needed

| # | What | Candidates | Lines | Action |
|---|------|-----------|-------|--------|
| 1 | Empty/orphaned directories | api-gateway, benchmark, infrastructure, performance, testing | ~3,200 | DELETE — safe |
| 2 | PostProcessor tree | postprocessor/ (13 subdirs) | ~5,000 | DELETE or INVEST |
| 3 | Unplumbed orchestrator | 4 files | ~1,585 | DELETE or INVEST |
| 4 | Security files | 3 files | ~2,095 | DELETE (2) or PARTIAL (1 — has unique crypto) |
| 5 | architect-tools.ts | 1 file | 757 | DELETE (replaced by MCP server) |
| 6 | nudge-processor + watchdog | 2 files | ~381 | DELETE or register |
| 7 | Unplumbed integrations | 2 targets | ~1,041 | DELETE or INVEST |
| 8 | Transitively dead | 2 files | ~647 | DELETE |
| 9 | Test-only validators | 3 files | ~600 | DELETE or KEEP |

**Total lines affected: ~15,306** (11.6% of source)

---

## What Stays Unchanged

The following directories appear fully wired and should remain as-is:

- `src/core/` — Central hub, all files have consumers
- `src/plugin/` — OpenCode entry point
- `src/cli/` — User-facing binary + 30 commands
- `src/processors/` (minus nudge) — 21 registered processors
- `src/delegation/` — Agent delegation system
- `src/mcps/` — MCP client + 41 server files
- `src/enforcement/` — Codex enforcement (minus test-auto-healing)
- `src/state/` — State management
- `src/session/` — Session management
- `src/metrics/` — Agent metrics
- `src/monitoring/` (minus watchdog) — Memory, profiler, test-gen
- `src/analytics/` — All 9 files have consumers
- `src/inference/` — All 6 files have consumers
- `src/services/` — inference-tuner.ts is wired
- `src/skills/` — Filesystem-based skill registry
- `src/agents/` (minus librarian-updater) — Agent definitions
- `src/types/` — Type definitions
- `src/utils/` — Utilities
- `src/config/` — Default agents config
- `src/integrations/openclaw/` — Wired
- `src/integrations/plugins/` — Wired
- `src/validation/` (minus session validators) — Config validators
