# Platform Integrations (v3.4.1)

0xRay integrates with four AI coding platforms. Consumer `npm install 0xray` runs **`install-bridges.cjs`** automatically — manual commands below are idempotent re-runs of the same steps.

## Overview

| Platform | Command | Install location | MCP servers |
|----------|---------|------------------|-------------|
| **OpenCode** | `npx 0xray opencode install` | Project `opencode.json` + `.opencode/agents/` | Via project `.mcp.json` |
| **Grok CLI / Build** | `npx 0xray grok install` | `~/.grok/plugins/0xray` + `~/.grok/skills/` | 7 servers in plugin MCP config |
| **Hermes Agent** | `npx 0xray hermes install` | `~/.hermes/plugins/xray-hermes` | Via plugin `.mcp.json` |
| **OpenClaw** | `npx 0xray openclaw install` | `.xray/config/openclaw.json` + `~/.openclaw/skills/` | Via project `.mcp.json` |

## Postinstall sequence

`scripts/node/postinstall.cjs` → `installAllBridges()`:

1. Deploy `.xray/` (`codex.json`, `features.json`, `config.json`)
2. Write project `.mcp.json` (7 servers)
3. Merge `opencode.json`, copy 42 YML agent surfaces
4. Install Grok plugin + global skill sync
5. Install Hermes plugin + `xray-consumer-root.txt` marker
6. Create OpenClaw config + skill sync
7. Copy `AGENTS-consumer.md` → `AGENTS.md`, seed `.gitignore`

## Seven MCP servers (all platforms)

```json
{
  "mcpServers": {
    "xray-governance": { "command": "npx", "args": ["-y", "0xray", "mcp", "governance"] },
    "xray-skills":       { "command": "npx", "args": ["-y", "0xray", "mcp", "skills"] },
    "xray-orchestrator": { "command": "npx", "args": ["-y", "0xray", "mcp", "orchestrator"] },
    "xray-enforcer":     { "command": "npx", "args": ["-y", "0xray", "mcp", "enforcer"] },
    "xray-researcher":   { "command": "npx", "args": ["-y", "0xray", "mcp", "researcher"] },
    "xray-code-review":  { "command": "npx", "args": ["-y", "0xray", "mcp", "code-review"] },
    "xray-architect-tools": { "command": "npx", "args": ["-y", "0xray", "mcp", "architect-tools"] }
  }
}
```

Shared constant: `XRAY_MCP_SERVERS` in `install-bridges.cjs` and `grok-cli.ts`.

## OpenCode

- Merges agent YML surfaces from package into `.opencode/agents/`
- Registers as native OpenCode plugin via `opencode.json`
- Invoke agents: `@architect`, `@enforcer`, etc.

```bash
npx 0xray opencode install
```

## Grok CLI / Grok Build (Cursor)

- Copies plugin to `~/.grok/plugins/0xray` and project `.grok/plugins/0xray`
- Syncs skills to **both** plugin dir and `~/.grok/skills/` (Grok Build agent_skills path)
- Registers 7 MCP servers in plugin config
- Marketplace: `.grok-plugin/plugin.json` + root `.mcp.json`

```bash
npm install 0xray          # postinstall handles Grok if consumer project
npx 0xray grok install    # explicit re-run / force sync
```

See [Grok Guide](../architecture/GROK_GUIDE.md).

## Hermes Agent

- Plugin at `~/.hermes/plugins/xray-hermes`
- `xray-consumer-root.txt` marker resolves consumer project root on hook invocation
- Honors `XRAY_ROOT` environment variable

```bash
npx 0xray hermes install
```

:::warning
`npx 0xray hermes bridge` was **removed** in 3.1.1. Use `hermes install`.
:::

## OpenClaw

- Creates `.xray/config/openclaw.json` with gateway, hooks, and API server defaults
- Syncs skills to `~/.openclaw/skills/`

```bash
npx 0xray openclaw install
```

## Memory routing (optional, v3.3+)

Configure in `.xray/features.json` when using Repertoire or another provider. See [Memory Routing](./memory-routing.md).

## Verify installation

```bash
npx 0xray status
npx 0xray validate
npm run release:gate    # framework repo only — full consumer smoke
```

## Related

- [Getting Started](./getting-started.md)
- [Consumer Migration](./consumer-migration.md)
- [MCP Servers](../mcp/README.md)