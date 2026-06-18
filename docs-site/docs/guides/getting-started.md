# Getting Started with 0xRay

**v3.4.1** — 42 agents · 45 skills · 7 MCP servers · 68 codex terms · 3,226 tests

Welcome to 0xRay — the self-healing AI governance OS that prevents coding mistakes before they ship.

## Quick Start (zero-config)

```bash
npm install 0xray
```

Postinstall **automatically** (via `install-bridges.cjs`):

- Copies **`AGENTS.md`** (from `AGENTS-consumer.md`)
- Seeds **`.gitignore`** (if absent)
- Deploys **`.xray/`** config (`codex.json`, `features.json`, `config.json`)
- Writes **`.mcp.json`** with **7 MCP servers** (`npx -y 0xray mcp …`)
- Installs **4 bridges**: OpenCode, Grok, Hermes, OpenClaw
- Syncs **45 framework skills** to platform skill directories

```bash
npx 0xray status           # verify install
npx 0xray setup            # optional: symlinks, hook extras
```

## Manual per-platform install

Same result as postinstall — safe to re-run:

```bash
npx 0xray opencode install      # OpenCode agents + opencode.json
npx 0xray grok install          # Grok plugin + ~/.grok/skills + 7 MCP
npx 0xray hermes install        # ~/.hermes/plugins/xray-hermes
npx 0xray openclaw install      # .xray/config/openclaw.json + skills
npx 0xray skill:install         # starter skills
```

:::note
`npx 0xray hermes bridge` was removed in 3.1+. Use `hermes install`.
:::

## What is 0xRay?

0xRay provides intelligent multi-agent orchestration with automatic governance:

- **42 YML agent surfaces** for development tasks
- **68 Codex terms** for systematic error prevention
- **7 MCP servers** on the consumer surface (all via `npx`)
- **45 framework skills** for common operations
- **4 platform bridges** installed on postinstall

Every code change can be reviewed by 3 specialized AI servers before it executes. Bad proposals are blocked automatically.

## Seven MCP Servers

Configured in your project `.mcp.json`:

| Server | `npx 0xray mcp` command |
|--------|-------------------------|
| `xray-governance` | `governance` |
| `xray-skills` | `skills` |
| `xray-orchestrator` | `orchestrator` |
| `xray-enforcer` | `enforcer` |
| `xray-researcher` | `researcher` |
| `xray-code-review` | `code-review` |
| `xray-architect-tools` | `architect-tools` |

See [MCP Servers](../mcp/README.md) for details.

## Key Concepts

| Concept | Description |
|---------|-------------|
| Agents | 42 YML surfaces in `src/opencode/agents/` |
| Skills | 45 reusable capability modules (`SKILL.md`) |
| MCP Servers | 7 consumer servers via `npx -y 0xray mcp` |
| Codex | 68-term error prevention rules |
| Governance | 3-layer deliberation pipeline (Dynamo SSOT) |
| Memory Routing | Optional provider enrichment (v3.3) |

## Memory Routing (optional)

If you use Repertoire or another provider, configure `.xray/features.json`:

```json
"memory_routing": {
  "enabled": true,
  "provider": "repertoire",
  "module_path": "<path-to-provider>"
}
```

See [Memory Routing](./memory-routing.md).

## Next Steps

- [Architecture Overview](../architecture/) — System design
- [Agent Documentation](../agents/) — All 42 agents
- [MCP Servers](../mcp/) — 7-server consumer surface
- [Consumer Migration](./consumer-migration.md) — v3.4+ integrators
- [Full Reference](../full-reference) — Complete documentation