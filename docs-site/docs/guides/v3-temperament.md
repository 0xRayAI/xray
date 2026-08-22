# 0xRay v3 — Suit temperament

v2 forged the **three-subsystem OS** (Inference · External Governance · Autonomous Engine). That is the marvel. v3 does not throw it away.

0xRay is **for everyone**: a free-model session in OpenCode or Hermes, and a frontier host like Grok 4.6 + Grok Build. Those are not the same creature. v3 **tempers ceremony** (how loudly the Autonomous Engine insists) while **Governance stays on** and the three subsystems stay the product.

Architecture: [v3 from v2](../architecture/v3-from-v2.md).

## The distinction

| | Agents that will keep needing the full suit | Hosts that already grew up |
|--|--|--|
| Examples | Free / small models in OpenCode, Hermes, OpenClaw | Grok 4.6 + Grok Build, other frontier coding agents with native subagents, plan mode, hooks |
| Failure mode | Invents APIs, skips tests, dual-packs, `any`, no plan | Fights a second orchestrator (intake theater, forced confer) |
| What 0xRay must do | **Keep them in check** — lead-dev intake, spawn-plan deny, confer | **Keep them honest** — Codex gate, no new surface, no `eval` — without becoming the host |

Frontier models will keep evolving. Many agents **will not**. The suit has to serve both without pretending they are equal.

## Always on (constitution)

Every profile, every host:

- PreToolUse **Codex** — no `any`, no `@ts-ignore`, no `eval()`
- **no_new_surface** (Codex 69) — rewire existing MCP/skills/handlers; do not grow a parallel API
- Destructive shell block (`rm -rf /`, etc.)
- 7 consumer MCP servers still exist; you *may* call them

This is **External Governance**. It does not come off because the model got smarter. The Autonomous Engine is still there — temperament only changes whether intake is *mandatory* before spawn.

## Ceremony (temperament)

Ceremony is lead-dev *process*: `analyze-complexity` before spawn, 3-agent confer, synthesis checkpoints, spawn-plan **deny**.

| Profile | Who | Spawn without plan | Synthesis / confer |
|---------|-----|--------------------|--------------------|
| **guided** (default) | Hermes, OpenCode, OpenClaw, unknown, **any consumer with no `suit_temperament` key** | **Deny** (Codex 59) | Full |
| **strict** | Opt-in max | Deny | Full + confer |
| **frontier** | Grok when `profile: "auto"` **or** explicit | **Warn** (allow) | Lite (skip synthesis deny) |

**Upgrade safety:** if `.xray/features.json` has **no** `suit_temperament` field, the profile is **guided**. Existing installs do not silently become frontier.

## Config

```json
"suit_temperament": {
  "profile": "auto",
  "host_defaults": {
    "grok": "frontier",
    "hermes": "guided",
    "opencode": "guided",
    "openclaw": "guided",
    "generic": "guided"
  }
}
```

- `"profile": "guided"` — force ceremony even on Grok (teams that want one bar everywhere)
- `"profile": "frontier"` — force lite ceremony on Hermes/OpenCode (only if you trust the model)
- `"profile": "strict"` — maximum check, every host

New framework `xray/features.json` ships `auto`. Postinstall copies that template to **new** consumers.

## What v3 does *not* do (first cut)

- Does **not** retire Inference, Dynamo governance, or thinDispatch
- Does **not** drop the 7 consumer MCP servers
- Does **not** add an 8th MCP (Codex 69)
- Does **not** turn off Codex because “Grok is good now”
- Does **not** mass-delete processors / extra servers in this cut — those are **fat to trim later**, listed in the [trim list](../architecture/v3-museum.md)

## Host notes

**Grok Build** already has subagents, Plan Mode, native hooks, skills, workflows. On frontier, the Autonomous Engine stays **available** (analyze-complexity, confer, asides) but spawn is not blocked for lack of a lead-dev plan. Governance still denies `any` / `eval` / new surface.

**OpenCode / Hermes (including free models)** still get **full engine ceremony**: analyze-complexity, spawn deny, confer. That is not optional for those hosts unless you set `frontier` yourself. Those agents need the v2 OS as it was forged.

## Related

- [features.json](./features-json.md)
- [Autonomy command](./autonomy-command.md)
- [Integrations](./integrations.md)
