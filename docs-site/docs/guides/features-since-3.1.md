# Features Since 3.1

Complete reference of capabilities shipped from **3.1.0** through **3.4.1**.

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