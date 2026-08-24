# 0xRay 3.0 from v2 — keep the marvel, trim the fat

v2 was forged as a **three-subsystem OS**. That design is not disposable. v3 does not replace it. v3 **tempers how loudly the engine speaks** to different hosts, and **cuts duplicate organs** that grew around the core.

Grok 4.2 treated this architecture as the product. Grok 4.6 still does. The work now is discipline: same skeleton, less bloat.

## The v2 marvel (keep)

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Proposals · Reflection · Memory routing        │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex · Solar SSOT · 7 MCP (3 deliberate)      │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  7-flow · AsideContext · Confidence gate        │
└─────────────────────────────────────────────────┘
```

| Subsystem | What it is | v3 rule |
|-----------|------------|---------|
| **Inference** | Proposals, reflection, optional Repertoire | Keep. Do not invent a parallel inference MCP. |
| **External Governance** | Codex + Dynamo + PreToolUse deny | Keep. This is the hammer. Always on. |
| **Autonomous Engine** | thinDispatch, asides, confer, lead-dev plan | Keep. **Temperament** only changes *when* ceremony is mandatory, not whether the engine exists. |

The 7 consumer MCP servers are the **public face** of those three subsystems. They stay.

## What v3 trims (fat, not bone)

Fat is **duplication and unused surface**, not the subsystems:

- Extra `*.server.ts` files that are **not** the 7 consumer MCPs
- A second and third *orchestrator class* beside nucleus + `mcps/orchestrator`
- `advanced-features/` (already off consumer boot)
- PostProcessor metamorphosis loop (soft-deprecated)
- Processor implementations beyond the live OpenCode/Hermes subset

See [v3 trim list](./v3-museum.md). First PRs **document and stop growing** that fat (Codex 69). Deletion is later and gated.

## Temperament sits *on* the engine

Frontier hosts (Grok 4.6 + Grok Build) already have subagents and plan mode. The Autonomous Engine must not **fight the host** on every spawn — but Inference and Governance still run.

Guided hosts (OpenCode, Hermes, including free models) still need the **full engine ceremony**: analyze-complexity, spawn-plan deny, confer. Those agents will not all evolve. The suit is for them too.

Details: [Suit temperament](../guides/v3-temperament.md).

## One-line v3

**Keep the three-subsystem OS. Temper the ceremony. Trim the duplicate organs.**
