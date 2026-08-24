# 0xRay 3.0 trim list (fat, not bone)

The **bone** is the v2 three-subsystem OS — Inference, External Governance, Autonomous Engine. Do not list those as disposable. See [v3 from v2](./v3-from-v2.md).

This page is the **fat**: duplicate conductors, unused MCP files, decoupled experiments. Kept in-tree for now. Do not grow them (Codex 69). Deletion is a later, gated PR — not the temperament commit.

## Keep as product (the three subsystems + bridges)

| Path | Role |
|------|------|
| `src/integrations/grok/hooks/` | Grok PreToolUse / SessionStart — constitution |
| `src/integrations/hermes-agent/` | Hermes bridge |
| `src/plugin/xray-codex-injection.ts` | OpenCode gate |
| `src/integrations/openclaw/` | OpenClaw |
| `scripts/node/install-bridges.cjs` | Four-bridge postinstall |
| `src/nucleus/delegation-gate.ts` | Multi-host spawn / pending SSOT |
| `src/nucleus/suit-temperament.ts` | v3 profile resolution |
| 7 consumer MCP servers | Public face of the three subsystems |
| `src/mcps/orchestrator/` + `src/nucleus/thin-dispatch.ts` | **Autonomous Engine** — keep |
| `src/nucleus/confer.ts` · `synthesis.ts` | Engine ceremony — keep; temperament decides when mandatory |
| `src/governance/` · `xray/codex.json` | **External Governance** — keep |
| `src/inference/` · `src/memory-routing/` | **Inference** — keep |

## Fat / duplicate (do not grow)

| Path | Why it is fat, not bone |
|------|-------------------------|
| `advanced-features/` | Off consumer boot; dashboards/scaling not the OS |
| `src/postprocessor/` metamorphosis | Soft-deprecated overlay on Governance |
| Extra `src/processors/implementations/` beyond the live OpenCode/Hermes subset | Duplicate enforcement vs Codex hook |
| Extra `src/mcps/*.server.ts` **not** in the 7 | Do **not** delete while `xray-skills` `invoke-skill` still proxies them. Collapse to in-process map first. |
| `src/core/orchestrator.ts` + `src/orchestrator/enhanced-*.ts` | **Duplicate** conductors — nucleus + `mcps/orchestrator` already *are* the engine |
| `src/integrations/grok/hooks/pre-tool-use.ts` | Dead TS; live hook is `.js` |

Consumer `.mcp.json` remains **seven** servers. Extra `*.server.ts` files are not an invitation to register them. Prompt-config `src/agents/*.ts` stay as host YML companions — not a fourth orchestrator.
