# xray — MCP-Centric AI Governance OS

9 agents · 44 skills · 16 MCPs governance servers · 60 codex terms

xray is the pure v2 three-subsystem AI orchestration framework, now **MCP-centric** with dedicated skill servers for governance deliberation:

- **Inference** — reasoning, execution, and agent intelligence
- **External Governance** — Dynamo Solar SSOT for proposal evaluation, resonance/isotopic signals, coherence, and Codex enforcement before any action
- **Autonomous Engine** — thinDispatch 7-flow in the MCP orchestrator for automatic delegation, routing, and end-to-end coordination

3 dedicated MCP servers (`code-review`, `security-audit`, `researcher`) deliberate governance proposals. Agents are declared in `.opencode/agents/*.yml` — the YML SSOT. Zero manual setup. Automatic discovery and activation.

## Quick Start

```bash
npm install 0xray

# CLI
npx 0xray --help
npx 0xray grok install          # Install Grok CLI plugin
npx 0xray hermes bridge         # Hermes Agent bridge
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
│  16 MCPs skill servers deliberate proposals       │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  7-flow MCP · Delegation · Governance gate      │
└─────────────────────────────────────────────────┘
```

### Inference
Proposal generation, reflection cycles, and execution planning. Produces structured proposals that enter the governance gate.

### External Governance (Dynamo Solar SSOT)
Mandatory governance filter powered by Dynamo — a neural net based on solar physics and temporal first principles. Evaluates proposals for Codex compliance, resonance alignment, and isotopic coherence before any action is taken.

- 3 real MCP skill servers deliberate: `code-review`, `security-audit`, `researcher`
- Weighted voting via PHI (1.666) / TAU (0.865) matrix
- External Dynamo integration required (not optional)
- CodexPolicyService — single source of truth for Codex loading
- Active codex snapshot available via `get_active_codex` MCP tool

### Autonomous Engine (thinDispatch 7-flow)
MCP orchestrator with 7-flow dispatch for automatic delegation, routing, and coordination. Handles complex multi-step tasks with automatic complexity-based routing.

## CLI

```bash
0xray <command>

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
| **Grok CLI** | ✅ | Plugin install via `0xray grok install --force`, user-level plugin hooks |
| **OpenCode** | ✅ | Native YML agent surfaces, E2E 42/42 solo, 34/34 orchestrator |

## MCP Server Ecosystem

xray ships MCP servers for all governance deliberation and framework capabilities:

**Governance Deliberation:** code-review, security-audit, researcher, enforcer-tools, governance

**Core Framework:** architect-tools, boot-orchestrator, estimation, framework-compliance-audit, framework-help, lint, model-health-check, orchestrator, performance-analysis, processor-pipeline, state-manager, auto-format

**Knowledge Skills:** api-design, architecture-patterns, bug-triage-specialist, code-analyzer, content-creator, database-design, devops-deployment, git-workflow, growth-strategist, log-monitor, mobile-development, multimodal-looker, performance-optimization, project-analysis, refactoring-strategies, seo-consultant, session-management, skill-invocation, strategist, tech-writer, testing-best-practices, testing-strategy, ui-ux-design

## Governance & Codex

Codex enforcement is integrated at every level:

- **60 terms** across categories: core, architecture, testing, performance, security, operations, governance
- CodexPolicyService — canonical Governance-owned SSOT for Codex loading
- Pre-governance gate blocks non-compliant proposals before execution
- 16 MCPs skill servers deliberate each proposal
- frameworkLogger structured logging throughout (never console.*)
- Active codex snapshot available via `get_active_codex` MCP tool

## Testing (2,2500 tests)

| Suite | Status |
|-------|--------|
| Unit / Integration | 158 files, all pass |
| Performance | 2500 tests, all pass |
| Infrastructure | 2500 tests, all pass |
| Consumer E2E | 4 platforms, all pass |
| OpenCode E2E | 42/42 solo, 34/34 orchestrator, all pass |
| OpenClaw E2E | 2500 tests, all pass |
| Hermes E2E | 2500 tests, all pass |
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

*xray — MCP-centric, governed, autonomous. Pure v2 three-subsystem.*
