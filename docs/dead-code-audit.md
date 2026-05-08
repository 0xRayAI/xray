# Dead Code Audit — Cross-Reference Analysis

Every confirmed-orphaned file classified by _why_ it's dead.

## Classification Legend

| Tag | Meaning |
|-----|---------|
| **REPLACED** | A newer/alive alternative exists that IS wired in |
| **STUB** | Shell/skeleton with no real implementation |
| **UNPLUMBED** | Real implementation, but integration registration was never completed |
| **UNUSED FEATURE** | Complete feature, built but never adopted into the active pipeline |

---

## Verdict Table

```
 FILE                                              LINES   STATUS         WHY
 ─────────────────────────────────────────────────────────────────────────────────
 postprocessor/ (entire tree)                      ~5000   UNUSED FEATURE  Instantiated but main loop never triggered
   PostProcessor.ts                                1630
   analysis/FailureAnalysisEngine.ts                336
   autofix/AutoFixEngine.ts + FixValidator          496
   monitoring/MonitoringEngine.ts                   170
   redeploy/RedeployCoordinator + RetryHandler      653
   escalation/EscalationEngine.ts                   633
   success/SuccessHandler.ts                        202
   triggers/GitHookTrigger + WebhookTrigger + API  1158
   services/RegressionAnalysisService.ts            200+
   validation/ComprehensiveValidator + Lightweight  200+

 security/security-hardening-system.ts             1021   PARTIAL          Headers/rate-limiting/input-validation overlap
                                                                          with security-hardener.ts + security-headers.ts
                                                                          (both wired). BUT encryption (AES-256-GCM),
                                                                          password hashing (scrypt), CSRF protection,
                                                                          and security event system EXIST ONLY HERE —
                                                                          no alive file covers them. The unique parts
                                                                          are UNPLUMBED, not replaced.

 security/security-orchestration-layer.ts           767   UNPLUMBED       Exported from barrel; no runtime path calls
                                                                          runSecurityOrchestration()

 security/security-agent-coordinator.ts             307   UNPLUMBED       Wraps orchestration layer; same problem
                                                                          runCoordinatedSecurityScan() has no caller

 orchestrator/intelligent-commit-batcher.ts         508   UNPLUMBED       Only imported by test; never plugged into
                                                                          pre‑commit / post‑commit hooks

 orchestrator/self-direction-activation.ts          352   UNPLUMBED       Self‑monitoring/evolution system; activateSelfMonitoring()
                                                                          never invoked at boot. Returns placeholder data
                                                                          (health=0.75, same critical issues every time)

 orchestrator/universal-registry-bridge.ts          344   UNPLUMBED       Zero imports from anywhere in the codebase.
                                                                          External agent registry loader (file/HTTP/npm)
                                                                          with real WebSocket + YAML parsing — no consumer

 orchestrator/universal-librarian-consultation.ts   381   UNPLUMBED       Imported but NEVER CALLED in orchestrator.ts.
                                                                          consultation() methods were meant to gate
                                                                          architectural changes — wiring never finished

 architect/architect-tools.ts                       757   REPLACED        4 tools (contextAnalysis, codebaseStructure,
                                                                          dependencyAnalysis, architectureAssessment) are
                                                                          provided by MCP server (architect-tools.server.ts)
                                                                          with simpler inline implementations. Comment at
                                                                          line 205: "This would integrate with the actual
                                                                          architect-tools.ts functions…" — never did.
                                                                          Library version uses real delegation analyzers
                                                                          (AST parser, dep graph builder); MCP server
                                                                          has simplified standalone versions.

 processors/implementations/nudge-processor.ts      181   UNPLUMBED       Not in registerBuiltInFactories() despite having
                                                                          full PostProcessor subclass + unit tests.

 agents/librarian-agents-updater.ts                 447   UNPLUMBED       Dynamically imported by PostProcessor.ts success
                                                                          handler — transitively dead. Would update AGENTS.md
                                                                          with detected frameworks/languages.

 integrations/cross-language-bridge.ts              391   UNPLUMBED       WebSocket JSON‑RPC bridge for TS ↔ Python IPC.
                                                                          Zero framework imports. No WebSocket server exists
                                                                          to connect to.

 integrations/hermes-agent/ (TS files)              650   UNPLUMBED       hermes-agent-integration.ts (615L) is a complete
                                                                          bridge with tool event hooks, quality gates,
                                                                          processor pipeline integration. But
                                                                          initializeHermesAgentIntegration() is never called.
```

