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

| Version | Highlights |
|---------|------------|
| **4.1.5** | Notes for Dist. package.json stays 4.1.4 until that publish. A prompt pulse spins only the named card. Seen is not working. Tandem is several tracks at once. A card carries raci. A missed /healthz replaces the one replica. The OP cycle is digest, card, do, loop, ship. |
| **4.1.4** | Node is 24.22.1. Review verdicts are PASS or FIX. The roster chip is the seat name. The header says Refreshed for the page pull. The light says Last activity for the newest GitHub event. A noop wake 409 is skipped. |
| **4.1.0** | Bifrost is the collector board. A cloud agent is a board row. A stuck card's L1 stays with the owner. Goggles views one plane. The card is in LENS.md. A search runs inside that card. |
| **4.0.43** | Confer completes only on a real PASS. Cursor gate events fail closed, except EACCES when a cloud wrapper cannot write dest. |
| **4.0.42** | Confer votes. Burst runs the swarm. |
| **4.0.9** | Mill target: postinstall does not mill npm global prefix or `_npx` as a consumer. Isolated HOME skips machine `~/.grok`. |
| **4.0.0** | Exo + temperament. Constitution always on. Repertoire organ on (vendored 0.2). **On npm.** [vision](./architecture/v4-vision.md) |
| **3.4.1** | `install-bridges.cjs` on postinstall — all 4 platforms + 7 MCP via `npx`. Canonical release pipeline. |
| **3.3.1** | Orchestrator confidence gate in execution planning. |
| **3.3.0** | Pluggable memory routing — Repertoire default in framework repo. |
| **3.2.0** | AsideContext wired, SelfProposalEngine, pre-tool-use hook, typecheck hardening, Hermes/Grok E2E green. |
| **3.1.1** | StringRay → 0xRay rename, marketplace discovery, consumer AGENTS/SKILLS seeding. |

**Removed:** `hermes bridge` CLI (use `hermes install`), `.opencode/xray/` fallback, stale version JSDoc tags, `advanced-features/`.

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
