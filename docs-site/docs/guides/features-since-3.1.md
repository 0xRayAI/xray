# Features Since 3.1

Complete reference of capabilities shipped from **3.1.0** through **3.5.1**.

## 3.5.1 — Multi-host delegation gate parity

| Feature | Description |
|---------|-------------|
| **Delegation gate SSOT** | `src/nucleus/delegation-gate.ts` — `evaluatePreToolGate` / `evaluatePostToolSpawn` shared across Grok, Hermes, OpenCode |
| **Hermes** | `pre_tool_call` returns `{"action":"block"}` via bridge `delegation-gate`; `post_tool_call` clears pending on `delegate_task` |
| **OpenCode** | `tool.execute.before` / `after` enforce delegation gate + post-spawn clear |
| **Verify** | `verify-delegation-gate-core.mjs` (grok/hermes/opencode); `verify-hermes-delegation-gate.mjs` bridge 4/4 |

## 3.5.0 — Auto-chain loop closure

| Feature | Description |
|---------|-------------|
| **Delegation bridge (PR1)** | `pending-delegations.json` on defer; PreToolUse surgical gate; PostToolUse observability; `delegations[]` in orchestrate response |
| **Spawn todo persistence (PR2)** | Plan enforced while todos outstanding; `spawn-todo-persistence` gate; todo `in_progress` sync; analyze intake clears stale pending |
| **`auto_chain_delegations`** | Feature flag (default on with `lead_dev_mode`); `false` disables PR1+PR2 enforcement |
| **Verify** | `verify-grok-delegation-gate.mjs` hook fixture (4/4); orchestrator behavior 8/8 |

## 3.4.10 — Routing SSOT + complexity unification

| Feature | Description |
|---------|-------------|
| **`routeSubagent` SSOT** | `selectAgentForTask` checks `routeSubagent(taskType)` before capability scoring; `type: implement` → `backend-engineer` |
| **Unified complexity** | `buildLeadDevPlan` uses `max(thin-dispatch, MCP overallComplexity)`; phased plans at complexity 70+ |
| **Behavior verify script** | `verify-orchestrator-behavior.mjs` ships in tarball — 5 assertions (routing, deferrals, NaN, phased plan) |

## 3.4.9 — Orchestrator honesty + Hermes `-z` voters

| Feature | Description |
|---------|-------------|
| **Honest `orchestrate-task`** | Implementation agents deferred (not fake-completed); `success: false` until host delegates via `Task` / `spawn_subagent` |
| **`analyze-complexity` NaN fix** | `dependencyCount` + `dependencies[]` schema; numeric hints safe |
| **Per-task lead-dev plans** | `buildLeadDevPlan` from task inputs; multi-task forces phased todos |
| **Hermes `-z` governance path** | LLM voters use `hermes -z` CLI; honors `HERMES_BIN`, `HERMES_HOME` |

## 3.4.8 — Local governance + Hermes v2 auth

| Feature | Description |
|---------|-------------|
| **Hermes v2 OAuth reader** | Governance LLM voters read `providers.xai-oauth.tokens` from `~/.hermes/auth.json` (fixes abstain for modern Hermes installs) |
| **Headless in-process deliberation** | `XRAY_GOVERNANCE_IN_PROCESS=1` enables skill voters without MCP child processes (groover deploy / nucleus consumers) |
| **Railway Streamable HTTP** | Per-session transports on hosted governance MCP |

## 3.4.7 — Consumer-safe release pipeline

| Feature | Description |
|---------|-------------|
| **Upgrade smoke in gate** | Tarball smoke preserves consumer `memory_routing` opt-ins on simulated upgrade |
| **Publish idempotency** | `release.mjs` skips publish when version already on npm; tags after publish |
| **AGENTS.md guard** | Postinstall only overwrites `AGENTS.md` when `<!-- 0xray-managed -->` marker present |

## 3.4.6 — Postinstall config merge

| Feature | Description |
|---------|-------------|
| **Consumer config merge** | Upgrade installs merge shipped `.xray` JSON into existing consumer files — opt-ins preserved, new framework keys added, `features.version` synced to package |

## 3.4.5 — Native bridge MCP wiring

| Feature | Description |
|---------|-------------|
| **bridge-mcp-wiring.cjs** | SSOT for 7-server MCP surface + repertoire auto-detect on consumer install |
| **Hermes / OpenCode / OpenClaw install** | `npx 0xray * install` wires platform registries, consumer root markers, and plugin artifacts |
| **Postinstall** | `install-bridges.cjs` calls shared wiring on `npm install 0xray` |

## 3.4.4 — Researcher MCP trap routing (P0.5)

| Feature | Description |
|---------|-------------|
| **Async provider load** | `analyze_proposal` awaits `getMemoryRoutingProvider()` — no silent MEMORY_ROUTING no-op in MCP subprocess mode |

## 3.4.3 — Shipped template truth (P0.2)

| Feature | Description |
|---------|-------------|
| **Opt-in defaults** | `memory_routing` + `inference_governance` disabled in shipped `xray/features.json` |
| **govern_proposals** | `require_external` follows `inference_governance.enabled` |
| **install-bridges** | Prefers `xray/` template over dev `.xray/` runtime copy |

## 3.4.2 — Ironclad suit enforcement

| Feature | Description |
|---------|-------------|
| **PreToolUse hook** | stdin contract, codex blocks, spawn_subagent gate, `activity.log` |
| **SessionStart + UserPromptSubmit** | `session-start.js` → `.xray/state/session-boot.json` |
| **Lead-dev plan persist** | `analyze-complexity` → `.xray/state/lead-dev-plan.json` |
| **autonomy-kernel** | Codex terms 59, 67–69; `persistLeadDevPlan()` |
| **server-config-registry** | Resolves `0xray` without requiring `xray` field in package.json |
| **package.json `xray` field** | `dist` + `mcpServersPath` for consumer registry |