---

## Category Totals

| Classification | Count | Lines |
|----------------|-------|-------|
| **UNPLUMBED**  | 10    | ~4,200 |
| **REPLACED**   | 1     | 757   |
| **PARTIAL**    | 1     | 1,021 |
| **UNUSED FEATURE** | 1 | ~5,000 |
| **STUB**       | 0     | 0 |

**Total dead lines: ~11,000** (all real implementations, no stubs)

## Updated: REPLACED vs PARTIAL

| File | Old Tag | Corrected Tag | Reason |
|------|---------|--------------|--------|
| `security/security-hardening-system.ts` | REPLACED | **PARTIAL** | Headers/rules overlap with alive files, but encryption (AES-256-GCM), password hashing (scrypt), CSRF protection, and security event system are UNIQUE — no alive file provides them. That functionality is unplumbed, not replaced. |
| `architect/architect-tools.ts` | REPLACED | **REPLACED** (confirmed) | MCP server provides the same 4 tools with inline implementations. Comment confirms integration was intended but never done. Library uses real analyzers, MCP server uses simplified versions — but the tool surface is identical. |

---

## Detailed Notes

### UNPLUMBED (10 files, ~4,200 lines)

All of these are real, working code that was built but the final
"connect this to the framework" step was never taken:

| File | What would need to happen to make it live |
|------|-------------------------------------------|
| `security-orchestration-layer.ts` | Call `runSecurityOrchestration()` from boot or a processor |
| `security-agent-coordinator.ts` | Call `runCoordinatedSecurityScan()` from boot or a processor |
| `intelligent-commit-batcher.ts` | Wire into a pre‑commit hook or processor |
| `self-direction-activation.ts` | Call `activateSelfMonitoring()` in boot sequence |
| `universal-registry-bridge.ts` | Instantiate and call from agent/delegation init |
| `universal-librarian-consultation.ts` | Call `.consultBeforeAction()` / `.consultAfterAction()` in orchestrator.ts delegate flow |
| `nudge-processor.ts` | Add factory to `registerBuiltInFactories()` in processor-manager.ts |
| `librarian-agents-updater.ts` | Would auto-live if PostProcessor loop ran |
| `cross-language-bridge.ts` | Create WebSocket server or wire into IPC path |
| `hermes-agent-integration.ts` | Call `initializeHermesAgentIntegration()` at boot, wire tool event hooks |

### REPLACED (1 file, 757 lines)

| Dead File | Alive Replacement | Notes |
|-----------|------------------|-------|
| `architect/architect-tools.ts` (757L) | `mcps/architect-tools.server.ts` (775L) | MCP server has duplicated inline implementations of the same 4 tools. Comment in .server.ts says "This would integrate with the actual architect-tools.ts functions… For now, providing a simplified implementation" — integration never happened |

### PARTIAL (1 file, 1,021 lines)

| Dead File | Notes |
|-----------|-------|
| `security/security-hardening-system.ts` | Overlaps with `security-hardener.ts` + `security-headers.ts` for headers/validation/rate-limiting. BUT also contains unique, unplumbed functionality: AES-256-GCM encryption (`encryptData`/`decryptData`), scrypt password hashing (`hashPassword`/`verifyPassword`), CSRF token validation, and security event system with typed events. These features exist NOWHERE else in the codebase. |

### UNUSED FEATURE (1 tree, ~5,000 lines)

`PostProcessor.ts` + 13 subdirectories is a standalone CI/CD automation
system that was instantiated but never invoked:

- Has its own monitoring loop, failure analysis, auto-fix engine, redeploy coordinator, escalation engine, success handler, webhook/API/git hook triggers
- `activateStringRayFramework()` (which calls `activatePostProcessor()`) is exported but **never called** by any code
- The active framework uses the much simpler `ProcessorManager` pipeline + `postprocessor-chain-validator.ts` (218 lines) instead
- If this were ever to be wired in, it would potentially replace or subsume the current processor pipeline
