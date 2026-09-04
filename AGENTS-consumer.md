# 0xRay AI Agents

<!-- 0xray-managed -->

Quick reference for the 0xRay AI orchestration framework worn on **{{CONSUMER_NAME}}**{{CONSUMER_VERSION_PAREN}}.

**4.0** — a suit that survives the context window

Same **three-subsystem OS** as v2 (Inference · External Governance · Autonomous Engine). Constitution always on. Temperament scales ceremony. Four platform bridges. Repertoire organ ships **on** (vendored 0.2); opt out with `"enabled": false, "provider": "repertoire"`. Trim fat, do not gut the design.

**Governance always on** (Codex PreToolUse, no new surface, no `eval`). **Engine ceremony** (analyze-complexity before spawn, confer) is **guided** by default so free-model OpenCode/Hermes stay in check. Frontier hosts (Grok 4.6 class) with `suit_temperament.profile: auto` **warn** on spawn-without-plan instead of deny — the engine is still there. Existing `.xray/features.json` without `suit_temperament` stays **guided**. Docs: v3 from v2 · Suit temperament.

## Hot-swap

Before other work, Read `.xray/state/STATION.md`. Compaction and host change are the same cut. Continue the card. Do not restart the job. Grok does not inject the card (OpenCode does) — this Read is the Grok contract. Do not thicken the Grok exo.

## Postinstall (automatic)

`npm install 0xray` runs `install-bridges.cjs` and:

- Copies this file → **`AGENTS.md`** in your project root
- Fastens mill plant (`mill` + `inspect`) then overlays **your** `src/skills` (same name wins). Inspect AI work is the mill discipline. Does **not** dump 45/42 costume unless `foundry.json` `"costume": true`. Does **not** write root **`SKILLS.md`**
- Seeds **`.gitignore`** (from template, if absent)
- Deploys **`.xray/`** (`codex.json`, `features.json`, `config.json`) then overlays **your** mill SSOT (`xray/codex.json`, `xray/features.json`, `src/skills`, `src/opencode/agents`; remap with `foundry.json`)
- Writes **`.mcp.json`** with 7 MCPs servers (`npx -y 0xray mcp …`)
- Installs bridges: **OpenCode**, **Grok**, **Hermes**, **OpenClaw**

Optional extras: `npx 0xray setup`

## Available MCP Servers

All seven servers use `npx -y 0xray mcp <cmd>` — configured in your project `.mcp.json`:

| Server | Role |
|--------|------|
| `xray-governance` | Proposal governance, codex snapshot, quality gates |
| `xray-skills` | Skill invocation, 45 knowledge skills |
| `xray-orchestrator` | thinDispatch routing, AsideContext, confidence gate |
| `xray-enforcer` | Codex compliance enforcement, rule validation |
| `xray-researcher` | Codebase exploration, memory-routing enrichment |
| `xray-code-review` | Proposal quality, code review deliberation |
| `xray-architect-tools` | System design, architecture decisions |

