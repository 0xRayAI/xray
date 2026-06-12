# 0xRay — Self-Healing AI Governance OS

**v3.0.0** — 41 agents · 44 skills · 15 MCP servers · 68 codex terms · 160 test files

[![Docs](https://img.shields.io/badge/docs-0xRayAI.github.io/xray-10b981?style=flat-square)](https://0xrayai.github.io/xray/)

0xRay prevents AI coding mistakes before they happen. It's an intelligent governance layer that sits between you and your AI coding tools — intercepting bad proposals, enforcing code quality rules, and orchestrating multi-agent workflows automatically.

Every code change is checked against a **68-term Codex** (coding constitution), deliberated by specialized AI agents, and either approved, revised, or blocked before it ever touches your codebase.

Think of it as an **AI supervisor for your AI coders**: catch hallucinations, prevent slop, enforce standards — automatically.

---

## Quick Start

```bash
npm install 0xray

# Verify installation
npx 0xray status

# Install for your AI coding platform
npx 0xray opencode install      # OpenCode (most common)
npx 0xray grok install          # Grok CLI
npx 0xray hermes install        # Hermes Agent
npx 0xray openclaw install      # OpenClaw

# Install starter skills (recommended)
npx 0xray skill:install

# See all available commands
npx 0xray --help
```

**Requirements:** Node.js 18+, npm 9+, macOS or Linux.

---

## What Problem Does 0xRay Solve?

AI coding assistants are powerful but unreliable. They hallucinate APIs, introduce security vulnerabilities, violate project conventions, and make conflicting changes across files. 0xRay solves this by:

| Problem | How 0xRay Fixes It |
|---------|-------------------|
| AI hallucinates bad code | **Governance gate** blocks non-compliant proposals before execution |
| No code quality enforcement | **68-rule Codex** checks every change against your standards |
| Single-agent blindspots | **3 specialized reviewers** (code, security, research) debate each proposal |
| Scattered, conflicting edits | **Multi-agent orchestrator** coordinates work across specialists |
| Repeating the same mistakes | **Inference engine** learns patterns and prevents regressions |

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
│  15 MCP servers deliberate proposals via 3-skill governance │
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

0xRay integrates with all major AI coding platforms:

| Platform | Install Command | What It Does |
|----------|----------------|--------------|
| **OpenCode** | `npx 0xray opencode install` | Installs as native plugin, seeds YML agent surfaces, merges configuration |
| **Grok CLI** | `npx 0xray grok install` | Registers plugin + xray-skills MCP server (13 tools, 44 skills) |
| **Hermes Agent** | `npx 0xray hermes install` | Copies bridge plugin to `~/.hermes/plugins/` |
| **OpenClaw** | `npx 0xray openclaw install` | Creates integration config at `.xray/config/openclaw.json` |

Postinstall automatically registers MCP servers with Grok CLI when `grok` is available on your PATH.

---

## CLI Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `install` | Install 0xRay framework in current project |
| `setup` | Full setup: hooks, Hermes, symlinks, MCP paths |
| `init` | Install + setup (one command) |
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

### MCP Servers

| Command | Description |
|---------|-------------|
| `mcp skills` | Run the xray-skills MCP server (stdio, 13 tools) |
| `mcp governance` | Run the xray-governance MCP server (stdio, advanced) |
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
  "version": "3.0.0",
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

Governance is your quality gate. Configure it under `inference_governance` in `features.json`. The hosted Railway endpoint is available at `https://governance-production-69c3.up.railway.app/mcp`:

```json
{
  "inference_governance": {
    "enabled": true,
    "endpoint_url": "https://governance-production-69c3.up.railway.app/mcp",
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
2. **Dynamo** cross-checks against the 68-term Codex for compliance, security, and coherence
3. **Weighted voting** (PHI/TAU matrix) produces a final decision: approve, revise, or reject

**Options:** `requireExternalDynamo`, `minConfidence`, `enableSolarAdjustment`, `timeoutMs`, `maxAbstentionThreshold`.

> ⚠️ **Privacy Notice**: All proposals submitted to the governance endpoint are **public by default**. They are **not persisted on-chain** unless the `onChain: true` flag is set. 0xRay framework self-governance proposals (tagged `0xray`) save on-chain by default; project proposals do not. Set `onChain: false` or omit the field for non-public governance checks.

---

## Included Agents (41)

0xRay ships with specialized agents for every engineering domain:

| Agent | Role |
|-------|------|
| **Architect** | System design, technical decisions, architecture reviews |
| **Bug Triage Specialist** | Error investigation, root cause analysis |
| **Code Reviewer** | Code quality, best practices, style compliance |
| **Security Auditor** | Vulnerability detection, threat modeling |
| **Researcher** | Codebase exploration, pattern discovery |
| **Testing Lead** | Test strategy, coverage planning |
| **Refactorer** | Technical debt elimination, code simplification |
| **Frontend Engineer** | React, CSS, responsive design |
| **Backend Engineer** | APIs, microservices, server architecture |
| **DevOps Engineer** | CI/CD, infrastructure, deployment automation |
| **Database Engineer** | SQL/NoSQL, query optimization, data modeling |
| **Performance Engineer** | Profiling, benchmarking, optimization |
| **Mobile Developer** | iOS, Android, React Native, Flutter |
| **Content Creator** | Technical writing, docs, marketing copy |
| **Growth Strategist** | Analytics, user acquisition, conversion |
| **SEO Consultant** | Search optimization, keyword strategy |
| **Strategy Analyst** | System design, technical roadmaps |
| **Multimodal Looker** | Image, diagram, visual content analysis |
| **Code Analyzer** | Code metrics, complexity analysis |
| **Log Monitor** | Diagnostics, error pattern detection |

Plus 22 domain-specialist subagents for full-stack, database, mobile, UI/UX, and more. All agents are declared declaratively in `src/opencode/agents/*.yml` — add or customize without touching code.

---

## MCP Servers

0xRay ships two MCP servers. The primary user-facing one runs standalone with zero configuration:

### xray-skills (public)
13 tools for code review, security audit, API design, database design, testing strategy, and more. Runs via `npx`:

```json
{
  "mcpServers": {
    "xray-skills": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "skills"]
    }
  }
}
```

- **13 tools**: skill-code-review, skill-security-audit, skill-api-design, skill-database-design, skill-project-analysis, skill-testing-strategy, skill-performance-optimization, skill-ui-ux-design, skill-devops-deployment, skill-documentation-generation, skill-storyteller, list-skills, invoke-skill
- **44 knowledge skills** (SKILL.md) for chat-based development assistance
- No external services, no API keys, no configuration needed

### xray-governance (advanced)
Orchestrates proposals through code-review + security-audit + researcher + external Dynamo SSOT. Requires additional setup.

```json
{
  "mcpServers": {
    "xray-governance": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "governance"]
    }
  }
}
```

Or connect to the hosted Railway endpoint:
`https://governance-production-69c3.up.railway.app/mcp`

> **Marketplace**: 0xRay is listed on the [xAI Plugin Marketplace](https://github.com/xai-org/plugin-marketplace) (PR #23) — one-click install for Grok users.

---

## Included Skills (44)

api-design, architect-tools, architecture-patterns, auto-format, backend-engineer, boot-orchestrator, bug-triage, code-analyzer, code-review, content-creator, database-engineer, devops-engineer, enforcer, framework-compliance-audit, frontend-engineer, frontend-ui-ux-engineer, git-workflow, growth-strategist, hermes-agent, inference-improve, lint, log-monitor, mobile-developer, model-health-check, multimodal-looker, orchestrator, performance-analysis, performance-engineer, performance-optimization, processor-pipeline, project-analysis, refactoring-strategies, researcher, security-audit, security-scan, seo-consultant, session-management, state-manager, storyteller, strategist, tech-writer, testing-best-practices, testing-strategy, ui-ux-design

Install more skills anytime: `npx 0xray skill:install`

---

## Testing & Reliability

0xRay is battle-tested with **160 test files** (2,778+ individual tests) across every subsystem:

| Suite | Tests | Status |
|-------|-------|--------|
| Unit & Integration | 164 files | All pass |
| Performance | 164 files | All pass |
| Infrastructure | 164 files | All pass |
| Consumer E2E | 4 platforms | All pass |
| OpenCode E2E | 42 solo + 34 orchestrator | All pass |
| OpenClaw E2E | 99 E2E | All pass |
| Hermes E2E | 46 E2E | All pass |
| Grok CLI E2E | 56 E2E (54 passed, 2 skipped) | All pass |

---

## Next Steps

```bash
# 1. Check your installation
npx 0xray status

# 2. Install skill packs (adds agent expertise)
npx 0xray skill:install

# 3. Configure governance (optional)
# Edit xray/features.json

# 4. View full agent documentation
less AGENTS.md

# 5. Run a health check
npx 0xray health
```

---

## Resources

- **[AGENTS.md](AGENTS.md)** — Full agent reference, subsystem deep dive, operating model
- **[CHANGELOG.md](CHANGELOG.md)** — Version history and release notes
- **[docs/](docs/)** — Architecture docs, governance model, integration guides
- **[Docs](https://0xrayai.github.io/xray/)** — Full documentation site
- **[Dynamo Governance](https://0xrayai.github.io/xray/docs/guides/self-hosting-dynamo)** — External governance service (self-host your own instance — see docs)
- **[GitHub](https://github.com/0xRayAI/xray)** — Source code, issues, discussions
- **[npm](https://www.npmjs.com/package/0xray)** — Package registry

## License

MIT — see [LICENSE](LICENSE)

---

*0xRay — self-healing, governed, autonomous. Catch AI mistakes before they ship.*
