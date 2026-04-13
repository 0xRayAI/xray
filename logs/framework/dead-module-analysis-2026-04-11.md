# Dead Module Analysis Report — 0xRay (`src/`)

**Date:** 2026-04-11
**Updated:** 2026-04-13 (Most cleanup completed)
**Status:** MOSTLY RESOLVED - Many dead files have been removed

---

## TRIAGE NEEDED — Do NOT Delete These Files

The following 14 MCP knowledge-skills server files are flagged as "dead" by static import analysis but are **loaded at runtime** via `createDynamicConfig()` in `mcps/config/server-config-registry.ts`. When an unknown server name is requested, the registry constructs a dynamic config pointing to `mcps/knowledge-skills/${serverName}.server.js`. **These files MUST NOT be deleted.**

| File | Dynamic Load Key |
|------|-----------------|
| `src/mcps/knowledge-skills/api-design.server.ts` | `api-design` |
| `src/mcps/knowledge-skills/architecture-patterns.server.ts` | `architecture-patterns` |
| `src/mcps/knowledge-skills/content-creator.server.ts` | `content-creator` |
| `src/mcps/knowledge-skills/database-design.server.ts` | `database-design` |
| `src/mcps/knowledge-skills/devops-deployment.server.ts` | `devops-deployment` |
| `src/mcps/knowledge-skills/git-workflow.server.ts` | `git-workflow` |
| `src/mcps/knowledge-skills/growth-strategist.server.ts` | `growth-strategist` |
| `src/mcps/knowledge-skills/mobile-development.server.ts` | `mobile-development` |
| `src/mcps/knowledge-skills/multimodal-looker.server.ts` | `multimodal-looker` |
| `src/mcps/knowledge-skills/project-analysis.server.ts` | `project-analysis` |
| `src/mcps/knowledge-skills/seo-consultant.server.ts` | `seo-consultant` |
| `src/mcps/knowledge-skills/strategist.server.ts` | `strategist` |
| `src/mcps/knowledge-skills/tech-writer.server.ts` | `tech-writer` |
| `src/mcps/knowledge-skills/testing-best-practices.server.ts` | `testing-best-practices` |
| `src/mcps/knowledge-skills/ui-ux-design.server.ts` | `ui-ux-design` |

These are subtracted from the "safe to delete" count below.

---

## Methodology

1. **File inventory:** Collected all `.ts` files under `src/`, excluding `__tests__/` directories, `types/` directories, `.d.ts` declarations, and `.test.ts` test files.

2. **Import graph construction:** For every file, extracted import targets using regex matching:
   - Static imports: `from "..."` or `from '...'`
   - Dynamic imports: `import("...")` or `import('...')`
   - Re-exports: `export ... from "..."` or `export * from "..."`
   - Relative paths resolved to `.ts` files (including `.js` → `.ts` mapping for ESM).

3. **Transitive liveness analysis (BFS):** Starting from all known entry points (see below), performed breadth-first traversal through the import graph to mark all reachable files as "alive."

4. **Test import mapping:** Separately indexed all imports made by test files under `src/__tests__/` to identify "test-only" modules.

5. **Classification:**
   - **Confirmed Dead:** Zero imports from any file (production or test).
   - **Transitively Dead:** Imported only by other dead/unreachable modules.
   - **Likely Dead (Test-only):** Imported only by test files, not by any production code.

---

## Entry Points Considered

The following files were seeded as roots for the BFS liveness traversal:

