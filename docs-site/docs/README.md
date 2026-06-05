# xray — MCP-Centric AI Governance OS

**v2.0.0** — 9 agents · 44 skills · 3 MCP governance servers · 60 codex terms · 2,822 tests

xray is the pure v2 three-subsystem AI orchestration framework, now **MCP-centric** with dedicated skill servers for governance deliberation:

- **Inference** — reasoning, execution, and agent intelligence
- **External Governance** — Dynamo Solar SSOT for proposal evaluation, resonance/isotopic signals, coherence, and Codex enforcement before any action
- **Autonomous Engine** — thinDispatch 7-flow in the MCP orchestrator for automatic delegation, routing, and end-to-end coordination

3 dedicated MCP servers (`code-review`, `security-audit`, `researcher`) deliberate governance proposals. Agents are declared in `.opencode/agents/*.yml` — the YML SSOT. Zero manual setup.

## Quick Start

```bash
npm install 0xray

# CLI
npx 0xray --help
npx 0xray grok install          # Install Grok CLI plugin
npx 0xray hermes bridge         # Hermes Agent bridge
```

## Three-Subsystem Architecture

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Proposals · Reflection · Execution             │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex enforcement · Resonance/Isotopic · SSOT  │
│  3 MCP skill servers deliberate proposals       │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  7-flow MCP · Delegation · Governance gate      │
└─────────────────────────────────────────────────┘
```

### Inference
Proposal generation, reflection cycles, and execution planning. Produces structured proposals that enter the governance gate.

### External Governance (Dynamo Solar SSOT)
Mandatory governance filter powered by Dynamo — a neural net based on solar physics and temporal first principles. Evaluates proposals for Codex compliance, resonance alignment, and isotopic coherence.

- 3 real MCP skill servers deliberate: `code-review`, `security-audit`, `researcher`
- Weighted voting via PHI (1.666) / TAU (0.865) matrix
- External Dynamo integration required (not optional)
- CodexPolicyService — single source of truth for Codex loading

### Autonomous Engine (thinDispatch 7-flow)
MCP orchestrator with 7-flow dispatch for automatic delegation, routing, and coordination.

## MCP Server Ecosystem

**Governance Deliberation:** code-review, security-audit, researcher, enforcer-tools, governance

**Core Framework:** architect-tools, boot-orchestrator, estimation, framework-compliance-audit, framework-help, lint, model-health-check, orchestrator, performance-analysis, processor-pipeline, state-manager, auto-format

**Knowledge Skills:** api-design, architecture-patterns, bug-triage-specialist, code-analyzer, content-creator, database-design, devops-deployment, git-workflow, growth-strategist, log-monitor, mobile-development, multimodal-looker, performance-optimization, project-analysis, refactoring-strategies, seo-consultant, session-management, skill-invocation, strategist, tech-writer, testing-best-practices, testing-strategy, ui-ux-design

## Agents

Agents are declared in `.opencode/agents/*.yml` YML surfaces. Zero manual setup required.

| Agent | Purpose |
|-------|---------|
| `@enforcer` | Codex compliance & error prevention |
| `@orchestrator` | Complex multi-step task coordination |
| `@architect` | System design & technical decisions |
| `@security-auditor` | Vulnerability detection |
| `@code-reviewer` | Quality assessment |
| `@refactorer` | Technical debt elimination |
| `@testing-lead` | Testing strategy |
| `@bug-triage-specialist` | Error investigation |
| `@researcher` | Codebase exploration |

## Governance & Codex

- **60 terms** across categories: core, architecture, testing, performance, security, operations, governance
- CodexPolicyService — canonical Governance-owned SSOT for Codex loading
- Pre-governance gate blocks non-compliant proposals before execution
- Active codex snapshot available via `get_active_codex` MCP tool

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

## License

MIT

---

*xray — MCP-centric, governed, autonomous. Pure v2 three-subsystem.*
