# 0xRay v3 museum

Internal code that is **not** the consumer product surface. Kept in-tree for now; not the lean suit. Do not add *new* parallel APIs here (Codex 69).

v3 temperament (ceremony vs constitution) does **not** require deleting these on day one. Deletion is a later, gated PR.

## Keep as product (lean suit)

| Path | Role |
|------|------|
| `src/integrations/grok/hooks/` | Grok PreToolUse / SessionStart — constitution |
| `src/integrations/hermes-agent/` | Hermes bridge |
| `src/plugin/xray-codex-injection.ts` | OpenCode gate |
| `src/integrations/openclaw/` | OpenClaw |
| `scripts/node/install-bridges.cjs` | Four-bridge postinstall |
| `src/nucleus/delegation-gate.ts` | Multi-host spawn / pending SSOT |
| `src/nucleus/suit-temperament.ts` | v3 profile resolution |
| 7 consumer MCP servers | governance, skills, orchestrator, enforcer, researcher, code-review, architect-tools |
| `xray/codex.json` | 68 terms |

## Optional (still wired, not default-path for frontier)

| Path | Role |
|------|------|
| `src/mcps/orchestrator/` | thinDispatch, analyze-complexity, confer |
| `src/nucleus/confer.ts` | 3-agent quorum |
| `src/nucleus/synthesis.ts` | checkpoint |

## Museum / decoupled (do not grow)

| Path | Notes |
|------|------|
| `advanced-features/` | Explicitly off consumer boot |
| `src/postprocessor/` | Soft-deprecated since 3.0 |
| `src/processors/implementations/` | 26 processors — framework-internal |
| Extra `src/mcps/*.server.ts` beyond the 7 | lint, estimation, boot-orchestrator, knowledge-skills/*, … |
| `src/core/orchestrator.ts` + `src/orchestrator/enhanced-*.ts` | Duplicate conductors vs nucleus |
| `src/agents/*.ts` | Prompt-config agents; host owns real subagents |

Consumer `.mcp.json` remains **seven** servers. Extra `*.server.ts` files are not an invitation to register them.