| Entry Point | Source |
|-------------|--------|
| `plugin/strray-codex-injection.ts` | `package.json` `"main"` + `"opencode"."plugin"` |
| `cli/index.ts` | `package.json` `"bin"."strray-ai"` |
| `scripts/integration.ts` | `package.json` `"bin"."strray-integration"` |
| `index.ts` | Root barrel export |
| `mcps/knowledge-skills/code-review.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/security-audit.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/performance-optimization.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/testing-strategy.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/researcher.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/framework-help.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/skill-invocation.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/session-management.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/code-analyzer.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/enforcer-tools.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/orchestrator.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/estimation.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/architect-tools.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/bug-triage-specialist.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/log-monitor.server.ts` | Registered in `server-config-registry.ts` |
| `mcps/knowledge-skills/refactoring-strategies.server.ts` | Registered in `server-config-registry.ts` |
| `cli/commands/archive-logs.ts` | Dynamic import from `cli/index.ts` |
| `cli/commands/publish-agent.ts` | Dynamic import from `cli/index.ts` |
| `cli/commands/antigravity-status.ts` | Dynamic import from `cli/index.ts` |
| `cli/commands/credible-init.ts` | Dynamic import from `cli/index.ts` |
| `cli/commands/skill-install.ts` | Dynamic import from `cli/index.ts` |
| `cli/commands/storyteller.ts` | Dynamic import from `cli/index.ts` |
| `cli/commands/plugin-commands.ts` | Dynamic import from `cli/index.ts` |
| `core/system-prompt-generator.ts` | Runtime-loaded via path string in `plugin/strray-codex-injection.ts` |

---

## CONFIRMED DEAD — Zero imports from any file (93 files)

These files have no import references anywhere in the codebase — neither from production code nor from tests.

### Agent Files (12)

Never added to the `agents/index.ts` barrel — no code path to load them.

```
/Users/blaze/dev/stringray/src/agents/backend-engineer.ts
/Users/blaze/dev/stringray/src/agents/content-creator.ts
/Users/blaze/dev/stringray/src/agents/database-engineer.ts
/Users/blaze/dev/stringray/src/agents/devops-engineer.ts
/Users/blaze/dev/stringray/src/agents/frontend-engineer.ts
/Users/blaze/dev/stringray/src/agents/frontend-ui-ux-engineer.ts
/Users/blaze/dev/stringray/src/agents/growth-strategist.ts
/Users/blaze/dev/stringray/src/agents/mobile-developer.ts
/Users/blaze/dev/stringray/src/agents/performance-engineer.ts
/Users/blaze/dev/stringray/src/agents/seo-consultant.ts
/Users/blaze/dev/stringray/src/agents/strategist.ts
/Users/blaze/dev/stringray/src/agents/tech-writer.ts
```

### Dead Barrel / Index Files (11)

Aggregate modules but are never imported by any alive module.

```
/Users/blaze/dev/stringray/src/analytics/index.ts
/Users/blaze/dev/stringray/src/hooks/index.ts
/Users/blaze/dev/stringray/src/processors/index.ts
/Users/blaze/dev/stringray/src/processors/implementations/index.ts
/Users/blaze/dev/stringray/src/session/index.ts
/Users/blaze/dev/stringray/src/validation/index.ts
/Users/blaze/dev/stringray/src/mcps/orchestrator/index.ts
/Users/blaze/dev/stringray/src/mcps/connection/index.ts
/Users/blaze/dev/stringray/src/integrations/hermes-agent/index.ts
/Users/blaze/dev/stringray/src/integrations/openclaw/index.ts
/Users/blaze/dev/stringray/src/performance/index.ts
```

### MCP Servers — Not Registered, Not Dynamically Loadable (9)

Exist as standalone MCP server files but are not referenced in `server-config-registry.ts` and are not in the `knowledge-skills/` directory (so `createDynamicConfig()` cannot find them).

```
/Users/blaze/dev/stringray/src/mcps/auto-format.server.ts
/Users/blaze/dev/stringray/src/mcps/boot-orchestrator.server.ts
/Users/blaze/dev/stringray/src/mcps/framework-compliance-audit.server.ts
/Users/blaze/dev/stringray/src/mcps/lint.server.ts
/Users/blaze/dev/stringray/src/mcps/mcp-logger.ts
/Users/blaze/dev/stringray/src/mcps/model-health-check.server.ts
/Users/blaze/dev/stringray/src/mcps/performance-analysis.server.ts
/Users/blaze/dev/stringray/src/mcps/processor-pipeline.server.ts
/Users/blaze/dev/stringray/src/mcps/security-scan.server.ts
/Users/blaze/dev/stringray/src/mcps/state-manager.server.ts
```

