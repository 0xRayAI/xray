# StringRay Integration Surfaces

Every feature, agent, processor, or tool must be plumbed through at least one of these
entry or registration points to actually function at runtime. This document catalogs them all.

## ASCII Map

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           STRINGRAY FRAMEWORK                              │
│                          Entry Points & Wiring                             │
└────────────────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║                   1. RUNTIME ENTRY POINTS                             ║
  ║        Where execution starts — the "main()" of each path            ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 1A. OpenCode Plugin ──────────────────────────────────────────┐
  │  src/plugin/strray-codex-injection.ts                           │
  │  hooks: system.transform, tool.execute.before, tool.execute.after │
  │  Registers: processors (registerAllProcessors)                  │
  │  Loads: ProcessorManager, StateManager, features-config         │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 1B. CLI Binary ───────────────────────────────────────────────┐
  │  src/cli/index.ts                                               │
  │  Shebang: #!/usr/bin/env node                                   │
  │  via: package.json "bin" → strray-ai                            │
  │  Registers: 30+ Commander commands                              │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 1C. Script Integration ───────────────────────────────────────┐
  │  src/scripts/integration.ts                                     │
  │  via: package.json "bin" → strray-integration                   │
  │  Spawns OpenCode CLI with agent tasks                            │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 1D. Universal Bridge ─────────────────────────────────────────┐
  │  src/core/bridge.mjs                                            │
  │  Shebang: #!/usr/bin/env node                                   │
  │  Modes: stdin/stdout JSON, positional args, HTTP (:18431)       │
  │  Commands: health, codex-check, validate, hooks, etc.           │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 1E. Hermes Bridge ────────────────────────────────────────────┐
  │  src/integrations/hermes-agent/bridge.mjs                       │
  │  Shebang: #!/usr/bin/env node                                   │
  │  Protocol: JSON stdin/stdout (Python IPC)                       │
  │  Commands: pre-process, post-process, validate, health, etc.    │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 1F. MCP Servers ──────────────────────────────────────────────┐
  │  src/mcps/*.server.ts (16 files)                                │
  │  src/mcps/knowledge-skills/*.server.ts (25 files)               │
  │  Each: exports server.start() called at module level            │
  │  Spawned as child processes by MCPClientManager                 │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 1G. HTTP Servers ─────────────────────────────────────────────┐
  │  src/cli/server.ts – Express dashboard (:PORT)                  │
  │  src/integrations/openclaw/api-server.ts – WS/HTTP API          │
  │  src/postprocessor/triggers/APITrigger.ts – POST endpoints      │
  │  src/postprocessor/triggers/WebhookTrigger.ts – POST webhooks   │
  └─────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║                 2. PROCESSOR REGISTRATION POINTS                       ║
  ║    Processors must appear here to run during tool execution           ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 2A. Boot Orchestrator PROCESSOR_DEFS ─────────────────────────┐
  │  src/core/boot-orchestrator.ts:389-412                          │
  │  21 processors registered:                                      │
  │  PRE: preValidate, typescriptCompilation, codexCompliance,      │
  │       testAutoCreation, versionCompliance, errorBoundary,       │
  │       agentsMdValidation, logProtection, spawnGovernance,       │
  │       performanceBudget, asyncPattern, consoleLogGuard          │
  │  POST: stateValidation, testExecution, regressionTesting,       │
  │        coverageAnalysis, inferenceImprovement,                  │
  │        refactoringLogging, postProcessorChain,                  │
  │        publishPreflight, storytellingTrigger, sessionSummary    │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 2B. Plugin registerAllProcessors ─────────────────────────────┐
  │  src/plugin/strray-codex-injection.ts:669-676                   │
  │  6 processors: preValidate, codexCompliance, versionCompliance, │
  │                testAutoCreation, testExecution, coverageAnalysis │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 2C. Plugin registerAfterPostProcessors ───────────────────────┐
  │  src/plugin/strray-codex-injection.ts:678-682                   │
  │  3 processors: testAutoCreation, testExecution, coverageAnalysis│
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 2D. PostProcessor PRE_PROCESSOR_DEFAULTS + POST_PROCESSOR_MAP─┐
  │  src/postprocessor/PostProcessor.ts:882-924                     │
  │  11 processors:                                                 │
  │  PRE: preValidate, codexCompliance, testAutoCreation,           │
  │       versionCompliance, errorBoundary, agentsMdValidation      │
  │  POST: stateValidation, storytellingTrigger, sessionSummary,    │
  │        testExecution, regressionTesting, inferenceImprovement   │
  └─────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║               3. MCP SERVER REGISTRATION POINTS                       ║
  ║   MCP servers must be registered here to be discoverable/callable    ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 3A. Server Config Registry ───────────────────────────────────┐
  │  src/mcps/config/server-config-registry.ts:26-257               │
  │  28 server configs: code-review, security-audit,                │
  │  performance-optimization, testing-strategy, researcher,        │
  │  framework-help, skill-invocation, session-management,          │
  │  code-analyzer, enforcer, orchestrator, estimation-validator,   │
  │  architect, bug-triage-specialist, log-monitor, code-reviewer,  │
  │  security-auditor, refactorer, testing-lead, auto-format,       │
  │  boot-orchestrator, framework-compliance-audit, lint,           │
  │  performance-analysis, security-scan, state-manager,            │
  │  processor-pipeline, model-health-check                         │
  │  Singleton: defaultServerRegistry                               │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 3B. Plugin Server Registry ───────────────────────────────────┐
  │  src/mcps/config/plugin-server-registry.ts                      │
  │  Merges plugin-provided servers into defaultServerRegistry       │
  └─────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║                   4. CLI COMMAND REGISTRATION                         ║
  ║      Commands must be registered here to be available as CLI         ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 4A. Commander Program ────────────────────────────────────────┐
  │  src/cli/index.ts                                               │
  │  30+ commands: install, init, status, validate, debug,          │
  │  capabilities, health, report, fix, analytics, doctor,          │
  │  archive-logs, inference:improve, inference:tuner,               │
  │  inference:run, publish-agent, antigravity status,              │
  │  credible init, skill:registry, skill:install, storyteller,     │
  │  mcp-list, mcp-status, mcp-install, mcp-remove,                 │
  │  plugin (list/install/enable/disable/status/uninstall)          │
  └─────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║               5. AGENT & VALIDATOR REGISTRATION                      ║
  ║       Agents/validators must appear here to be discoverable          ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 5A. Builtin Agents ───────────────────────────────────────────┐
  │  src/agents/index.ts:24-46                                      │
  │  22 agent configs: architect, bug-triage-specialist,            │
  │  code-reviewer, security-auditor, refactorer, testing-lead,     │
  │  log-monitor, researcher, code-analyzer, backend-engineer,      │
  │  content-creator, database-engineer, devops-engineer,           │
  │  frontend-engineer, frontend-ui-ux-engineer, growth-strategist, │
  │  mobile-developer, performance-engineer, seo-consultant,        │
  │  strategist, tech-writer                                        │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 5B. Agent Registry (metadata) ────────────────────────────────┐
  │  src/agents/registry.ts:29-330+                                 │
  │  Full metadata (capabilities, capacity, expertise) per agent    │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 5C. Boot Agent Loading ───────────────────────────────────────┐
  │  src/core/boot-orchestrator.ts:483                              │
  │  loadRemainingAgents() — loads 7 agents dynamically:            │
  │  enforcer, architect, bug-triage-specialist, code-reviewer,     │
  │  security-auditor, refactorer, testing-lead                     │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 5D. Validator Registry ───────────────────────────────────────┐
  │  src/enforcement/validators/validator-registry.ts:80-118        │
  │  22 validators:                                                 │
  │  Code Quality (7): NoDuplicateCode, ContextAnalysisIntegration, │
  │    MemoryOptimization, DocumentationRequired, NoOverEngineering, │
  │    CleanDebugLogs, ConsoleLogUsage                              │
  │  Security (2): InputValidation, SecurityByDesign                │
  │  Testing (4): TestsRequired, TestCoverage, ContinuousIntegration │
  │    TestFailureReporting                                         │
  │  Architecture (13): DependencyManagement, SrcDistIntegrity,     │
  │    ImportConsistency, ModuleSystemConsistency, ErrorResolution,  │
  │    LoopSafety, StateManagementPatterns, SingleResponsibility,   │
  │    DeploymentSafety, MultiAgentEnsemble, SubstrateExternalization │
  │    FrameworkSelfValidation, EmergentImprovement                 │
  │  Reporting (2): PerformanceRegressionReporting,                 │
  │    SecurityVulnerabilityReporting                               │
  │  Singleton: globalValidatorRegistry                             │
  └─────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║              6. BARREL EXPORTS (Public API Surface)                   ║
  ║    What consumers get when they import from the framework            ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 6A. Framework Entry ──────────────────────────────────────────┐
  │  src/index.ts                                                   │
  │  Exports: StringRayOrchestrator, StringRayStateManager,         │
  │  AgentDelegator, frameworkLogger, BUILTIN_CODEX,                │
  │  defaultStringRayConfig, OpenClawIntegration,                   │
  │  initializeOpenClawIntegration, getOpenClawIntegration,         │
  │  shutdownOpenClawIntegration, initializeStringRay               │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 6B. Subsystem Barrels ────────────────────────────────────────┐
  │  src/core/index.ts          → KernelOrchestrator, config        │
  │  src/delegation/index.ts    → ComplexityAnalyzer, Delegator     │
  │  src/enforcement/index.ts   → RuleEnforcer, Validators          │
  │  src/security/index.ts      → Scanner, Auditor, Hardener        │
  │  src/session/index.ts       → Session managers                  │
  │  src/state/index.ts         → StringRayStateManager             │
  │  src/inference/index.ts     → InferenceCycle, Analyzer          │
  │  src/metrics/index.ts       → AgentMetricsSystem                │
  │  src/mcps/config/index.ts   → ServerConfigRegistry              │
  │  src/mcps/types/index.ts    → MCP types                         │
  │  src/mcps/tools/index.ts    → ToolRegistry, Discovery           │
  │  src/integrations/*/index.ts → OpenClaw, Hermes, Plugins        │
  └─────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║              7. CONFIG SCHEMAS (Runtime Configuration)               ║
  ║     Features/agents read their config from these sources             ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 7A. Runtime JSON Configs ─────────────────────────────────────┐
  │  .opencode/strray/features.json    → Feature flags (410 lines)  │
  │  .opencode/strray/config.json      → Token/cache/memory config  │
  │  .opencode/strray/integrations.json → Integration toggles      │
  │  .opencode/enforcer-config.json    → Full enforcer config       │
  │  .opencode/codex.codex            → 60 codex terms              │
  │  .opencode/strray/routing-mappings.json → 23 agent routings    │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 7B. Config Schema Definitions ────────────────────────────────┐
  │  src/core/features-config.ts     → FeaturesConfig schema (936L) │
  │  src/core/config-loader.ts       → StrRayConfig schema          │
  │  src/core/config-paths.ts        → Path resolution logic        │
  │  src/core/strray-activation.ts   → Activation config            │
  │  src/mcps/config/config-loader.ts → MCP config loading         │
  │  src/mcps/config/config-validator.ts → MCP config validation   │
  │  src/validation/agent-config-validator.ts → Agent YML schema   │
  │  src/processors/processor-interfaces.ts → Processor interfaces  │
  │  src/enforcement/types.ts        → Rule enforcement types       │
  │  src/agents/types.ts             → Agent config types           │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 7C. Filesystem Agent/Skill Configs ──────────────────────────┐
  │  .opencode/agents/*.yml    → 45 agent YAML files               │
  │  .opencode/skills/*/SKILL.md → 43 skill markdown files        │
  │  .opencode/commands/*.md   → 15 command docs                  │
  └─────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║               8. SINGLETONS & GLOBAL INSTANCES                        ║
  ║      Shared runtime state — features must hook into these            ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 8A. Core Singletons ──────────────────────────────────────────┐
  │  mcpClientManager       src/mcps/mcp-client.ts:591              │
  │  defaultServerRegistry  src/mcps/config/server-config-registry.ts:329 │
  │  processorRegistry      src/processors/processor-interfaces.ts:214   │
  │  globalValidatorRegistry src/enforcement/validators/validator-registry.ts:208 │
  │  globalIntegration      src/integrations/openclaw/index.ts:352        │
  │  featuresConfigLoader   src/core/features-config.ts                   │
  │  strRayConfigLoader     src/core/config-loader.ts                     │
  │  frameworkLogger        src/core/framework-logger.ts                  │
  └─────────────────────────────────────────────────────────────────┘

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║           9. GIT HOOKS & WORKFLOWS (External)                         ║
  ║        Pre/post commit/push hooks, CI/CD pipelines                   ║
  ╚═══════════════════════════════════════════════════════════════════════╝

  ┌─ 9A. Hooks ────────────────────────────────────────────────────┐
  │  .opencode/hooks/post-commit                                    │
  │  .opencode/hooks/post-push                                      │
  │  .git/hooks/pre-commit (installed via npx strray-ai install)    │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ 9B. Workflows ───────────────────────────────────────────────┐
  │  .opencode/workflows/post-deployment-audit.yml                  │
  │  .github/workflows/ (if any)                                    │
  └─────────────────────────────────────────────────────────────────┘
```

## Surface-By-Surface Reference

### 1. Runtime Entry Points

| Surface | File | How It Runs |
|---------|------|-------------|
| **1A. Plugin** | `src/plugin/strray-codex-injection.ts` | OpenCode loads this as a plugin. Hooks into `system.transform` (prompt injection), `tool.execute.before` (pre-process), `tool.execute.after` (post-process). Default export. |
| **1B. CLI** | `src/cli/index.ts` | `strray-ai` binary. Commander-based. Registers 30+ subcommands. Shebang + package.json bin. |
| **1C. Script Integration** | `src/scripts/integration.ts` | `strray-integration` binary. Spawns OpenCode as subprocess. Bridge for external systems. |
| **1D. Universal Bridge** | `src/core/bridge.mjs` | Standalone entry, no OpenCode required. Three modes: stdin/stdout JSON-RPC, positional args, HTTP server on 18431. |
| **1E. Hermes Bridge** | `src/integrations/hermes-agent/bridge.mjs` | Python IPC via JSON over stdin/stdout. Contains its own processor registration. |
| **1F. MCP Servers** | `src/mcps/*.server.ts` (41 files) | Each is a standalone process. `server.start()` at module level. Spawned by MCPClientManager. |
| **1G. HTTP Servers** | `cli/server.ts`, `openclaw/api-server.ts`, `postprocessor/triggers/*.ts` | Express-based HTTP endpoints. Dashboard, webhooks, API triggers. |

### 2. Processor Registration Points

A processor must appear in at least one of these arrays to run:

| Surface | File/Lines | Count | Notes |
|---------|------------|-------|-------|
| **2A. Boot Orchestrator** | `core/boot-orchestrator.ts:389-412` | 21 | Primary registration for framework self-host mode |
| **2B. Plugin (pre)** | `plugin/strray-codex-injection.ts:669-676` | 6 | Registration when running as OpenCode plugin |
| **2C. Plugin (post)** | `plugin/strray-codex-injection.ts:678-682` | 3 | Post-execution processors for plugin mode |
| **2D. PostProcessor** | `postprocessor/PostProcessor.ts:882-924` | 11 | Third registration path, overlaps with others |

**Key insight:** If a processor (like `nudge-processor`) is implemented but absent from ALL FOUR arrays, it never runs regardless of whether it's imported somewhere.

### 3. MCP Server Registration

| Surface | File | Count | Notes |
|---------|------|-------|-------|
| **3A. Server Config Registry** | `mcps/config/server-config-registry.ts` | 28 | Maps server names → command/args/env configs |
| **3B. Plugin Server Registry** | `mcps/config/plugin-server-registry.ts` | dynamic | Merges plugin-provided servers into defaults |

### 4. CLI Commands

| Surface | File | Count |
|---------|------|-------|
| **4A. Commander** | `src/cli/index.ts` | 30+ |

### 5. Agent & Validator Registration

| Surface | File | Count | Notes |
|---------|------|-------|-------|
| **5A. Builtin Agents** | `agents/index.ts:24-46` | 22 | Config objects, not runtime instances |
| **5B. Agent Registry** | `agents/registry.ts` | 20+ | Metadata (capabilities, expertise scores) |
| **5C. Boot Agent Loading** | `boot-orchestrator.ts:483` | 7 | Which agents actually get loaded at boot |
| **5D. Validator Registry** | `enforcement/validators/validator-registry.ts:80-118` | 22 | Codex enforcement validators |

### 6. Barrel Exports

32 `index.ts` files re-export subsystem components. The most important:
- `src/index.ts` — framework public API
- `src/delegation/index.ts` — delegation system
- `src/enforcement/index.ts` — enforcement system
- `src/state/index.ts` — state management

### 7. Config Schemas

The runtime reads config from:
- `features.json` (feature toggles, thresholds, limits)
- `config.json` (token/memory/cache tuning)
- `enforcer-config.json` (full enforcer configuration)
- `agent *.yml` files (per-agent configuration)
- `SKILL.md` files (skill definitions)

Config schemas are defined in `core/features-config.ts`, `validation/agent-config-validator.ts`, etc.

### 8. Global Singletons

- **`mcpClientManager`** — singleton MCP client manager
- **`defaultServerRegistry`** — singleton MCP server config registry
- **`processorRegistry`** — singleton processor registry
- **`globalValidatorRegistry`** — singleton validator registry
- **`globalIntegration`** — singleton OpenClaw integration
- **`featuresConfigLoader`** — singleton config loader
- **`frameworkLogger`** — singleton logger

### 9. Hooks & Workflows

- `.opencode/hooks/post-commit`, `post-push`
- `.opencode/workflows/post-deployment-audit.yml`

---

## Quick Reference: What to Plumb Where

| If you add... | It must be registered in... |
|---------------|----------------------------|
| **Processor** | 2A (boot) AND/OR 2B+2C (plugin) AND/OR 2D (PostProcessor) |
| **MCP Server** | 3A (server-config-registry) + 1F (.server.ts file) |
| **CLI Command** | 4A (cli/index.ts Commander) |
| **Agent Config** | 5A (agents/index.ts) + 5C (boot-orchestrator loadRemainingAgents) |
| **Validator** | 5D (validator-registry.ts registerAllValidators) |
| **Public API** | 6A (src/index.ts barrel) |
| **Feature Flag** | 7B (features-config.ts schema) + 7A (features.json toggle) |
| **Integration** | Integration registry + 2A/2B/2C if it needs processor hooks |
