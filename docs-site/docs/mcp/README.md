# MCP Servers

0xRay ships two MCP (Model Context Protocol) servers. The primary user-facing one runs standalone with zero configuration.

## xray-skills (public)

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

**13 tools**: skill-code-review, skill-security-audit, skill-api-design, skill-database-design, skill-project-analysis, skill-testing-strategy, skill-performance-optimization, skill-ui-ux-design, skill-devops-deployment, skill-documentation-generation, skill-storyteller, list-skills, invoke-skill

**44 knowledge skills** (SKILL.md) for chat-based development assistance.

No external services, no API keys, no configuration needed.

## xray-governance (advanced)

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

## Internal MCP Servers (framework)

The framework also includes 15 internal `.server.js` files loaded at runtime for orchestration, enforcement, linting, state management, etc. See [MCP Server Reference](./infrastructure.md).

## Marketplace

0xRay is listed on the [xAI Plugin Marketplace](https://github.com/xai-org/plugin-marketplace) (PR #23) — one-click install for Grok users.

## Deploy Your Own

See the [custom MCP server guide](./deploy-custom) for creating, registering, and deploying custom MCP servers — either as local stdio tools or as HTTP services on Railway.