### MCP Knowledge-Skills Servers — Dynamically Loadable Only (14)

Flagged dead by static analysis. However, `createDynamicConfig()` in `server-config-registry.ts` can construct a config for any `mcps/knowledge-skills/${name}.server.js` at runtime. **DO NOT DELETE.** See TRIAGE NEEDED section above.

```
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/api-design.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/architecture-patterns.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/content-creator.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/database-design.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/devops-deployment.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/git-workflow.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/growth-strategist.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/mobile-development.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/multimodal-looker.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/project-analysis.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/seo-consultant.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/strategist.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/tech-writer.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/testing-best-practices.server.ts
/Users/blaze/dev/stringray/src/mcps/knowledge-skills/ui-ux-design.server.ts
```

### Other Confirmed Dead (46)

Standalone files with no import references anywhere.

```
/Users/blaze/dev/stringray/src/architect/architect-tools.ts
/Users/blaze/dev/stringray/src/benchmark/performance-benchmark.ts
/Users/blaze/dev/stringray/src/circuit-breaker/circuit-breaker.ts
/Users/blaze/dev/stringray/src/cli/commands/analytics-disable.ts
/Users/blaze/dev/stringray/src/cli/commands/analytics-enable-action.ts
/Users/blaze/dev/stringray/src/cli/commands/analytics-preview.ts
/Users/blaze/dev/stringray/src/cli/commands/analytics-status.ts
/Users/blaze/dev/stringray/src/cli/commands/status.ts
/Users/blaze/dev/stringray/src/cli/framework-console.ts
/Users/blaze/dev/stringray/src/cli/server.ts
/Users/blaze/dev/stringray/src/core/boot-phases.ts
/Users/blaze/dev/stringray/src/core/memory-monitor-setup.ts
/Users/blaze/dev/stringray/src/core/strray-init.ts
/Users/blaze/dev/stringray/src/core/tool-event-emitter.ts
/Users/blaze/dev/stringray/src/enforcement/test-auto-healing.ts
/Users/blaze/dev/stringray/src/hooks/fixes.ts
/Users/blaze/dev/stringray/src/infrastructure/iac-validator.ts
/Users/blaze/dev/stringray/src/infrastructure/schemas/cloud-schemas.ts
/Users/blaze/dev/stringray/src/integrations/core/strray-integration.ts
/Users/blaze/dev/stringray/src/integrations/cross-language-bridge.ts
/Users/blaze/dev/stringray/src/jobs/job-correlation-fix.ts
/Users/blaze/dev/stringray/src/jobs/job-correlation-manager.ts
/Users/blaze/dev/stringray/src/monitoring/activity-log-writer.ts
/Users/blaze/dev/stringray/src/monitoring/advanced-monitor.ts
/Users/blaze/dev/stringray/src/monitoring/metrics-endpoint.ts
/Users/blaze/dev/stringray/src/orchestrator/universal-registry-bridge.ts
/Users/blaze/dev/stringray/src/performance/advanced-regression-testing.ts
/Users/blaze/dev/stringray/src/plugins/plugin-manager.ts
/Users/blaze/dev/stringray/src/postprocessor/integration.ts
/Users/blaze/dev/stringray/src/postprocessor/redeploy/RetryHandler.ts
/Users/blaze/dev/stringray/src/postprocessor/services/RegressionAnalysisService.ts
/Users/blaze/dev/stringray/src/postprocessor/validation/ComprehensiveValidator.ts
/Users/blaze/dev/stringray/src/postprocessor/validation/HookMetricsCollector.ts
/Users/blaze/dev/stringray/src/postprocessor/validation/LightweightValidator.ts
/Users/blaze/dev/stringray/src/reporting/autonomous-report-generator.ts
/Users/blaze/dev/stringray/src/reporting/orchestration-flow-reporter.ts
/Users/blaze/dev/stringray/src/scripts/activate-kernel-pipeline.ts
/Users/blaze/dev/stringray/src/scripts/profiling-demo.ts
/Users/blaze/dev/stringray/src/test-utils/test-delegation-logging.ts
/Users/blaze/dev/stringray/src/test-utils/test-logging.ts
/Users/blaze/dev/stringray/src/testing/memory-regression-suite.ts
/Users/blaze/dev/stringray/src/utils/another-test.ts
/Users/blaze/dev/stringray/src/utils/batch-operations.ts
/Users/blaze/dev/stringray/src/utils/seo-utils.ts
/Users/blaze/dev/stringray/src/utils/test-template-generator.ts
/Users/blaze/dev/stringray/src/utils/token-manager.ts
```

