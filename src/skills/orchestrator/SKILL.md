---
source: framework
name: orchestrator
description: Multi-agent workflow coordination, lead-dev operating model (codex 67-68), and task delegation. Default when suit is worn — no keywords required.
author: Xray Framework
version: 1.0.0
schema_version: "1.0"
tags: [orchestration, orchestrator, lead-dev]
capabilities:
  - coordinate_agents
  - delegate_tasks
  - manage_workflow
dependencies: []

mcp:
  orchestrator:
    command: node
    args: [node_modules/0xray/dist/mcps/orchestrator.server.js]
---

# Orchestrator Skill — includes lead-dev operating model

When `multi_agent_orchestration.lead_dev_mode` is true in `features.json` (default when suit is worn), this is the **default OS behavior** — not a separate skill or MCP.

## Seven rules (codex 67–68)

1. Phased plan + detailed todos; assign best subagent; monitor output
2. Lead dev loops test→fix until green; no permission pings
3. Per-suite test triage after major changes; full suite last
4. Lead stays main thread; subagents execute; update todos
5. Read all console and test output; triage fix rerun
6. Never defer errors as "pre-existing" — add todo and resolve
7. Resolve all errors before phase completion

## MCP loop (one tool surface — no autonomy-intake)

| Step | MCP tool | Notes |
|------|----------|-------|
| **Intake + classify** | `analyze-complexity` | Pass `tasks` array; persists `.xray/state/lead-dev-plan.json` when mode is on |
| Delegate (consult) | `orchestrate-task` | Invokes MCP consult skills (code-review, researcher, security-audit, etc.) |
| Delegate (implement) | **host `Task` / `spawn_subagent`** | `orchestrate-task` **defers** backend-engineer, frontend-engineer, bug-triage — lead must spawn |
| Monitor | `get-orchestration-status` | Lead updates todos |
| Major work | researcher + architect-tools + code-review | Auto-listed in plan when complexity > threshold |

## Subagent routing

| Task | Subagent |
|------|----------|
| Phasing | strategist |
| Architecture | architect-tools |
| Research | researcher |
| Implementation | backend-engineer / frontend-engineer |
| Test failures | bug-triage |
| Review | code-review |

## Hooks (rewired, not new MCPs)

- **SessionStart** → `session-start.js` boots lead_dev_mode
- **PreToolUse** → hints `per_suite_triage_required` on full `npm test`

Config: `features.json` → `multi_agent_orchestration.lead_dev_mode`

## Lead cadence (syncopation)

The seven rules are the engine. The cadence is the time signature. Disk SSOT: `grok-bot/ops/LEAD-CADENCE.md`.

- **Peer test:** another instance with only worn 0xRay continues the ticket. No command stream.
- **Wear first:** Read `.xray/state/STATION.md`. Same cloud. Same critic (resume only). Dummy Reads Station.
- **Dummy tests `SKILLS.md`:** a suited dummy proves the worn catalog. Same-sess bodies keep context and hold a Station card.
- **Ship track:** always branch + worktree/aside + PR. Docs as you go. Builds. Rollback = close the PR.
- **Publish:** lead runs `npm publish --access public`. Paste the CLI `auth/cli` URL. No Enter, no VM browser, no subagent. Poll `npm view` until live. Then prove **fresh** and **upgrade** registry installs. `npx 0xray validate` is the wear check (not leftover init.sh). `npm view` is not an install.
- **Peer boot:** four-line dispatch. They Read Station + this cadence and install without a command novel. Not a twin critic.
- **Live tick, not pacer:** `/loop` runs work now. Keep workstreams moving. Do not idle-wait 12 minutes.
- **Board clock:** PR events + resume the same critic. Not two idle pacers. Merge after PASS+CI (gate A). Publish only after mill-gate D + `foundry gate`.
- **Dispatch:** ticket + PR URLs + “Wear, then review.” The critic Reads `SEATS.md` Reviewer. Do not paste a command novel. When a law is spoken twice, encode it this wake.
- **Close:** loop until Station is done. Compact: Station survives the cut. Repertoire keeps names.
- **Board:** critic Strict comments; forge implements; lead stays main thread.
- **Codex 69:** rewire this skill and existing ops. Do not add a new `SKILL.md` to hold the cadence.
- **Ship matrix:** `LEAD-CADENCE.md` Decision matrix — A PR+CI · B pack · C `release:docs-check` · D `foundry release --i-mean-it`. Green CI is not ship. Spend / credentials stay Ask-first.
- **Metamorphosis:** LLM → OP-PROC is in-context worn seats (same critic, same dummy, resume only). Not more bots.