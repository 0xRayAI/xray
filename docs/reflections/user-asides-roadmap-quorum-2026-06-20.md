# User Asides Roadmap — 3-Agent Review Quorum (2026-06-20)

**Session:** `019ed808-af9b-73d0-a115-c626ebd23d69` (same agents as user-asides ship review)

## Result: **CONDITIONAL PASS** (unanimous on reprioritization)

| Agent | Verdict | Key finding |
|-------|---------|-------------|
| Researcher | CONDITIONAL | Enforcement state loads from disk; boot gaps are awareness-only |
| Architect-tools | CONDITIONAL PASS | Three-layer model correct; roadmap conflated enforcement vs awareness |
| Code-review | CONDITIONAL | Demote session-boot P0 items; keep cwd enforcement as sole P0 |

## User challenge

> I do not see the issue with 0xRay state not being managed in Grok Build.

**Quorum agrees.** State **is** managed:

1. **Persistence** — `analyze-complexity` / `orchestrate-task` write `lead-dev-plan.json`, `asides/{id}.json`, `_active.json`
2. **Enforcement** — every PreToolUse calls `resolveSpawnPlan()` → live disk read
3. **Awareness** — `session-boot.json` hints; Grok ignores hook stdout; lead must Read file or use MCP response text

## Roadmap changes applied

| Item | Was | Now |
|------|-----|-----|
| Inject plan into session-boot | P0 | **P1** (resume ergonomics) |
| Auto-refresh boot on activate | P0 | **P1** (hint consistency) |
| Enforce worktree cwd | P0 | **P0** (unchanged — real wrong-file risk) |
| Git worktree auto-provision | P0 | **P0** (unchanged) |

## Unified engineering plan (top 5)

1. **P0** — Enforce aside worktree `cwd` in spawn gate
2. **P1** — Session-scoped `_active.json` (require `sessionId`)
3. **P1** — Lead resume ritual in `AGENTS-consumer.md`
4. **P1** — Plan summaries in `session-boot` + refresh on activate/clear
5. **P2** — Synthesis deny message polish, confer automation, archive lifecycle

## Docs updated

- `docs-site/docs/guides/user-asides-roadmap.md` — enforcement vs awareness split, reprioritized
- `docs-site/docs/guides/parallel-work-tracks.md` — three channels, softened stale-boot warning

## Verification unchanged

- `npm run verify:user-aside` — 9/9
- Unit tests — 23/23