---

## TRANSITIVELY DEAD — Imported only by other dead modules (40 files)

These files ARE imported by other `.ts` files, but ALL of their importers are themselves dead/unreachable from any entry point. Removing the confirmed-dead files above would make these files unreferenced as well.

```
/Users/blaze/dev/stringray/src/core/model-router.ts
    <- mcps/model-health-check.server.ts, utils/token-manager.ts

/Users/blaze/dev/stringray/src/delegation/ast-code-parser.ts
    <- architect/architect-tools.ts, delegation/dependency-graph-builder.ts

/Users/blaze/dev/stringray/src/delegation/codebase-context-analyzer.ts
    <- architect/architect-tools.ts, delegation/dependency-graph-builder.ts

/Users/blaze/dev/stringray/src/delegation/dependency-graph-builder.ts
    <- architect/architect-tools.ts

/Users/blaze/dev/stringray/src/enforcement/index.ts
    <- mcps/processor-pipeline.server.ts

/Users/blaze/dev/stringray/src/enforcement/loaders/index.ts
    <- enforcement/index.ts

/Users/blaze/dev/stringray/src/hooks/framework-hooks.ts
    <- hooks/index.ts

/Users/blaze/dev/stringray/src/hooks/hook-types.ts
    <- hooks/index.ts

/Users/blaze/dev/stringray/src/hooks/validation-hooks.ts
    <- hooks/index.ts

/Users/blaze/dev/stringray/src/integrations/hermes-agent/hermes-agent-integration.ts
    <- integrations/hermes-agent/index.ts

/Users/blaze/dev/stringray/src/integrations/hermes-agent/types.ts
    <- integrations/hermes-agent/hermes-agent-integration.ts, integrations/hermes-agent/index.ts

/Users/blaze/dev/stringray/src/integrations/openclaw/api-server.ts
    <- integrations/openclaw/index.ts

/Users/blaze/dev/stringray/src/integrations/openclaw/client.ts
    <- integrations/openclaw/hooks/strray-hooks.ts, integrations/openclaw/index.ts

/Users/blaze/dev/stringray/src/integrations/openclaw/config.ts
    <- integrations/openclaw/index.ts

/Users/blaze/dev/stringray/src/integrations/openclaw/hooks/strray-hooks.ts
    <- integrations/openclaw/index.ts

/Users/blaze/dev/stringray/src/integrations/openclaw/types.ts
    <- integrations/openclaw/api-server.ts, integrations/openclaw/client.ts, integrations/openclaw/config.ts

/Users/blaze/dev/stringray/src/monitoring/advanced-profiler.ts
    <- monitoring/enterprise-monitoring-system.ts, scripts/profiling-demo.ts

/Users/blaze/dev/stringray/src/monitoring/enterprise-monitoring-system.ts
    <- integrations/core/strray-integration.ts, scripts/profiling-demo.ts

/Users/blaze/dev/stringray/src/performance/index.ts
    <- monitoring/metrics-endpoint.ts

/Users/blaze/dev/stringray/src/plugins/types/index.ts
    <- plugins/plugin-manager.ts

/Users/blaze/dev/stringray/src/plugins/types/plugin.types.ts
    <- plugins/types/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/agents-md-validation-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/codex-compliance-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/coverage-analysis-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/error-boundary-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/pre-validate-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/refactoring-logging-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/regression-testing-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/state-validation-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/test-auto-creation-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/test-execution-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/processors/implementations/version-compliance-processor.ts
    <- processors/implementations/index.ts

/Users/blaze/dev/stringray/src/security/examples.ts
    <- security/index.ts

/Users/blaze/dev/stringray/src/security/index.ts
    <- security/examples.ts

/Users/blaze/dev/stringray/src/security/prompt-security-validator.ts
    <- security/index.ts, security/security-scanner.ts

/Users/blaze/dev/stringray/src/security/security-middleware.ts
    <- security/index.ts

/Users/blaze/dev/stringray/src/security/security-scanner.ts
    <- security/index.ts

/Users/blaze/dev/stringray/src/utils/command-runner.ts
    <- orchestrator/intelligent-commit-batcher.ts

/Users/blaze/dev/stringray/src/validation/agent-config-validator.ts
    <- validation/index.ts

/Users/blaze/dev/stringray/src/validation/orchestration-flow-validator.ts
    <- validation/index.ts
```

