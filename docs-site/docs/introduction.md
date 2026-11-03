# 0xRay — a suit for coding agents

**4.1** — a suit that survives the context window

![0xRay Bifrost. The suit wears the board. One card, one seat. Inbox wakes. Rules stay on.](/img/readme-hero.jpg)

Bifrost is the live board. Goggles views one plane. A search inside that card runs. A search of another plane returns the card. A path outside this checkout runs.

0xRay is a three-subsystem autonomous engine. The suit is the wear. Inference remembers. External Governance judges. The Autonomous Engine runs the work. The host you already run wears it: Grok, OpenCode, Hermes, OpenClaw, or Cursor. Memory, judgement, and payments come on with the suit. When the window closes, the next session wakes with the job, the page, and the laws. Bifrost turns each pull request, issue, and comment into one card and a line in the right seat's inbox, then wakes that seat. Confer still completes only on a real yes.

The product is the skeleton you wear.

The suit wears the three-subsystem autonomous engine (Inference · External Governance · Autonomous Engine). Ceremony **tempers** by host so free-model OpenCode/Hermes stay fully checked while a frontier host is warned. The 4.0 record is [4.0 vision](./architecture/v4-vision.md) · [4.0 handoff](./architecture/v4-now.md) · [Suit temperament](./guides/v3-temperament.md).

- **Bone:** three subsystems, Codex PreToolUse, four chat adapters plus Cursor hooks 
- **Always on:** Codex 11 / 29 / 69 — no `any`, no `eval`, no new MCP/skill/handler surface 
- **Temperament:** lead-dev intake / spawn-plan deny **required** for guided hosts; **lite** on frontier (warn, not deny) 
- **Muscle:** Repertoire auto-enables when the module resolves; session-start one-line resume 
- **Fat still called:** duplicate orchestrators and extra `*.server.ts` — [trim list](./architecture/v3-museum.md)

## Quick Start

```bash
npm install 0xray
npx 0xray wear

npx 0xray status # verify
npx 0xray setup # optional extras

# Per-platform (same bridges wear writes, idempotent)
npx 0xray opencode install
npx 0xray grok install
npx 0xray hermes install
npx 0xray openclaw install
npx 0xray skill:install
```

## How It Works

Every code change is checked against a **69-term Codex**, deliberated by **3 specialized reviewers** (code review, security audit, research), and approved, revised, or blocked before it touches your codebase.

```
┌─────────────────────────────────────────────────┐
│ Inference │
│ Reasoning · Memory routing · Execution │
├─────────────────────────────────────────────────┤
│ External Governance (Dynamo) │
│ Codex enforcement · v3 gate + CI validators │
│ 7 MCP servers (3 deliberate on proposals) │
├─────────────────────────────────────────────────┤
│ Autonomous Engine (thinDispatch) │
│ Task routing · AsideContext · Confidence gate │
└─────────────────────────────────────────────────┘
```

## What's New Since 3.1

Patch notes are in the changelog. The guide is [Features since 3.1](./guides/features-since-3.1).

## Why 0xRay?

| Problem | Solution |
|---------|----------|
| AI hallucinates bad code | Governance gate blocks non-compliant proposals |
| No quality enforcement | v3 enforcement: hooks + CI validators + governance MCP |
| Single-agent blindspots | 3 specialized reviewers debate each proposal |
| Scattered edits | Multi-agent orchestrator coordinates work |
| Repeated mistakes | Memory routing enriches selection (Repertoire organ on in 4.0) |
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
- [Bifrost](plates/bifrost) — collector board, nudges, and the seat wake
- [Consumer Migration](guides/consumer-migration) — v3.4+ integrators
- [Self-Hosting Dynamo](guides/self-hosting-dynamo) — External governance service
- [GitHub](https://github.com/0xRayAI/xray) · [npm](https://www.npmjs.com/package/0xray)