## 3.4.1 — Zero-config consumer install

| Feature | Description |
|---------|-------------|
| **install-bridges.cjs** | Unified postinstall for OpenCode, Grok, Hermes, OpenClaw |
| **7 MCP via npx** | All consumer servers use `npx -y 0xray mcp <cmd>` |
| **Dual Grok skill sync** | `~/.grok/plugins/0xray/skills/` + `~/.grok/skills/` |
| **Consumer smoke gate** | `release-gate.mjs` — pack → clean install → verify bridges + MCP |
| **Canonical release.mjs** | reconcile → gate → artifacts → tag → publish |
| **Docs sync** | README, AGENTS, Docusaurus, integrations guide |

## 3.4.0 — Governance closure (tag-only)

| Feature | Description |
|---------|-------------|
| **Nucleus exports** | `0xray/nucleus` and `0xray/nucleus/*` public contract |
| **Governance default-on** | Railway endpoint integration |
| **Source-change detector** | CI governance proposals (framework repo only) |
| **verify:consumer** | 10-step E2E pipeline smoketest |
| **Term 72 audit** | Self-evolution post-apply provenance check |
| **Compat shim scanner** | Term 78 orphan pre-PR check |

## 3.3.1 — Confidence gate

| Feature | Description |
|---------|-------------|
| **ExecutionPlanner confidence gate** | `getTaskConfidence()` → complexity boost + trap hints |
| **install-bridges scaffold** | Initial 4-platform installer (completed in 3.4.1) |
| **Repertoire researcher wiring** | `researcher-confidence.ts` + integration tests |

## 3.3.0 — Pluggable memory routing

| Feature | Description |
|---------|-------------|
| **MemoryRoutingProvider** | Pluggable contract in `src/memory-routing/` |
| **features.json block** | `memory_routing` with `enabled`, `provider`, `module_path`, `config` |
| **features.schema.json** | Runtime validation at config load |
| **Repertoire provider** | Default in framework `xray/features.json` |
| **Per-task ingestFeedback** | Provider learning loop (not aggregate-only) |
| **thinDispatch enrichment** | `resolveThinDispatch()` uses provider signals |
| **Researcher enrichment** | Trap detection + MEMORY_ROUTING governance block |
| **24 integration tests** | memory-routing test suite |

## 3.2.0 — Typecheck hardening

| Feature | Description |
|---------|-------------|
| **AsideContext restored + wired** | Bounded subcontexts in MCP orchestrator (`spawnAside`, observation extractors, lifecycle) — see [AsideContext guide](./aside-context.md) |
| **AsideContext ↔ memory routing** | `ExecutionPlan.memoryContext` → `inheritedContext.memoryRouting` on aside spawn (v3.3+) |
| **Orphan cleanup** | 5 dead files deleted, ~39 integrated under typecheck |
| **58 type errors fixed** | Across 6 source files |
| **Pre-tool-use hook** | Full hook: resonance, decision-matrix, JSON output |
| **SelfProposalEngine** | Integrated under typecheck + metamorphosis types |
| **MCP base class** | Consolidated 0→40 extenders |
| **E2E green** | OpenClaw 9/9, Grok CLI 62/0, Hermes 44/0/0 |
| **release.mjs** | npm `0xray` SSOT, push to `main` |
| **JSDoc cleanup** | ~180 stale `@version` tags removed |
| **Command doc cleanup** | "xray 2.0" retired from 26 command files |

## 3.1.1 — Rename + marketplace + consumer seeding

| Feature | Description |
|---------|-------------|
| **StringRay → 0xRay** | Complete rename across package, docs, MCP |
| **Marketplace files** | `.mcp.json`, `.grok-plugin/plugin.json` for xAI catalog |
| **Consumer postinstall seed** | `AGENTS-consumer.md`, `SKILLS.md`, `.gitignore.default` |
| **ConfigLoader mcpServers** | Supports both legacy and `mcpServers` `.mcp.json` format |
| **AsideContext module** | `aside-context.ts` restored (foundation for v3.2 wiring) |
| **Plugin module split** | Codex injection split; Hermes E2E 44/0/0 |
| **Railway deployment** | MCP host, in-process skills, Hermes OAuth fixes |

### Removals (3.1.1)

- `hermes bridge` CLI → use `npx 0xray hermes install`
- `.opencode/xray/` fallback in auto-reflection-generator

## 3.1.0

| Feature | Description |
|---------|-------------|
| **Pre-publish guard** | Tolerates missing `features.json` in consumer trees |

## features.json capabilities (ongoing)

These blocks are configurable in `.xray/features.json` (deployed on postinstall):

| Block | Purpose |
|-------|---------|
| `memory_routing` | Repertoire / custom provider (v3.3+) |
| `token_optimization` | Context pruning, compression |
| `multi_agent_orchestration` | Concurrent agents, conflict resolution |
| `delegation` | Confidence threshold, intelligent routing |
| `complexity_thresholds` | thinDispatch tier boundaries |
| `pattern_learning` | Auto-apply learned patterns |
| `inference_governance` | Dynamo endpoint, proposal defaults |
| `security` | Prompt sanitization, vulnerability scanning |
| `analytics` | Complexity calibration, agent performance |
| `agent_spawn` | Rate limits, cooldowns |
| `activity_logging` | frameworkLogger file output |

See [features.json Reference](./features-json.md) and [Self-Hosting Dynamo](./self-hosting-dynamo.md) for governance blocks.

## Related

- [Repertoire Integration](./repertoire.md)
- [Memory Routing](./memory-routing.md)
- [Platform Integrations](./integrations.md)
- [Consumer Migration](./consumer-migration.md)