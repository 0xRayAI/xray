# xray — MCP-Centric AI Governance OS

**v3.5.0** — 42 agents · 45 skills · 7 MCP servers · 68 codex terms · 3,226 tests

xray is the pure v2 three-subsystem AI orchestration framework — **MCP-centric**, governed by Dynamo, and autonomous via thinDispatch. Consumer `npm install 0xray` auto-wires all four platform bridges, seven MCP servers, **AGENTS.md**, and **SKILLS.md**.

## Quick Start

```bash
npm install 0xray          # postinstall: 4 bridges + 7 MCP + AGENTS.md + SKILLS.md + .mcp.json
npx 0xray status
npx 0xray setup            # optional extras
```

Per-platform (idempotent):

```bash
npx 0xray opencode install
npx 0xray grok install     # 7 MCP + dual skill sync
npx 0xray hermes install
npx 0xray openclaw install
npx 0xray skill:install
```

## Three-Subsystem Architecture

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Proposals · Reflection · Memory routing        │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex enforcement · 68 terms · SSOT            │
│  3 deliberation MCPs within 7-server surface    │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  7-flow · AsideContext · Confidence gate        │
└─────────────────────────────────────────────────┘
```

## Seven MCP Servers

| Server | Command | Role |
|--------|---------|------|
| `xray-governance` | `mcp governance` | Proposal governance, codex snapshot |
| `xray-skills` | `mcp skills` | **45 skills** + `invoke-skill` |
| `xray-orchestrator` | `mcp orchestrator` | thinDispatch, AsideContext, confidence gate |
| `xray-enforcer` | `mcp enforcer` | Codex compliance |
| `xray-researcher` | `mcp researcher` | Codebase exploration + memory routing |
| `xray-code-review` | `mcp code-review` | Code review deliberation |
| `xray-architect-tools` | `mcp architect-tools` | Architecture decisions |

Optional: **`@0xray/repertoire` MCP** for external hosts — see [Repertoire](./guides/repertoire.md).

## Agents & Skills

- **42 YML agents** — `src/opencode/agents/*.yml` — [Agents](./agents/README.md)
- **45 skills** — `src/skills/*/SKILL.md` — shipped as root [SKILLS.md](https://github.com/0xRayAI/xray/blob/main/SKILLS.md) on postinstall

## Features Since 3.1

| Version | Highlights |
|---------|------------|
| **3.4.1** | `install-bridges.cjs` postinstall, 7 MCP via `npx`, canonical `release.mjs` |
| **3.3.1** | Orchestrator confidence gate (`getTaskConfidence`) |
| **3.3.0** | Memory routing + Repertoire provider (`features.json`) |
| **3.2.0** | AsideContext wired, SelfProposalEngine, pre-tool-use hook, typecheck hardening |
| **3.1.1** | 0xRay rename, marketplace, consumer AGENTS/SKILLS seeding |

## Key integrations

| Feature | Guide |
|---------|-------|
| Platform bridges (4) | [Integrations](./guides/integrations.md) |
| `features.json` / `memory_routing` | [features.json](./guides/features-json.md) |
| Repertoire deep memory | [Repertoire](./guides/repertoire.md) |
| AsideContext subcontexts | [AsideContext](./guides/aside-context.md) |
| Full changelog | [Features Since 3.1](./guides/features-since-3.1.md) |

## Guides

- [Getting Started](./guides/getting-started.md)
- [Platform Integrations](./guides/integrations.md)
- [Features Since 3.1](./guides/features-since-3.1.md)
- [features.json Reference](./guides/features-json.md)
- [Memory Routing](./guides/memory-routing.md)
- [AsideContext](./guides/aside-context.md)
- [Repertoire Integration](./guides/repertoire.md)
- [Consumer Migration (v3.4+)](./guides/consumer-migration.md)
- [Full Reference](./full-reference.md)
- [MCP Servers](./mcp/README.md)

## License

MIT