---

## LIKELY DEAD — Test-only imports (22 files)

These have zero production importers but ARE referenced by test files. They may have been used in production at some point but are no longer wired into any live code path.

```
/Users/blaze/dev/stringray/src/agents/multimodal-looker.ts                    (1 test importer)
/Users/blaze/dev/stringray/src/analytics/anonymization-engine.ts              (1 test importer)
/Users/blaze/dev/stringray/src/analytics/consent-manager.ts                   (1 test importer)
/Users/blaze/dev/stringray/src/dashboards/live-metrics-collector.ts           (1 test importer)
/Users/blaze/dev/stringray/src/mcps/connection/connection-manager.ts          (1 test importer)
/Users/blaze/dev/stringray/src/mcps/connection/connection-pool.ts             (1 test importer)
/Users/blaze/dev/stringray/src/mcps/connection/mcp-connection.ts              (3 test importers)
/Users/blaze/dev/stringray/src/mcps/connection/process-spawner.ts             (2 test importers)
/Users/blaze/dev/stringray/src/ml/core/types.ts                               (1 test importer)
/Users/blaze/dev/stringray/src/orchestrator/agent-spawn-governor.ts           (1 test importer)
/Users/blaze/dev/stringray/src/orchestrator/intelligent-commit-batcher.ts     (1 test importer)
/Users/blaze/dev/stringray/src/orchestrator/self-direction-activation.ts      (1 test importer)
/Users/blaze/dev/stringray/src/performance/automated-benchmarking-suite.ts    (1 test importer)
/Users/blaze/dev/stringray/src/performance/performance-budget-enforcer.ts     (2 test importers)
/Users/blaze/dev/stringray/src/performance/performance-ci-gates.ts            (1 test importer)
/Users/blaze/dev/stringray/src/performance/performance-monitoring-dashboard.ts (1 test importer)
/Users/blaze/dev/stringray/src/performance/performance-regression-tester.ts   (2 test importers)
/Users/blaze/dev/stringray/src/performance/performance-system-orchestrator.ts (1 test importer)
/Users/blaze/dev/stringray/src/security/security-hardening-system.ts          (1 test importer)
/Users/blaze/dev/stringray/src/validation/session-coordination-validator.ts   (1 test importer)
/Users/blaze/dev/stringray/src/validation/session-migration-validator.ts      (1 test importer)
/Users/blaze/dev/stringray/src/validation/session-security-validator.ts       (1 test importer)
```

---

## ALIVE — Initially Suspected but Confirmed Alive

Several files were flagged by the initial broad scan but confirmed alive through deeper analysis:

| File | Alive Because |
|------|--------------|
| `core/boot-orchestrator.ts` | Dynamically imported by `core/strray-activation.ts` (reachable from `src/index.ts`) |
| `security/security-hardener.ts` | Imported by `core/boot-orchestrator.ts` |
| `security/security-headers.ts` | Imported by `core/boot-orchestrator.ts` |
| `monitoring/memory-monitor.ts` | Imported by `core/boot-orchestrator.ts` |
| `session/session-monitor.ts` | Imported by `core/boot-orchestrator.ts` |
| `session/session-cleanup-manager.ts` | Imported by `core/boot-orchestrator.ts` |
| `session/session-state-manager.ts` | Imported by `core/boot-orchestrator.ts` |
| `monitoring/test-auto-generation-monitor.ts` | Imported by `processors/test-auto-creation-processor.ts` (dynamically loaded by `processor-manager.ts`) |
| `agents/librarian-agents-updater.ts` | Dynamically imported by `postprocessor/PostProcessor.ts` |
| `analytics/simple-pattern-analyzer.ts` | Dynamically imported by `cli/index.ts` |
| `core/system-prompt-generator.ts` | Runtime-loaded via path string in `plugin/strray-codex-injection.ts` |
| `services/inference-tuner.ts` | Dynamically imported by `cli/index.ts` |
| `reporting/framework-reporting-system.ts` | Dynamically imported by `cli/index.ts` |

---

## Summary

| Category | Count |
|----------|-------|
| Total production `.ts` files analyzed | **344** |
| Alive (reachable from entry points) | **189** |
| **Confirmed dead** (zero imports) | **93** |
| **Transitively dead** (imported only by dead modules) | **40** |
| **Likely dead** (test-only imports) | **22** |
| **TOTAL FLAGGED** | **155** |
| Of which: MCP dynamic-loadable (DO NOT DELETE) | **14** |
| **Safe to delete after triage** | **141** |

---

## Key Patterns Observed

1. **Orphaned agent files (12):** Agent definitions never added to the `agents/index.ts` barrel — they have no code path to be loaded. These appear to be scaffolding for future agent types that were never wired up.

2. **Dead barrel files (11):** Index files that aggregate modules but are never imported by any alive module. The individual modules they export may or may not be alive through other direct imports. These are symptoms of dead sub-systems.

3. **Unregistered MCP servers (9 outside knowledge-skills):** Server files that exist but are not referenced in `server-config-registry.ts`. These appear to be abandoned server implementations that were superseded or never completed.

4. **MCP knowledge-skills dynamic-only (14):** Only loadable at runtime via `createDynamicConfig()`. Static analysis cannot see these references. **Must not be deleted.**

5. **Dead module clusters:** Entire sub-trees are unreachable:
   - `integrations/openclaw/` (5 files) — entire OpenClaw integration dead
   - `integrations/hermes-agent/` (2 files) — entire Hermes integration dead
   - `hooks/` (4 files) — entire hooks system dead
   - `jobs/` (2 files) — entire jobs module dead
   - `benchmark/` (1 file) — benchmark module dead
   - `circuit-breaker/` (1 file) — circuit breaker dead
   - `infrastructure/` (2 files) — IaC validation dead

6. **Processor implementations (11 in index.ts barrel):** Only imported through the dead `processors/implementations/index.ts` barrel. Other processor files ARE alive via direct dynamic imports from `processor-manager.ts`. The barrel is dead but some individual processors are alive through other paths.

7. **Dead CLI commands (5):** `analytics-disable.ts`, `analytics-enable-action.ts`, `analytics-preview.ts`, `analytics-status.ts`, and `status.ts` are never imported by `cli/index.ts` or any other file. These appear to be unfinished CLI subcommands.

---

## Update Notes (2026-04-13)

### Completed Cleanup ✅

Since this analysis was run, most items have been addressed:

| Item | Status | Commit |
|------|--------|--------|
| **Community skills** (1337 files) | ✅ Removed from context | f78a7b99f |
| **Skills directory restructuring** | ✅ Moved to .opencode/skills/ | f78a7b99f |
| **17 enterprise stubs** | ✅ Deleted (-7500 lines) | 05c896578 |
| **10 dead processor implementations** | ✅ Deleted | e8ad208b7 |
| **2 dead integration clusters** (openclaw, hermes-agent) | ✅ Deleted | e8ad208b7 |
| **11 dead barrel files** | ✅ Deleted | 8991709e5 |
| **7 MCP servers wired** (auto-format, boot-orchestrator, etc.) | ✅ Wired | 0f3e9df44 |
| **3 dead MCP modules** (processor-pipeline, model-health-check, mcp-logger) | ✅ Deleted | 0f3e9df44 |
| **Dead sub-systems** (jobs, circuit-breaker, infrastructure) | ✅ Deleted | 0f3e9df44 |
| **3 junk files** | ✅ Deleted | 9d412c3f5 |
| **12 broken agents** | ✅ Fixed via agent registry | 0f71c41f9 |

