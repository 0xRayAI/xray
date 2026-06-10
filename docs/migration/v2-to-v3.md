# v2 → v3 Migration Guide

xray v3 extracts the governance kernel (Dynamo pipeline + orchestrator routing + enforcer) from the 41-MCP federation, adds metamorphosis (self-evolution) capabilities, and freezes the plugin API for third-party authors.

## What Changed

### 1. Codex Expanded (68 → 72 terms)

| Term | Title | Summary |
|------|-------|---------|
| 69 | Self-Evolution Proposal Governance | Every self-proposal must pass 3-agent + Dynamo deliberation |
| 70 | Metamorphosis Threshold Enforcement | Proposals need metamorphosisScore ≥ 0.7 to proceed |
| 71 | Self-Evolution Safety Controls | Circuit breaker, rate limiting, whitelisted targets |
| 72 | Self-Evolution Traceability | All proposals must be logged with full provenance |

**Action**: None. Codex auto-loads from `.opencode/xray/codex.json`. The new terms are enforced by the kernel.

### 2. Kernel Integration (Strangler Applied)

All internal proposal flows now converge on `handleGovernRequest()` → `GovernanceService.govern()`. The MCP governance server remains the standard external surface.

**Uniform path:**
```
InferenceCycle.governProposals()
  └─ Primary: handleGovernRequest() → GovernanceService.govern()
  └─ Fallback: MCP governance server
  └─ Last resort: legacy VotingCoordinator (deprecated)

SelfProposalEngine → handleGovernRequest()
CLI → handleGovernRequest()
HTTP POST /govern → handleGovernRequest()
MCP govern_proposals tool → GovernanceService.govern() directly
```

**Action**: Update any direct `VotingCoordinator` or `getGovernanceService().govern()` calls to import `handleGovernRequest` from `src/nucleus/govern-http.js` (or use the MCP surface).

### 3. CLI Commands

| v2 | v3 |
|----|----|
| `xray status` | `xray govern --status` (backward compat preserved) |
| `xray security-audit` | `xray govern --audit` (backward compat preserved) |
| `xray mcp <name>` | `xray govern --mcp <name>` (backward compat preserved) |
| `xray plugin install <name>` | `xray govern --plugin-install <name>` (backward compat preserved) |
| 18 separate commands | `xray govern` is primary; old commands still work |

**Action**: Existing scripts using old command names continue to work. New scripts should use `xray govern --flag` form.

### 4. Self-Evolution Engine

Added `SelfProposalEngine` implementing `MetamorphosisEngine`:
- Reads `logs/framework/activity.log`
- Detects error/warning/governance-rejection patterns
- Submits proposals through full governance with metamorphosis scoring
- Enforces circuit breaker, rate limiting, whitelist

**Action**: No migration needed — engine is opt-in, triggered by PostProcessor lifecycle. To enable, pass `SelfProposalEngine` in the `MetamorphosisEngine[]` array to PostProcessor constructor.

### 5. Plugin API Frozen

Three interfaces are now stable at v3:
- `SkillPlugin` — governance skill registration
- `MetamorphosisEngine` — self-evolution lifecycle hooks
- `SelfProposalConfig` — configuration for the built-in proposal engine

**Action**: Third-party plugin authors can import from `0xray` and implement any of these interfaces. See `docs/api/plugin-api.md` for full documentation.

### 6. Dynamic Skills (PluginRegistry)

`PluginRegistryImpl` now resolves skills dynamically before falling back to MCP/built-in:
- `register()` — add skills at runtime
- `callSkill()` — invoke a skill by name
- Built-in skills (`code-review`, `security-audit`, `researcher`) reserved

**Action**: Skills can be registered post-boot via `pluginRegistry.register()` instead of requiring new MCP server processes.

## Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Direct `VotingCoordinator` usage | Code imports `VotingCoordinator` directly | Switch to `handleGovernRequest()` |
| Direct `getGovernanceService().govern()` | Bypasses kernel | Switch to `handleGovernRequest()` or MCP surface |
| `console.log` in source files | Codex Term 7 enforcement blocks at typecheck | Use `frameworkLogger` |
| `@ts-ignore` / `@ts-expect-error` / `any` | Codex Term 11 blocking | Fix type issues |

## No Breaking Changes

- MCP server interfaces — unchanged
- Bridge integrations (Grok, Hermes, OpenCode, OpenClaw) — unchanged
- Config file format — unchanged
- Activity log format — unchanged
- CLI entry point — unchanged (old commands still work)
- Package name — `0xray` unchanged

## Verification

After migration:

```bash
npm run typecheck     # must exit 0
npm test              # must pass
npm run verify:consumer  # consumer gate (all 4 bridges)
```

## Rollback

v3 is purely additive to the v2 codebase. To revert:
1. Remove `docs/api/plugin-api.md`
2. Revert `.opencode/xray/codex.json` to the 68-term version
3. Remove `src/__tests__/integration/self-evolution-e2e.test.ts`
4. Remove CHANGELOG v3.0.0 entries
