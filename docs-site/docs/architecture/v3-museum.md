# 0xRay 4.0 trim list (fat, not bone)

The **bone** is the v2 three-subsystem OS — Inference, External Governance, Autonomous Engine. 4.0 wears that bone as the engine. The suit is the wear. Do not list those subsystems as disposable. See [v3 from v2](./v3-from-v2.md).

This page is the **fat**: duplicate conductors and extra skill servers. Unused experiments are already gone. Do not grow what remains (Codex 69).

## Keep as product (the three subsystems + bridges)

| Path | Role |
|------|------|
| `src/integrations/grok/hooks/` | Grok PreToolUse / SessionStart — constitution |
| `src/integrations/hermes-agent/` | Hermes bridge |
| `src/plugin/xray-codex-injection.ts` | OpenCode gate |
| `src/integrations/openclaw/` | OpenClaw |
| `scripts/node/install-bridges.cjs` | Four-bridge postinstall |
| `src/nucleus/delegation-gate.ts` | Multi-host spawn / pending SSOT |
| `src/nucleus/suit-temperament.ts` | 4.0 profile resolution |
| 7 consumer MCP servers | Public face of the three subsystems |
| `src/mcps/orchestrator/` + `src/nucleus/thin-dispatch.ts` | **Autonomous Engine** — keep |
| `src/nucleus/confer.ts` · `synthesis.ts` | Engine ceremony — keep; temperament decides when mandatory |
| `src/governance/` · `xray/codex.json` | **External Governance** — keep |
| `src/inference/` · `src/memory-routing/` | **Inference** — keep |

## Still called

| Path | Why it stays |
|------|----------------|
| `src/postprocessor/` metamorphosis | `src/nucleus/kernel.ts` and governance still score it |
| Extra `src/processors/implementations/` | The enforcer and processor tests still import them |
| Extra `src/mcps/*.server.ts` outside the 7 | `invoke-skill` still calls them through `mcpClientManager` |
| `src/core/orchestrator.ts` + `src/orchestrator/enhanced-*.ts` | `src/index.ts`, `src/core/index.ts`, the coordinator, and integration tests still import them |

Consumer `.mcp.json` remains **seven** servers. Extra `*.server.ts` files stay unregistered. Prompt-config `src/agents/*.ts` stay as host YML companions.

## Removed, recoverable

128 paths were removed. The blobs sit on `601cdafc0`, and that commit still holds them.

```
git show 601cdafc0:PATH
git checkout 601cdafc0 -- PATH
```

**Worth** is **Grab** when a later job may want that design back, and **Shelf** when the file is history. **Superseded** is **No**, **Yes** plus the live path, or **Slice** when a live neighbor covers part of the job. Add a row in the same pass that removes a file. Keep every row. Change Superseded when a live path takes the job.

### Grab