### Items Retained (Not Deleted) ⚠️

The following were flagged but intentionally retained:

| File/Directory | Reason |
|----------------|--------|
| **12 orphaned agents** | Now wired via agents/index.ts and opencode.json |
| **14 MCP knowledge-skills** (dynamic loadable) | Runtime-loaded via createDynamicConfig() - DO NOT DELETE |
| **inference-tuner** | Kept for future wiring |
| **security-scanner** | Kept for future wiring |
| **prompt-security-validator** | Kept, now wired (d0b5148bc) |
| **performance-regression-tester** | Kept for future wiring |
| **performance-budget-enforcer** | Kept for future wiring |
| **Dead CLI commands** (5) | NOT dead — dynamic imports in cli/index.ts (lines 592-595) |

### Restoration (2026-04-13) 🔄

The following were incorrectly deleted as "dead" but were real, functional code:

| File/Directory | Lines | Why Restored |
|----------------|-------|-------------|
| **integrations/hermes-agent/** (10 files) | ~2,895 | Real integration extending BaseIntegration, Python plugin + bridge.mjs |
| **integrations/openclaw/** (8 TS + 2 test) | ~2,366 | Full WebSocket client + API server + hooks, extends BaseIntegration |
| **integrations/hermes-agent/index.ts** | 35 | Barrel export for hermes integration |
| **integrations/openclaw/index.ts** | 399 | OpenClawIntegration class with lifecycle + MCP event wiring |
| **circuit-breaker/circuit-breaker.ts** | 477 | Real circuit breaker pattern with configurable thresholds |
| **infrastructure/iac-validator.ts** | 610 | Real zod-based IaC validation for AWS/Azure/GCP |
| **infrastructure/schemas/cloud-schemas.ts** | 589 | Real zod schemas for cloud configurations |
| **mcps/processor-pipeline.server.ts** | 706 | Real MCP server, import path fixed |
| **mcps/model-health-check.server.ts** | 271 | Real MCP server, restored with model-router dependency |
| **core/model-router.ts** | transitively dead | Dependency of model-health-check |
| **utils/token-manager.ts** | transitively dead | Dependency of model-router |

### Additional Deletions (Session 2) 🗑️

| File | Lines | Reason |
|------|-------|--------|
| src/hooks/ (4 files) | 296 | Entire hooks subsystem dead — validation-hooks duplicated processor-manager |
| src/core/boot-phases.ts | 69 | Replaced by boot-orchestrator phases |
| src/core/memory-monitor-setup.ts | 125 | Replaced by boot-orchestrator direct wiring |
| src/core/strray-init.ts | 40 | Replaced by strray-activation.ts |
| src/core/tool-event-emitter.ts | 125 | Dead singleton, activity-logger handles tool logging |
| src/plugins/ (3 files) | 535 | Replaced by plugin-server-registry.ts |
| src/cli/framework-console.ts | 28 | Wraps console.log — violates AGENTS.md |
| src/test-utils/ (2 files) | 133 | Test helpers with zero importers |
| src/analytics/predictive-analytics.ts | +130 | Enhanced with risk levels, duration estimates, agent metrics |

### Stats Update

| Original | Current |
|----------|----------|
| 155 total flagged | ~20 restored, ~110 deleted, ~25 retained |
| 141 safe to delete | ~110 confirmed dead deleted, ~15 restored, ~16 still retained |
| 93 confirmed dead | ~65 genuinely dead, ~28 restored (were misclassified) |

---

*Report generated by static import graph analysis. All paths are absolute from repository root.*
