# 0xRay 4.0 — reference

**v4.0.1** — a suit that survives the context window

Exo, not catalog. Constitution always on. Temperament by host. Four floors. Repertoire organ on.

CLI, bridges, seven MCP servers, Codex. Product thesis: [4.0 vision](./architecture/v4-vision.md). Wear: [getting started](./guides/getting-started.md).

---

## Quick Start

```bash
npm install 0xray          # postinstall: 4 bridges + 7 MCP servers + AGENTS.md + .mcp.json

npx 0xray status           # verify
npx 0xray setup            # optional extras

# Per-platform (idempotent — same as postinstall)
npx 0xray opencode install
npx 0xray grok install     # 7 MCP servers + dual skill sync
npx 0xray hermes install
npx 0xray openclaw install
npx 0xray skill:install

npx 0xray --help
```

**Requirements:** Node.js 18+, npm 9+, macOS or Linux.

---

## How It Works

0xRay uses a three-layer architecture that operates **before any code change is made**:

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Reasoning · Pattern learning · Execution       │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex enforcement · Multi-agent review · SSOT  │
│  3 MCP skill servers deliberate proposals       │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  Task routing · Multi-agent coordination        │
│  Complexity-based delegation (7-flow MCP)       │
└─────────────────────────────────────────────────┘
```

### 1. Inference Layer
Generates proposals, runs reflection cycles, and plans execution. Everything produced here enters the governance gate before any code is written.

### 2. Governance Layer (The "Gate")
Every proposal is reviewed by **3 specialized AI servers** — code review, security audit, and research — using a weighted voting system (PHI/TAU matrix) to reach a consensus. Non-compliant proposals are blocked or sent back for revision. This is powered by **Dynamo**, a neural network that evaluates codex compliance, structural coherence, and risk before any action executes.

### 3. Autonomous Engine
Routes tasks to the right agents based on complexity (simple tasks go to a single agent, enterprise-grade work triggers a full multi-agent team). Handles dependency ordering, conflict resolution, and parallel execution.

---

## Platform Installation

`npm install 0xray` runs **`install-bridges.cjs`** on postinstall (consumer projects only):

1. `AGENTS-consumer.md` → `AGENTS.md`
2. `.gitignore.default` → `.gitignore` (if absent)
3. `.xray/` config deploy (`codex.json`, `features.json`, `config.json`)
4. Project `.mcp.json` with **7 MCP servers** (`npx -y 0xray mcp …`)
5. Four bridges below + skill sync + optional git hooks

| Platform | Install Command | What It Does |
|----------|----------------|--------------|
| **OpenCode** | `npx 0xray opencode install` | Merges `opencode.json`, copies 42 YML agent surfaces |
| **Grok CLI / Build** | `npx 0xray grok install` | Plugin + `~/.grok/skills/` sync, 7 MCP servers |
| **Hermes Agent** | `npx 0xray hermes install` | `~/.hermes/plugins/xray-hermes`, consumer root marker |
| **OpenClaw** | `npx 0xray openclaw install` | `.xray/config/openclaw.json`, skill sync |

:::note
`npx 0xray hermes bridge` was removed in 3.1+. Use `hermes install`.
:::

---

## CLI Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `install` | Install & configure (auto-detects opencode, Grok, Hermes, git) |
| `setup` | Re-run full configuration if needed |
| `init` | Alias for install |
| `status` | Show framework health and configuration |
| `health` / `check` | Run health checks on all subsystems |
| `validate` | Verify installation is complete |
| `report` | Generate activity and health reports |
| `fix` | Auto-repair common issues |
| `doctor` | Diagnose issues (read-only) |
| `debug` | Print all framework paths |

### Skills

| Command | Description |
|---------|-------------|
| `skill:install` | Browse and install starter skill packs |
| `skill:install <source>` | Install skills from registry or any GitHub repo |
| `skill:registry list` | List all configured skill sources |
| `skill:registry add --name X --url Y` | Add a custom skill source |
| `skill:registry remove --name X` | Remove a skill source |

### MCP Servers (7 consumer servers)

| Command | Description |
|---------|-------------|
| `mcp governance` | Proposal governance, codex snapshot |
| `mcp skills` | 45 knowledge skills + skill invocation (13 tools) |
| `mcp orchestrator` | thinDispatch 7-flow, task delegation |
| `mcp enforcer` | Codex compliance enforcement |
| `mcp researcher` | Codebase exploration |
| `mcp code-review` | Code review deliberation |
| `mcp architect-tools` | Architecture decisions |
| `mcp:list` | Browse available community MCP servers |
| `mcp:status` | Show installed MCP servers |
| `mcp:install <name>` | Install an MCP server from the registry |
| `mcp:remove <name>` | Remove an installed MCP server |

### Platform Integration

| Command | Description |
|---------|-------------|
| `opencode install` | Install as OpenCode plugin |
| `grok install` | Install as Grok CLI plugin |
| `hermes install` | Install as Hermes Agent plugin |
| `openclaw install` | Install OpenClaw integration |

### Plugins

| Command | Description |
|---------|-------------|
| `plugin list` | List all installed plugins |
| `plugin install <name>` | Install a new plugin |
| `plugin enable <name>` | Enable a disabled plugin |
| `plugin disable <name>` | Disable a plugin without uninstalling |
| `plugin uninstall <name>` | Remove a plugin completely |

### Inference & Self-Improvement

| Command | Description |
|---------|-------------|
| `inference:run` | Run full self-improvement cycle: collect → propose → govern → verify |
| `inference:improve` | Run inference improvement cycle |
| `inference:tuner` | Start/stop the autonomous inference tuner |

### Other Commands

| Command | Description |
|---------|-------------|
| `analytics` | Pattern analysis, insights, and consent management |
| `antigravity status` | Show status of all installed skills |
| `storyteller [type]` | Generate reflections, sagas, or narratives |
| `publish-agent` | Package agents for the AgentStore |
| `credible init` | Initialize Credible Pod infrastructure (planned) |

---

## Configuration

### Feature Flags (`features.json`)

Every subsystem is configurable via `features.json` (located at `xray/features.json`):

```json
{
  "memory_routing": {
    "enabled": true,
    "provider": "repertoire"
  },
  "token_optimization": {
    "enabled": true,
    "max_context_tokens": 20000,
    "context_compression": { "enabled": true, "threshold_tokens": 15000, "compression_ratio": 0.4 }
  },
  "multi_agent_orchestration": { "enabled": true, "max_concurrent_agents": 3 },
  "autonomous_reporting": { "enabled": true, "interval_minutes": 60 },
  "security": { "enabled": true, "vulnerability_scanning": true },
  "analytics": { "enabled": true, "default_limit": 100 },
  "pattern_learning": { "enabled": true, "learning_interval_ms": 3600000 },
  "complexity_thresholds": { "simple": 15, "moderate": 25, "complex": 50, "enterprise": 100 }
}
```

Toggle any feature on/off with `enabled: true/false`. The framework reloads configuration automatically.

### Governance Setup

Governance is your quality gate. Configure it under `inference_governance` in `features.json`:

```json
{
  "inference_governance": {
    "enabled": true,
    "endpoint_url": "https://your-governance-endpoint/governance",
    "request_timeout_ms": 10000,
    "min_confidence_threshold": 0.5,
    "decision_logic": {
      "pass_confidence_min": 0.9,
      "revision_confidence_max": 0.89
    }
  }
}
```

The governance pipeline works in three stages:
1. **3 AI reviewers** (`code-review`, `security-audit`, `researcher`) analyze each proposal independently
2. **Dynamo** cross-checks against the 69-term Codex for compliance, security, and coherence
3. **Weighted voting** (PHI/TAU matrix) produces a final decision: approve, revise, or reject

> ⚠️ **Privacy Notice**: All proposals submitted to the governance endpoint are **public by default**. They are **not persisted on-chain** unless the `onChain: true` flag is set. 0xRay framework self-governance proposals (tagged `0xray`) save on-chain by default; project proposals do not. Set `onChain: false` or omit the field for non-public governance checks.

---

## Agents (organs)

**42 YML surfaces** in `src/opencode/agents/*.yml`. They are organs. The product is the exo. Core governance: `@enforcer` `@orchestrator` `@architect` `@security-auditor` `@code-reviewer` `@refactorer` `@testing-lead` `@bug-triage-specialist` `@researcher`. Full list: [Agents](./agents/README.md).

## MCP Servers

**Seven** consumer servers via `npx -y 0xray mcp <cmd>`. Extra `*.server.ts` files in the repo are not an 8th consumer MCP (Codex 69). See [MCP](./mcp/README.md).

## Skills (45)

Knowledge skills (`src/skills/*/SKILL.md`) loaded by `xray-skills`. Includes `xray-orchestrator`. `autonomy-command` is the default operating model (orchestrator skill + `lead_dev_mode`), not a 46th skill dir.

api-design, architect-tools, architecture-patterns, auto-format, backend-engineer, boot-orchestrator, bug-triage, code-analyzer, code-review, content-creator, database-engineer, devops-engineer, enforcer, framework-compliance-audit, frontend-engineer, frontend-ui-ux-engineer, git-workflow, growth-strategist, hermes-agent, inference-improve, lint, log-monitor, mobile-developer, model-health-check, multimodal-looker, orchestrator, performance-analysis, performance-engineer, performance-optimization, processor-pipeline, project-analysis, refactoring-strategies, researcher, security-audit, security-scan, seo-consultant, session-management, state-manager, storyteller, strategist, tech-writer, testing-best-practices, testing-strategy, ui-ux-design, xray-orchestrator

Install more skills: `npx 0xray skill:install`

---

## Testing & Reliability

Four-floor consumer e2e against **0xray@4.0.0**:

| Suite | Status |
|-------|--------|
| OpenCode E2E | 34/0 |
| Grok CLI E2E | 63/0 |
| Hermes E2E | 39/0/2 (npm 4.0.0 pack) |
| OpenClaw E2E | 96/0/1 (npm 4.0.0 pack) |
| Consumer smoke | `release-gate.mjs` — pack → install → 7 MCP + 4 bridges + organ on |

---

## Next Steps

```bash
# 1. Check your installation
npx 0xray status

# 2. Install skill packs (adds agent expertise)
npx 0xray skill:install

# 3. Read the station card after compact / host-swap
#    .xray/state/STATION.md

# 4. Agent surfaces
#    AGENTS.md (copied on postinstall)

# 5. Run a health check
npx 0xray health
```

---

## Resources

- **[Docs](https://0xrayai.github.io/xray/)** — Full documentation site
- **[Self-Hosting Dynamo](./guides/self-hosting-dynamo.md)** — External governance service
- **[GitHub](https://github.com/0xRayAI/xray)** — Source code, issues, discussions
- **[npm](https://www.npmjs.com/package/0xray)** — Package registry

## License

MIT

---

*0xRay — self-healing, governed, autonomous. Catch AI mistakes before they ship.*