| Removed | Worth | Superseded | Grab |
|---------|-------|------------|------|
| `api/health.ts` | Grab. Vercel routes `api/mcp.ts` only | No | `api/health.ts` |
| `monitoring/prometheus.yml`, `monitoring/alertmanager.yml` | Grab, if Prometheus returns | No | `monitoring/` |
| `src/benchmark/performance-benchmark.ts` | Grab. Last benchmark harness | No | `src/benchmark/performance-benchmark.ts` |
| `src/performance/performance-budget-enforcer.ts`, `performance-regression-tester.ts` | Grab. Harness only | Slice: `src/processors/implementations/performance-budget-processor.ts` | `src/performance/` |
| `src/infrastructure/iac-validator.ts`, `schemas/cloud-schemas.ts` | Grab. IaC check with no caller | No | `src/infrastructure/` |
| `src/public/XrayService.ts`, `src/public/index.ts` | Grab. Service sketch. Root `public/*.html` stays | Slice: package export `0xray/nucleus` | `src/public/` |
| `src/cli/server.ts` | Grab. Local HTTP server. No CLI command started it | Slice: `src/nucleus/govern-http.ts`, `src/postprocessor/triggers/APITrigger.ts`, `WebhookTrigger.ts` | `src/cli/server.ts` |
| `workflows/post-deployment-audit.yml` | Grab. Root copy | Yes: `src/opencode/workflows/post-deployment-audit.yml` | `workflows/post-deployment-audit.yml` |
| `src/orchestrator/self-direction-activation.ts`, `src/__tests__/unit/self-direction-activation.test.ts` | Grab. Class had no production caller | No | both paths |
| `src/tools/assess-complexity-tool.ts`, `query-routing-tool.ts`, and their unit tests | Grab. Wrappers | Yes: `scoreAndRoute` in `src/nucleus/thin-dispatch.ts`, map in `xray/routing-mappings.json` | `src/tools/` |
| `analytics-disable.ts`, `analytics-enable-action.ts`, `analytics-preview.ts`, `analytics-status.ts`, `src/analytics/consent-manager.ts`, and its test | Grab. Opt-in upload had no caller | Slice: `npx 0xray analytics` runs `src/analytics/simple-pattern-analyzer.ts` | those six paths |
| `src/core/trace-context.ts` | Grab. Trace sketch | No | `src/core/trace-context.ts` |
| `src/enforcement/test-auto-healing.ts` | Grab. Self-test script | Slice: rule enforcer and validators under `src/enforcement/` | `src/enforcement/test-auto-healing.ts` |
| `src/integrations/cross-language-bridge.ts` | Grab. Bridge sketch | Yes: `src/integrations/hermes-agent/bridge.mjs` | `src/integrations/cross-language-bridge.ts` |
| `CodeChangeAnalyzer.ts`, `ProcessorConfigLoader.ts`, `RetryHandler.ts`, `ComprehensiveValidator.ts` | Grab. Four postprocessor jobs | Slice: `FailureAnalysisEngine`, `RedeployCoordinator`, `LightweightValidator`, `HookMetricsCollector` | those four paths |
| `src/utils/batch-operations.ts`, `task-graph.ts`, `test-template-generator.ts`, `todo-manager.js`, `token-manager.ts` | Grab. Helpers with no importer | No | those five paths |
| `agent-config-validator.ts`, `orchestration-flow-validator.ts` | Grab | Slice: `estimation-validator.ts`, `report-content-validator.ts` | those two paths |
| `src/cli/commands/enforce.ts`, `govern.ts`, `security-audit.ts` | Grab. Command sketches. Restoring `govern.ts` does not register a command | Yes: `0xray mcp governance` and `evaluatePreToolGate` in `src/integrations/hooks/delegation-gate-runtime.mjs` | those three paths |
| `src/integrations/enforcement-gate.ts`, `src/integrations/__tests__/enforcement-gate.test.ts` | Grab. Composed ValidatorRegistry, PostProcessor, and govern | Yes: `evaluatePreToolGate` | those two paths |
| `comprehensive-security-audit.ts` and its test, `security-hardening-system.ts`, `security-orchestration-layer.ts`, `security-agent-coordinator.ts`, `src/__tests__/unit/security-encryption-fix.test.ts` | Grab. Security cluster with no suit caller | Slice: `security-auditor.ts`, `security-hardener.ts`, `security-headers.ts`, `security-scanner.ts`, `prompt-security-validator.ts` | those six paths |
| `src/testing/memory-regression-suite.ts` | Grab. Memory regression harness | No | `src/testing/memory-regression-suite.ts` |
| `src/postprocessor/integration.ts` | Grab. Express wiring into the postprocessor | Slice: the triggers and `src/nucleus/govern-http.ts` | `src/postprocessor/integration.ts` |
| `src/mcps/index.ts` | Grab as a checklist of extra servers. The consumer seven stay `XRAY_MCP_SERVERS` | Slice: `scripts/node/bridge-mcp-wiring.cjs` | `src/mcps/index.ts` |

### Shelf

| Removed | Worth | Superseded | Grab |
|---------|-------|------------|------|
| `advanced-features/analytics/predictive-analytics.ts` | Shelf | Yes: `src/analytics/predictive-analytics.ts` | that path |
| Rest of `advanced-features/` (dashboards, distributed, scaling, simulation, streaming; 26 files) | Shelf. Experiments with no production importer | No | `advanced-features/` |
| Root `skills/` (31 `SKILL.md` plus `skills/xray-orchestrator/index.ts`) | Shelf. Stale copies | Yes: `src/skills/` | `skills/` |
| `src/integrations/grok/hooks/pre-tool-use.ts` | Shelf. TypeScript twin | Yes: `src/integrations/grok/hooks/pre-tool-use.js` | that path |
| `src/delegation/task-skill-router.d.ts` | Shelf. Declaration only. `plates.cjs` still matches the words | No. Live map is `xray/routing-mappings.json` | that path |
| `src/config/routing-mappings.ts` | Shelf. A second copy forks the map | Yes: `xray/routing-mappings.json` | that path |
| `src/core/bridge.mjs` | Shelf. Separate from the Hermes bridge | Yes: `src/integrations/hermes-agent/bridge.mjs` | `src/core/bridge.mjs` |
| `src/integrations/base/ExampleIntegration.ts` | Shelf. Sample | Yes: `src/integrations/base/Integration.ts` | that path |
| `src/agents/known-names.ts` | Shelf | Yes: `src/agents/registry.ts` | that path |
| `src/mcps/connection/connection-manager.ts` and its unit test | Shelf | Yes: `src/mcps/connection/connection-pool.ts` | those two paths |
| Barrels: `src/enforcement/index.ts`, `src/enforcement/loaders/index.ts`, `src/inference/index.ts`, `src/metrics/index.ts`, `src/mcps/orchestrator/index.ts`, `src/postprocessor/metamorphosis/index.ts`, `src/security/index.ts` | Shelf. The modules they re-exported stay | No | those seven paths |
| `src/processors/implementations/session-capture-processor.ts` | Shelf | Yes: `src/inference/session-capture.ts` | that path |
| `src/orchestrator/universal-registry-bridge.ts` | Shelf | No | that path |