Governance deliberation uses **code-review**, **security-audit** (via enforcer/skills), and **researcher** within this 7-server surface.

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx 0xray setup` | Symlinks, hook extras, Hermes skill sync |
| `npx 0xray status` | Verify installation |
| `npx 0xray opencode install` | OpenCode bridge (also runs on postinstall) |
| `npx 0xray grok install` | Grok plugin + 7 MCPs servers + skill sync |
| `npx 0xray hermes install` | Hermes plugin bridge |
| `npx 0xray openclaw install` | OpenClaw config + skills |
| `npx 0xray skill:install` | Install starter skills |
| `npx 0xray validate` | Validate codex compliance |
| `npx 0xray codex check` | Check codex rules |
| `npx 0xray health` | Framework health check |
| `npx 0xray mcp <server>` | Start an MCP server (stdio) |

## Governance

xray operates under the three-subsystem model: **Inference** + **External Governance** (Dynamo Solar SSOT) + **Autonomous Engine** (thinDispatch 7-flow in MCP orchestrator). All actions are validated against the Universal Development Codex before execution.

**Codex**: `.xray/codex.json` — **69 terms** across all agent interactions.

## thinDispatch Routing

- Simple (≤15): Single agent
- Moderate (≤25): Single agent with tools
- Complex (≤50): Multi-agent coordination
- Enterprise (>50): Orchestrator-led team

## AsideContext (v3.2+)

Bounded orchestrator subcontexts via `xray-orchestrator` MCP — `spawnAside` / `closeAside` on multi-step tasks. Repertoire memory routing (when enabled) flows through `inheritedContext.memoryRouting`.

## Memory Routing + Repertoire (optional, v3.3+)

Configure in `.xray/features.json`:

```json
"memory_routing": {
  "enabled": true,
  "provider": "repertoire",
  "module_path": "node_modules/@0xray/repertoire/dist/provider/memory-routing-provider.js",
  "config": {
    "signalsPath": "node_modules/@0xray/repertoire/data/curated_signals.json",
    "statePath": ".xray/state/repertoire/inference-state.json",
    "feedbackDir": ".xray/state/repertoire/feedback"
  }
}
```

Opt out: `{ "enabled": false, "provider": "repertoire" }`.

**External MCP** (Hermes/Grok): add Repertoire alongside 0xRay servers:

```json
"repertoire": {
  "command": "npx",
  "args": ["-y", "@0xray/repertoire", "mcp"]
}
```

Tools: `repertoire__get_task_confidence`, `repertoire__get_high_confidence_signals`, `repertoire__search_primitives`, `repertoire__ingest_feedback`.

## Codex OS (always on — not optional)

The Universal Development Codex (`.xray/codex.json`, **69 terms**) is enforced by **PreToolUse** (blocks) and this section (brain). MCP enforcer is audit — not the gate.

| Term | Rule | Enforcement |
|------|------|-------------|
| 11 | No `any`, `@ts-ignore`, `@ts-expect-error` | PreToolUse deny on edits |
| 29 | Security by design — no `eval()` | PreToolUse deny |
| 59 | Complex work → orchestrator intake | **guided/strict:** PreToolUse **deny** spawn without plan. **frontier:** **warn** (allow) — engine still available; leftover-plan todo mismatch also warns. Codex 11/29/69 still **deny**. |
| 67–68 | Best subagents + lead dev ownership | `analyze-complexity` + orchestrator skill |
| **69** | **No new MCP/skill/handler surface** | PreToolUse deny new `*.server.ts`, `SKILL.md` |

`features.json` → `multi_agent_orchestration.no_new_surface` (default **true**). Rewire existing hooks/MCPs/skills — do not add parallel APIs.

## Default operating mode: lead dev (rewired — no new MCP)

When the suit is worn, **lead dev mode** is ON via existing config + hooks:

| Layer | Existing piece | Rewire |
|-------|----------------|--------|
| Config | `features.json` → `multi_agent_orchestration.lead_dev_mode` | Extended, not new block |
| SessionStart + UserPromptSubmit | Grok hooks → `session-start.js` | Writes `.xray/state/session-boot.json` + `logs/framework/activity.log` |
| **OS gate** | **PreToolUse hook** | Codex patterns, surface area, spawn gate — `{"decision":"deny"}` + activity.log |
| Intake + plan | `xray-orchestrator` → **`analyze-complexity`** | Persists `.xray/state/lead-dev-plan.json` |
| Test triage | PreToolUse hook | Per-suite hint on full `npm test` |
| Playbook | **`orchestrator`** skill | Codex 59, 67–69 rules |

**First substantive task (guided/strict):** `analyze-complexity` with `tasks` array — **required before** `spawn_subagent`. **Frontier:** intake is optional; spawn without a plan **warns**. You are the **lead developer**. Users speak in goals, not keywords.

| # | Rule |
|---|------|
| 1 | Phased plan + detailed todos; assign best subagent; monitor output |
| 2 | Take the helm — loop test fix until complete; no permission pings |
| 3 | Per-suite test triage after major changes; full suite last |
| 4 | Lead stays main thread; subagents execute; update todos continuously |
| 5 | Read all console and test output; triage fix rerun |
| 6 | Never defer errors as "pre-existing" — add todo and resolve |
| 7 | Resolve all errors before phase completion |

**Major work:** invoke `researcher` + `architect-tools` + `code-review` before planning/refactors — automatically.

## Skills

Full catalog in root **`SKILLS.md`** (shipped on postinstall). **`orchestrator`** skill documents lead-dev mode. Invoke via `@orchestrator` or `xray-skills` MCP (`invoke-skill`, `list-skills`).

## File Organization

| File Type | Save To |
|-----------|---------|
| Reflections | `docs/reflections/` |
| Logs | `logs/` |
| Scripts | `scripts/` or `scripts/bash/` |
| Test Files | `src/__tests__/` |
| Source Code | `src/` |
| Config | `config/` or `.xray/` |

## Documentation

| Topic | URL |
|-------|-----|
| Getting started | https://0xrayai.github.io/xray/docs/guides/getting-started |
| Platform integrations | https://0xrayai.github.io/xray/docs/guides/integrations |
| Features since 3.1 | https://0xrayai.github.io/xray/docs/guides/features-since-3.1 |
| AsideContext | https://0xrayai.github.io/xray/docs/guides/aside-context |
| Memory routing | https://0xrayai.github.io/xray/docs/guides/memory-routing |
| Repertoire | https://0xrayai.github.io/xray/docs/guides/repertoire |
| Autonomy command | https://0xrayai.github.io/xray/docs/guides/autonomy-command |