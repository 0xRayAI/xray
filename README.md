# xray — Self-Healing AI Governance OS

**v1.22.67** — 42 agents · 44 skills · 41 MCP servers · 60 codex terms · 2,229 tests

xray is the pure v2 three-subsystem AI orchestration framework:

- **Inference** — reasoning, execution, and agent intelligence
- **External Governance** — Dynamo Solar SSOT for proposal evaluation, resonance/isotopic signals, coherence, and Codex enforcement before any action
- **Autonomous Engine** — thinDispatch 7-flow in the MCP orchestrator for automatic delegation, routing, and end-to-end coordination

Agents are declared in `.opencode/agents/*.yml` — the YML SSOT. Zero manual setup. Automatic discovery and activation.

## Quick Start

```bash
npm install strray-ai

# CLI
npx strray-ai --help
npx strray-ai grok install          # Install Grok CLI plugin
npx strray-ai hermes bridge         # Hermes Agent bridge
```

The installation seeds YML surfaces and MCP servers. Place agent definitions in `.opencode/agents/` — they are live immediately.

## Three-Subsystem Architecture

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Proposals · Reflection · Execution             │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex enforcement · Resonance/Isotopic · SSOT  │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  7-flow MCP · Delegation · Governance gate      │
└─────────────────────────────────────────────────┘
```

### Inference
Proposal generation, reflection cycles, and execution planning. Produces structured proposals that enter the governance gate.

### External Governance (Dynamo Solar SSOT)
Mandatory governance filter powered by Dynamo — a neural net based on solar physics and temporal first principles. Evaluates proposals for Codex compliance, resonance alignment, and isotopic coherence before any action is taken.

- Weighted voting via PHI (1.666) / TAU (0.865) matrix
- 3 real MCP skills deliberate (code-review, security-audit, researcher)
- External Dynamo integration required (not optional)
- CodexPolicyService — single source of truth for Codex loading

### Autonomous Engine (thinDispatch 7-flow)
MCP orchestrator with 7-flow dispatch for automatic delegation, routing, and coordination. Handles complex multi-step tasks with automatic complexity-based routing.

## CLI

```bash
strray-ai <command>

Commands:
  install         Install xray framework
  grok            Grok CLI plugin management
  hermes          Hermes Agent bridge
  integration     Integration management
  validate        Validate installation
  version         Show version
```

## Integrations

| Platform | Status | Description |
|----------|--------|-------------|
| **OpenClaw** | ✅ | API server, client, config, hooks — full integration |
| **Hermes Agent** | ✅ | Python bridge, plugin YAML, tools, schemas |
| **Grok CLI** | ✅ | Plugin install via `strray-ai grok install --force`, user-level plugin hooks |
| **OpenCode** | ✅ | Native YML agent surfaces, E2E 42/42 solo, 34/34 orchestrator |

## MCP Server Ecosystem (41 servers)

xray ships 41 MCP servers covering all skills and framework capabilities:

**Core Framework:** architect-tools, boot-orchestrator, enforcer-tools, estimation, framework-compliance-audit, framework-help, governance, lint, model-health-check, orchestrator, performance-analysis, processor-pipeline, researcher, security-scan, state-manager, auto-format

**Knowledge Skills:** api-design, architecture-patterns, bug-triage-specialist, code-analyzer, code-review, content-creator, database-design, devops-deployment, git-workflow, growth-strategist, log-monitor, mobile-development, multimodal-looker, performance-optimization, project-analysis, refactoring-strategies, security-audit, seo-consultant, session-management, skill-invocation, strategist, tech-writer, testing-best-practices, testing-strategy, ui-ux-design

**Skills Directory (44):** api-design, architect-tools, auto-format, backend-engineer, boot-orchestrator, bug-triage, code-analyzer, code-review, content-creator, database-engineer, devops-engineer, enforcer, frontend-engineer, frontend-ui-ux-engineer, git-workflow, growth-strategist, hermes-agent, inference-improve, lint, log-monitor, mobile-developer, model-health-check, multimodal-looker, orchestrator, performance-analysis, performance-engineer, performance-optimization, processor-pipeline, project-analysis, refactoring-strategies, researcher, security-audit, security-scan, seo-consultant, session-management, state-manager, storyteller, strategist, tech-writer, testing-best-practices, testing-strategy, ui-ux-design, architecture-patterns, framework-compliance-audit

## Governance & Codex

Codex enforcement is integrated at every level:

- **60 terms** across categories: core, architecture, testing, performance, security, operations, governance
- CodexPolicyService — canonical Governance-owned SSOT for Codex loading
- Pre-governance gate blocks non-compliant proposals before execution
- frameworkLogger structured logging throughout (never console.*)
- Active codex snapshot available via `get_active_codex` MCP tool

## Testing (2,229 tests)

| Suite | Status |
|-------|--------|
| Unit / Integration | 157 tests, all pass |
| Performance | 14 tests, all pass |
| Infrastructure | 19 tests, all pass |
| Consumer E2E | 4 platforms, all pass |
| OpenCode E2E | 42/42 solo, 34/34 orchestrator, all pass |
| OpenClaw E2E | 96 tests, all pass |
| Hermes E2E | 48 tests, all pass |
| Grok CLI E2E | 60/60 solo, 59/59 orchestrator, all pass |

## Release

```bash
npm run release              # patch bump
npm run release minor        # minor bump
npm run release major        # major bump
npm run release -- --dry-run # preview
```

The release pipeline: test → version:sync → build → commit → publish → push.

## License

MIT — see [LICENSE](LICENSE)

---

*xray — lean, governed, autonomous. Pure v2 three-subsystem.*
