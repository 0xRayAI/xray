# 0xRay — Self-Healing AI Governance OS

**v3.4.2** — 42 agents · 45 skills · 7 MCP servers · 68 codex terms · 3,226 tests

0xRay prevents AI coding mistakes before they happen. It's an intelligent governance layer between you and your AI coding tools — intercepting bad proposals, enforcing code quality rules, and orchestrating multi-agent workflows automatically.

## Quick Start

```bash
npm install 0xray          # auto: 4 bridges + 7 MCP + AGENTS.md + SKILLS.md + .mcp.json

npx 0xray status           # verify
npx 0xray setup            # optional extras

# Per-platform (same as postinstall, idempotent)
npx 0xray opencode install
npx 0xray grok install
npx 0xray hermes install
npx 0xray openclaw install
npx 0xray skill:install
```

## How It Works

Every code change is checked against a **68-term Codex**, deliberated by **3 specialized reviewers** (code review, security audit, research), and approved, revised, or blocked before it touches your codebase.

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Reasoning · Memory routing · Execution         │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex enforcement · v3 gate + CI validators    │
│  7 MCP servers (3 deliberate on proposals)      │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  Task routing · AsideContext · Confidence gate  │
└─────────────────────────────────────────────────┘
```

## What's New Since 3.1

| Version | Highlights |
|---------|------------|
| **3.4.1** | `install-bridges.cjs` on postinstall — all 4 platforms + 7 MCP via `npx`. Canonical release pipeline. |
| **3.3.1** | Orchestrator confidence gate in execution planning. |
| **3.3.0** | Pluggable memory routing — Repertoire default in framework repo. |
| **3.2.0** | AsideContext wired, SelfProposalEngine, pre-tool-use hook, typecheck hardening, Hermes/Grok E2E green. |
| **3.1.1** | StringRay → 0xRay rename, marketplace discovery, consumer AGENTS/SKILLS seeding. |

**Removed:** `hermes bridge` CLI (use `hermes install`), `.opencode/xray/` fallback, stale version JSDoc tags. `advanced-features/` decoupled from consumer boot.

## Why 0xRay?

| Problem | Solution |
|---------|----------|
| AI hallucinates bad code | Governance gate blocks non-compliant proposals |
| No quality enforcement | v3 enforcement: hooks + CI validators + governance MCP |
| Single-agent blindspots | 3 specialized reviewers debate each proposal |
| Scattered edits | Multi-agent orchestrator coordinates work |
| Repeated mistakes | Memory routing enriches selection (optional, v3.3) |
| Deep sub-tasks lose context | AsideContext subcontexts inherit session + memory routing (v3.2+) |

## Next Steps

- [Getting Started](guides/getting-started) — Installation details
- [Platform Integrations](guides/integrations) — OpenCode, Grok, Hermes, OpenClaw
- [Features Since 3.1](guides/features-since-3.1) — Full capability changelog
- [features.json](guides/features-json) — Config reference including `memory_routing`
- [AsideContext](guides/aside-context) — Orchestrator subcontexts (v3.2+)
- [Memory Routing](guides/memory-routing) — Provider plug-in model (v3.3)
- [Repertoire](guides/repertoire) — Deep memory provider + MCP tools
- [Full Reference](full-reference) — CLI, config, agents, skills
- [Consumer Migration](guides/consumer-migration) — v3.4+ integrators
- [Self-Hosting Dynamo](guides/self-hosting-dynamo) — External governance service
- [GitHub](https://github.com/0xRayAI/xray) · [npm](https://www.npmjs.com/package/0xray)