# MCP Servers

0xRay exposes **7 consumer MCP servers** on the published package surface. All run via `npx -y 0xray mcp <cmd>` — no `dist/` path hacks.

Project `.mcp.json` (written on postinstall):

```json
{
  "mcpServers": {
    "xray-governance": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "governance"],
      "env": { "XRAY_FORCE_MCP_GOVERNANCE": "true" }
    },
    "xray-skills": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "skills"]
    },
    "xray-orchestrator": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "orchestrator"]
    },
    "xray-enforcer": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "enforcer"]
    },
    "xray-researcher": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "researcher"]
    },
    "xray-code-review": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "code-review"]
    },
    "xray-architect-tools": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "architect-tools"]
    }
  }
}
```

## Server reference

| Server | Command | Role |
|--------|---------|------|
| **xray-governance** | `mcp governance` | Proposal governance, codex snapshot, Dynamo deliberation |
| **xray-skills** | `mcp skills` | 45 knowledge skills + `invoke-skill`, `list-skills` |
| **xray-orchestrator** | `mcp orchestrator` | thinDispatch 7-flow, delegation, confidence gate |
| **xray-enforcer** | `mcp enforcer` | Codex compliance, rule validation |
| **xray-researcher** | `mcp researcher` | Codebase exploration, implementation lookup |
| **xray-code-review** | `mcp code-review` | Proposal quality, code review deliberation |
| **xray-architect-tools** | `mcp architect-tools` | System design, architecture decisions |

### xray-skills tools

13 MCP tools including: `skill-code-review`, `skill-security-audit`, `skill-api-design`, `skill-database-design`, `skill-testing-strategy`, `skill-performance-optimization`, `list-skills`, `invoke-skill`, and more.

**45 knowledge skills** (`SKILL.md`) for chat-based development assistance. No external services or API keys required for the skills server.

### Governance deliberation

Three servers deliberate on proposals within the 7-server set: **code-review**, **security-audit** (via skills/enforcer), and **researcher**. Weighted voting uses the PHI/TAU matrix.

### xray-governance (advanced)

Orchestrates full proposal pipeline through code-review + security-audit + researcher + external Dynamo SSOT.

Hosted endpoint (optional): `https://governance-production-69c3.up.railway.app/mcp`

## Postinstall (v3.4.1)

`npm install 0xray` runs `install-bridges.cjs`, which:

1. Writes project `.mcp.json` (7 servers above)
2. Registers the same 7 servers in Grok plugin MCP config
3. Syncs skills to Grok, Hermes, and OpenClaw skill directories

Manual install: `npx 0xray {opencode,grok,hermes,openclaw} install` — idempotent, same outcome.

## Internal framework servers

The framework repo includes additional `.server.ts` implementations (orchestration pipelines, lint, state-manager, etc.) loaded at runtime for framework development. These are **not** part of the 7-server consumer `.mcp.json`. See [infrastructure](./infrastructure.md) for the internal inventory.

## Marketplace

0xRay is listed on the [xAI Plugin Marketplace](https://github.com/xai-org/plugin-marketplace) — one-click install for Grok users via `.grok-plugin/plugin.json`.

## Deploy Your Own

See [custom MCP server guide](./deploy-custom.md) for creating and registering custom MCP servers.