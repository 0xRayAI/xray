# v3 Completion Reflection

**Version:** 3.0.0
**Commit:** 3d23b6cea
**Date:** 2026-06-10
**Verification:** 2290 tests passed, 4/4 bridge E2Es, consumer gate green

## What was done

The v3 architecture plan was executed end-to-end across four phases, transforming xray from a heavy MCP-centric federation to a nucleus-based thin callable core.

### Phase 1 — Nucleus Primary (8 steps)
Governance call site audit (29 sites), MCP fallback chain removal from inference-cycle.ts (-287 lines, 9 methods, 7 XRAY_FORCE_MCP_GOVERNANCE checks), opencode-cli-invoker cleanup, boot-orchestrator.server.ts slimmed ~80%, and creation of `src/nucleus/` with orchestrator, thin-dispatch, plugin-registry, govern-http, and kernel. 50 nucleus-primary tests added. All consumers route through `handleGovernRequest`.

### Phase 2 — Plugin System
All 24 knowledge-skill servers registered as plugins via `registerDefaultPlugins()`, pluginRegistry extended with full tool dispatch API, MCP bypass paths deprecated, root MCP server audit completed.

### Phase 3 — Self-Evolution
SelfProposalEngine auto-wired into PostProcessor as default metamorphosis engine with backup/rollback, circuit breaker, and metrics export. `scripts/run-self-evolution.sh` created.

### Phase 4 — Legacy Cleanup
XRAY_FORCE_MCP_GOVERNANCE purged from CLI, .mcp.json, grok-cli. MCP + in-process fallback removed from governance-service. Legacy `.grok/plugins/strray-ai/` directory deleted. STRRAY_HOME env var removed.

## The fix that mattered

`registerDefaultPlugins()` was defined and exported but **never wired into the boot sequence**. The nucleus boot-orchestrator had no plugin registration step. This meant consumer installs showed `Skills: 0 loaded` and none of the 24 knowledge-skill plugins were actually registered at runtime. The fix was a 3-line pattern addition (boot sequence entry + switch case + handler) that calls `registerDefaultPlugins()` during NucleusOrchestrator boot.

## What we proved

- `npm pack` + consumer install in a fresh temp directory works
- All 4 bridge E2Es pass against the packaged artifact (Hermes 46, OpenCode 34, OpenClaw 101, Grok 53)
- Consumer plugin registration + tool dispatch works end-to-end
- activity.log captures 728 entries with 608 structured frameworkLogger records
- ~16,438 LOC removed, 5,979 added (-11,751 net)

## Loose ends

- `XRAY_FORCE_MCP_GOVERNANCE` lingers in `mcp-client.ts` as a compat shim (rename to `XRAY_PURE_MCP_MODE` is optional)
- vi.mock pre-existing warnings in test utils
- No 3.1 roadmap — next major work pending

## Institutional lesson

Verification is not optional. The code compiled, units passed, but the consumer path was broken. We should never claim readiness until `npm pack → fresh install → bridge E2Es → plugin dispatch` all pass. The `scripts/verify-consumer.sh` gate exists precisely for this reason — run it before every release.
