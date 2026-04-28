# OpenCode Integration — Quickstart

0xRay runs as a native plugin inside OpenCode. Install it and you get 25+ agents, 60 codex rules, quality gates, and structured tool routing automatically.

## What You Get

- **25+ agents** — code-reviewer, architect, security-auditor, researcher, testing-lead, etc.
- **60 codex rules** — catches console.log, any types, missing tests, unsafe patterns
- **Quality gates** — validates code before it's written
- **Skill routing** — tasks automatically delegated to the right agent
- **MCP servers** — 40 structured tools for code analysis, formatting, testing
- **Post-processors** — auto-create tests, analyze coverage, validate config
- **Git hooks** — pre-commit validation, post-commit analytics

## Prerequisites

- Node.js >= 18
- OpenCode installed (`npm install -g opencode`)

## Install

```bash
npm install strray-ai
npx strray-ai init
```

That's it. The `init` command:

1. Creates `.opencode/strray/` with framework config
2. Creates `.opencode/agents/` with agent definitions
3. Creates `.opencode/skills/` with skill registry
4. Updates `opencode.json` to register MCP servers (preserves your existing settings)
5. Sets up git hooks for pre-commit validation

## Verify Installation

```bash
npx strray-ai status
```

You should see:

```
✅ 0xRay framework is properly configured!
   Agents: 25
   Skills: 44
   MCP Servers: 40
   Codex Terms: 60
```

## Using Agents

Invoke agents with `@agent-name` syntax in your OpenCode prompts:

```
@code-reviewer review this pull request for security issues
```

```
@architect design a REST API for user management
```

```
@security-auditor scan the authentication module
```

### Available Agents

| Agent | Purpose |
|-------|---------|
| `@code-reviewer` | Code quality assessment |
| `@architect` | System design decisions |
| `@security-auditor` | Vulnerability detection |
| `@researcher` | Codebase exploration |
| `@testing-lead` | Test strategy and creation |
| `@bug-triage-specialist` | Error investigation |
| `@refactorer` | Technical debt elimination |
| `@enforcer` | Codex compliance validation |
| `@orchestrator` | Multi-step task coordination |
| `@frontend-engineer` | React/Vue/Angular development |
| `@backend-engineer` | API and server development |
| `@devops-engineer` | CI/CD and deployment |
| `@database-engineer` | Schema and query optimization |

Full list: run `npx strray-ai capabilities`

## Automatic Routing

You don't have to specify an agent. 0xRay routes tasks automatically based on complexity:

| Complexity | Routing |
|-----------|---------|
| Simple (≤15) | Single agent handles it |
| Moderate (≤25) | Single agent with tools |
| Complex (≤50) | Multi-agent coordination |
| Enterprise (>50) | Orchestrator-led team |

The routing is based on file count, import dependencies, test coverage, and code duplication.

## Codex Enforcement

60 rules that catch common AI mistakes before they ship:

| Rule | What It Catches |
|------|----------------|
| #5 | `console.log` left in production code |
| #7 | `any` type usage |
| #13 | Missing error handling |
| #17 | Hardcoded secrets |
| #32 | Missing tests for new code |
| #45 | Unsafe type assertions |
| #58 | Missing return types |

Full list: `.opencode/strray/codex.json`

## MCP Servers

40 structured tools available to all agents:

| Server | Tools |
|--------|-------|
| `framework-help` | Framework documentation and help |
| `researcher` | Codebase search and exploration |
| `code-analyzer` | Code metrics and pattern detection |
| `lint` | Static analysis |
| `security-scan` | Vulnerability scanning |
| `boot-orchestrator` | Framework initialization |
| `enforcer-tools` | Codex validation |
| `processor-pipeline` | Data processing |
| `performance-analysis` | Performance profiling |

And 22 more domain-specific servers in `knowledge-skills/`.

## CLI Commands

```bash
# Setup
npx strray-ai install          # Full setup
npx strray-ai init              # Initialize config
npx strray-ai status            # Check configuration

# Validation
npx strray-ai health            # Health check
npx strray-ai validate          # Validate installation
npx strray-ai capabilities      # Show all features

# Skills
npx strray-ai skill:install     # Install skills
npx strray-ai skill:install <n> # Install specific skill

# MCP
npx strray-ai mcp:install       # Install community MCPs

# Operations
npx strray-ai report            # Generate reports
npx strray-ai analytics         # Pattern analytics
npx strray-ai calibrate         # Recalibrate complexity scoring
```

## Configuration

### Main Config: `.opencode/opencode.json`

0xRay adds MCP servers to your OpenCode config. The `init` command smart-merges — it replaces 0xRay entries but preserves your custom settings.

### Framework Config: `.opencode/strray/`

| File | Purpose |
|------|---------|
| `config.json` | Framework settings |
| `features.json` | Feature flags |
| `codex.json` | 60 error prevention rules |
| `agents_template.md` | Agent architecture |
| `routing-mappings.json` | Agent routing rules |

### Environment Variables

```bash
STRRAY_MODE=development        # or 'consumer'
STRRAY_LOG_LEVEL=info          # debug, info, warn, error
STRRAY_CONFIG_PATH=.opencode/  # Custom config directory
STRRAY_NO_TELEMETRY=1          # Disable analytics
```

## Git Hooks

### Install

```bash
npx strray-ai install --hooks
```

### What Runs

| Hook | What It Does |
|------|-------------|
| `pre-commit` | TypeScript check, linting, codex validation |
| `post-commit` | Activity logging, analytics |
| `pre-push` | Full validation suite |

### Manual Setup

```bash
# .git/hooks/pre-commit
#!/bin/bash
npx strray-ai validate --pre-commit
```

## Community MCPs

Install curated community MCP servers:

```bash
npx strray-ai mcp:install
```

Available sources include xmcp, github-mcp, discord-mcp, and 10 more.

## Troubleshooting

### `npx strray-ai status` shows missing components

```bash
npx strray-ai install
```

### Agents not appearing in OpenCode

Check `opencode.json` has MCP servers registered:

```bash
cat opencode.json | grep -c "mcp"
```

If zero, re-run:

```bash
npx strray-ai init
```

### Pre-commit hook fails on version compliance

The enforcer checks that version numbers are consistent. Fix:

```bash
node scripts/node/universal-version-manager.js
```

### No opencode.json found

```bash
npx strray-ai fix
```

Creates the missing config with sensible defaults.

## Architecture

```
OpenCode (CLI)
  ├── Loads opencode.json
  │     ├── Registers 0xRay MCP servers (40 tools)
  │     └── Registers skills (44)
  │           ↓
  ├── Agent invocation (@agent-name or auto-routing)
  │     ├── Codex validation (60 rules)
  │     ├── Quality gate
  │     └── Tool execution
  │           ↓
  └── Post-processing
        ├── Test auto-creation
        ├── Coverage analysis
        └── Activity logging
```

0xRay is the guardrail layer between OpenCode and your codebase. It doesn't replace OpenCode — it makes every agent that runs through it safer, more consistent, and compliance-aware.
