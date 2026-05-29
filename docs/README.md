# xray 2.0 Docs

**The pure v2 three-subsystem AI Governance OS.**

## v2 Three-Subsystem Model (SSOT)

- **Inference**: Senses context, proposes work, runs deliberation via skills.
- **External Governance (Dynamo Solar SSOT)**: Required non-bypassable conscience. Solar physics + neural + codex enforcement for all critical decisions. See architecture/governance-model.md.
- **Autonomous Engine (thinDispatch 7-flow)**: Execution only of governed work. Lives in MCP orchestrator surfaces. Per-proc preferences + governance bridges.

xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT.

## Primary Surfaces (No Manual Setup)
- `.opencode/agents/*.yml` — Declarative YML SSOT for all agents. Injected via OpenCode plugin.
- MCP orchestrator — thinDispatch 7-flow funnel (orchestrator-core, delegation-routing, processor-pipeline, postprocessor-healing, security-orchestration, proposal-application, opencode-invocation).
- Skills (orchestrator, researcher, code-reviewer, security-auditor) + governance MCPs.

## Key Documents (Pure xray 2.0 Three-Subsystem)
- `agents/ADDING_AGENTS.md` — Adding agents targeting YML SSOT + MCP orchestrator + skills only.
- `architecture/PIPELINE_INVENTORY.md` — Current pipelines (7 major, focused on live three-subsystem surfaces).
- `testing/TEST_INVENTORY.md` — Three-subsystem test harnesses (CJS, FORCE, playbooks).
- `architecture/governance-model.md` — Dynamo External Governance subsystem.

**Pure xray 2.0. YML SSOT + MCP orchestrator + thinDispatch 7-flow + Dynamo. Zero visible history.**

The docs/ tree is the authoritative minimal set. See docs-site/ for the published site (minimal index).
