# User Asides — 3-Agent Review Quorum (2026-06-20)

## Result: **PASS** (round 4 unanimous)

| Agent | R1 | R2 | R3 | R4 |
|-------|----|----|----|----|
| Researcher | CONDITIONAL | PASS | CONDITIONAL | **PASS** |
| Architect | CONDITIONAL | CONDITIONAL | PASS | **PASS** |
| Code-review | CONDITIONAL | CONDITIONAL | CONDITIONAL | **PASS** |

## Commits on `feat/user-asides`

1. `44e9d3210` — initial user-asides SSOT + MCP rewire
2. `54883ca1c` — hardening (namespaced todos, spawn-plan-resolution, docs)
3. `a48a54e88` — session-scoped spawn + post-tool threading
4. `926f45d89` — explicit todo session isolation + boot hints

## Accepted exceptions (documented)

| Exception | Location |
|-----------|----------|
| Worktree cwd not enforced (host hint only) | `docs-site/docs/guides/user-asides.md` |
| Single active aside per workspace | same |
| Unscoped `_active.json` routes all sessions | same |
| Main synthesis **writes** blocked; aside **spawns** bypass | same + `delegation-gate.ts` tests |
| Governance `trapSignals` / `conferOnPhaseStart` = boot hints only | `getUserAsideBootHints()` |

## Verification

- `npm run verify:user-aside` — 9/9
- Unit tests — 23/23 (6 user-aside + 17 delegation-gate incl. 6 aside cases)
- Wired into `release-gate.mjs` consumer hook verifiers step