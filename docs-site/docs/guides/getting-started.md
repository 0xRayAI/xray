# Getting Started with 0xRay

**4.0** — a suit that survives the context window

Wear the exo. Constitution on every stroke. Temperament by host.

Wear the exo. Constitution on every stroke. Temperament by host. Four floors.

## Quick Start (zero-config)

```bash
npm install 0xray
```

Postinstall **automatically** (via `install-bridges.cjs`):

- Copies **`AGENTS.md`** (from `AGENTS-consumer.md`). Does **not** write consumer-root **`SKILLS.md`**
- Fastens **mill plant** (`mill` + `inspect`). Fasten is **foundry-plant/0**: builtin plant is mill+inspect only. `foundry.json` `"plant": "@0xray/blip"` (aliases `"plant": "blip"` / `"plant": "sound"`) fastens whatever that mill package declares (looker, vibe, mixer live in the mill). Nested mill `@0xray/foundry@0.1.12`. CLI shims `foundry blip|sound` still exist on foundry 0.1.11+. Not a 45-skill costume dump unless `foundry.json` `"costume": true`
- Seeds **`.gitignore`** (if absent)
- Deploys **`.xray/`** config (`codex.json`, `features.json`, `config.json`) then overlays **their** plant
- Writes **`.mcp.json`** with **7 MCP servers** (`npx -y 0xray mcp …`)
- Installs **4 chat bridges**: OpenCode, Grok, Hermes, OpenClaw (PPE + wiring), plus **Cursor** `.cursor/hooks.json`
- Factory shop plant (`shop-extract`, `shop-witness`, `shop-pin`) may coexist when worn. Extra shops: `foundry.json` `shopPlant`. Not costume
- **`autonomy-command`** is the default operating model (orchestrator skill + `lead_dev_mode`)
- **Mill target:** mills the consumer project, not npm global prefix or `_npx`. Isolated HOME skips machine `~/.grok`

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

## Autonomy command (default operating model)

After `npx 0xray grok install`, agents run under **[Autonomy Command](./autonomy-command.md)** by default — lead dev, phased todos, subagent dispatch, per-suite test triage. No keywords required. Slash: `/autonomy-command`

## What is 0xRay?

0xRay provides intelligent multi-agent orchestration with automatic governance:

- **42 YML agent surfaces** (organs, not the product)
- **69 Codex terms** — constitution always on
- **7 MCP servers** on the consumer surface (`npx -y 0xray mcp`)
- **Mill plant** `mill` + `inspect` (default). 45-skill catalog is costume / self-plant. **`autonomy-command`** is the default operating model
- **4 platform bridges** installed on postinstall
- **Repertoire is preferred** (vendored 0.2.5 ships on; dest = named laws)

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
| Codex | 69-term error prevention rules |
| Governance | 3-layer deliberation pipeline (Dynamo SSOT) |
| Memory Routing | **Repertoire preferred** — vendored 0.2.5 ships **on**. Dest is named laws, not `repo-*`. Station is the compact ticket. Explicit opt-out only: `"enabled": false, "provider": "repertoire"` |

## Memory Routing

**Wear Repertoire.** Shipped **on**. See [Memory Routing](./memory-routing.md) and [Repertoire](./repertoire.md).

## Next Steps

- [4.0 vision](../architecture/v4-vision.md) — exo, not catalog
- [Grok floor](../architecture/GROK_GUIDE.md)
- [Agents](../agents/README.md) — YML surfaces
- [MCP Servers](../mcp/README.md) — 7-server consumer surface
- [Consumer Migration](./consumer-migration.md)
- [Full Reference](../full-reference.md)