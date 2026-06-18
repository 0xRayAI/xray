# xray — MCP-Centric AI Governance OS

**v3.4.1** — 42 agents · 45 skills · 7 MCP servers · 68 codex terms · 3,226 tests

xray is the pure v2 three-subsystem AI orchestration framework — **MCP-centric**, governed by Dynamo, and autonomous via thinDispatch. Consumer `npm install 0xray` auto-wires all four platform bridges and seven MCP servers.

## Quick Start

```bash
npm install 0xray          # postinstall: 4 bridges + 7 MCP servers + AGENTS.md + .mcp.json
npx 0xray status
npx 0xray setup            # optional extras
```

Per-platform (idempotent):

```bash
npx 0xray opencode install
npx 0xray grok install
npx 0xray hermes install
npx 0xray openclaw install
```

## Three-Subsystem Architecture

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Proposals · Reflection · Memory routing        │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex enforcement · Resonance/Isotopic · SSOT  │
│  3 deliberation MCPs within 7-server surface    │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  7-flow MCP · Delegation · Confidence gate      │
└─────────────────────────────────────────────────┘
```

## Seven MCP Servers

| Server | Role |
|--------|------|
| `xray-governance` | Proposal governance, codex snapshot |
| `xray-skills` | 45 knowledge skills |
| `xray-orchestrator` | thinDispatch, task delegation |
| `xray-enforcer` | Codex compliance |
| `xray-researcher` | Codebase exploration |
| `xray-code-review` | Code review deliberation |
| `xray-architect-tools` | Architecture decisions |

All via `npx -y 0xray mcp <cmd>`. See [MCP Servers](./mcp/README.md).

## Agents

**42 YML surfaces** in `src/opencode/agents/*.yml`. See [Agents](./agents/README.md).

## Since 3.1

- **3.4.1** — Unified 4-platform postinstall (`install-bridges.cjs`), 7-server `npx` MCP parity
- **3.3.0** — Pluggable memory routing (`features.json`)
- **3.2.0** — Typecheck hardening, orphan cleanup, full pre-tool-use hook
- **3.1.1** — 0xRay rename, marketplace files, consumer AGENTS/SKILLS seeding

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

## License

MIT