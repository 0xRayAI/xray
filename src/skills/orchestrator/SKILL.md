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

The seven rules are the engine. The cadence is the time signature. Disk SSOT: `grok-bot/OP-PROC.md` (team specifics live in `house/`).

Jargon is not the job. Review and cadence ask whether the change works. Do not spend the loop reciting dest names, mill liturgy, or host mantras.

- **Feat rebase:** when the mandated work turns into mantra, or the job has split across planes that no longer share one present, stop. Go up a level and answer the original message again from this seat. Do not continue the side thread and call that the job.

- **Peer test:** another instance with only worn 0xRay continues the ticket. No command stream.
- **Wear first:** Read `.xray/state/STATION.md`. Same cloud. Same critic (resume only). Dummy Reads Station.
- **Dummy tests `SKILLS.md`:** a suited dummy proves the worn catalog. Same-sess bodies keep context and hold a Station card.
- **Ship track:** always branch + worktree/aside + PR. Docs as you go. Builds. Rollback = close the PR. **Subject review. Fix n ship.** After critic PASS, review dest/domain, close leftovers, then mill-gate D. PASS is not ship. **Groover is not Repertoire.**
- **Publish:** stay logged in (do not `npm logout`). Every time run `npm publish --access public` in the live TTY. Paste the clickable `auth/cli` URL. No Enter, no VM browser, no subagent, no 6-digit code in chat. Poll `npm view` until live. Then prove **fresh** and **upgrade** registry installs. `npx 0xray validate` is the wear check (not leftover init.sh). `npm view` is not an install.
- **Peer boot:** four-line dispatch. They Read Station + this cadence and install without a command novel. Not a twin critic.
- **Live tick, not pacer:** `/loop` runs work now. Keep workstreams moving. Do not idle-wait 12 minutes. **Clean ticks every cycle** — unsubscribe then resubscribe so the prompt matches metal. Name-dedupe does not rewrite. A stale prompt (waiting URL after live, Hold after strip) is dirty: rewrite, do not act. **If the card and WAVEBOARD are idle, unsubscribe and do not resubscribe.**
- **Board clock:** PR events + resume the same critic. Not two idle pacers. Merge after PASS+CI (gate A). Publish only after mill-gate D + `foundry gate`.
- **Dispatch:** ticket + PR URLs + “Wear, then review.” The critic Reads `grok-bot/OP-PROC.md` (team specifics live in `house/`). Do not paste a command novel. When a law is spoken twice, encode it this wake.
- **Cascade:** Chat is not the brain. A cascade that must survive compaction is a named repertoire signal on the stack overlay, hydrated onto the project law list. NOTES holds the same cascade for the second Read. Station stays the ticket. A reflection is not this capture. Memory scoring rules: [docs/memory-scoring.md](https://github.com/0xRayAI/xray/blob/main/docs/memory-scoring.md).
- **Cold brief:** a new critic or any new subagent that does not already have this thread gets the latest commit SHA on the branch under review (fetch it; do not reuse an earlier SHA from a previous pass) and the Station card (`.xray/state/STATION.md`: intent, plan, git). If the card is missing, give branch + HEAD + what just changed. If the branch moves after you brief them, send the new SHA before they verdict.
- **Control:** The lead keeps control. Do not assume the subagent has the context. Give the duty, the latest SHA, the Station card, and the laws that apply. The subagent wears the applicable 0xRay suit before it works: the tree under review, built and installed. An older published package is not that suit. The lead checks the result.

### Engine cadence

This suite is the engine that builds the engine. When a seat sees OP-PROC, write it onto these existing surfaces in the same wake. Do not open a new skill.

1. Change the engine with precision.
2. Ship it local: build and install the tree. A live npm version stays live. Once a version is live, the stamper strips every present-tense patch pin from shipped guides and shipped OP-PROC, or reconcile advances the next cut. The stamper does not edit Station, NOTES, dest, or node_modules. It does not publish.
3. Test the change.
4. Run another deep review of the diff you just made.
5. Monitor long-term memory (dest name count and whether observations are the only growth) and short-term memory (Station: intent, plan, git).
6. Ship the PR.

### Planes

Operating planes: code, OP-PROC, model, suit, mill, host, and test/ship. Test/ship is the critical OP-PROC plane. Test then ship is the hero. Ship without that proof is the catastrophe. Long-term memory is the project law list. Each wake refreshes a changed stack definition and keeps observation stats. Heat writes the matched names onto Station, the short-term card that survives compaction. Reactive decisions move out of TypeScript into OP-PROC as the model improves. That move is why the mill and the suit exist. It is not fully proved. Once a version is live, the stamper strips every present-tense patch pin from shipped guides and shipped OP-PROC, or reconcile advances the next cut. The stamper does not edit Station, NOTES, dest, or node_modules. It does not publish. Do not freeze the live cut.
- **Close:** loop until Station is done. Compact: Station survives the cut. Overlay dest names are OP-PROC — reload `repertoire-working.json` `opProcNames`, not Station.
- **Board:** critic Strict comments; the implementer implements; lead stays main thread.
- **Codex 69:** rewire this skill and existing ops. Do not add a new `SKILL.md` to hold the cadence.
- **Ship matrix:** `grok-bot/OP-PROC.md` Decision matrix (team specifics live in `house/`) — A PR+CI · B pack · C `release:docs-check` (`reconcile --check`; no patch stamps on guides) · D `foundry release --i-mean-it`. Green CI is not ship. Spend / credentials stay Ask-first. Patch number lives in `package.json` + CHANGELOG.
- **Metamorphosis:** LLM → OP-PROC is in-context worn seats (same critic, same dummy, resume only). Not more bots.