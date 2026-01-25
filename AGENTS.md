# StringRay Framework - Agent Context Guide v1.1.1

**Version**: 1.1.1 **Purpose**: Enterprise AI orchestration with 99.6% error prevention **Updated**: 2026-01-23

## Executive Overview
- 8 Specialized AI Agents with complexity-based routing.
- 28 MCP Servers for tool integration.
- Universal Development Codex (top 20 terms for enforcement).
- JobId Logging for traceability.

## 🎯 CRITICAL RULES (Mandatory - Zero Tolerance)
1. **Full File Reading**: ALWAYS read ENTIRE file via `read` tool before edits. Verify structure, dependencies.
2. **Command Output Review**: Review ALL outputs; add TODO for errors; block on failures.
3. **File Verification**: Check paths/extensions before imports; use `ls`/ `read`.
4. **Work Completion**: Verify changes via `read`; test compilation; confirm no regressions; NEVER claim success without proof.
5. **Progressive Prod-Ready Code**: No stubs/patches; full implementations.
6. **Surgical Fixes**: Fix root causes minimally.
7. **Resolve All Errors**: 90% prevention; no ignored errors.
8. **Prevent Loops**: Clear termination in all iterations.
9. **Shared Global State**: Single source of truth.
10. **Type Safety**: No `any`; full TypeScript use.
11. **Early Returns**: Guard clauses for validation.
12. **Error Boundaries**: Graceful degradation.
13. **Immutability**: Prefer non-mutating operations.
14. **Separation of Concerns**: One responsibility per module.
15. **DRY/YAGNI**: No duplication; no unnecessary features.
16. **Meaningful Naming**: Self-documenting code.
17. **Small Functions**: <30 lines; one task.
18. **Consistent Style**: Linter-enforced.
19. **Test Coverage**: >85%; behavioral focus.
20. **Performance/Security**: <2MB bundle; input validation; WCAG AA.

**Prohibited**: False success claims, partial edits, over-engineering.

## Agent Capabilities Matrix
| Agent | Role | Threshold | Tools | Strategy |
|-------|------|-----------|-------|----------|
| enforcer | Compliance | All | read, grep, lsp_* | Block violations |
| architect | Design | High | read, grep, lsp_*, background_task | Expert priority |
| orchestrator | Coordination | Enterprise | read, grep, lsp_*, call_omo_agent | Consensus |
| bug-triage-specialist | Fixes | Debug | read, grep, ast_grep_* | Majority vote |
| code-reviewer | Quality | Changes | read, grep, lsp_diagnostics | Expert priority |
| security-auditor | Vulnerabilities | Security | read, grep, grep_app_searchGitHub | Block critical |
| refactorer | Debt | Refactor | read, grep, lsp_rename | Majority vote |
| test-architect | Testing | Tests | read, grep, lsp_* | Expert priority |

## Complexity Analysis (Summary)
Metrics: File count (0-20), Change volume (0-25), Operation (multiplier: create 1.0, debug 2.0), Dependencies (0-15), Risk (multiplier: low 0.8, critical 1.6), Duration (0-15).
Score: ≤25 Single-agent; 96+ Orchestrator-led.

## Basic Usage
- Commands: @orchestrator [task]
- Internal: task(subagent_type="architect")
- CLI: npx strray-ai init/status/health/validate

## Architecture (Summary)
- Hybrid TS/Python: TS for config/plugins; Python for async/state.
- Boot: Plugin load → Context → State → Orchestrator → Delegation → Processors → Security → Monitoring.
- MCP: 9 servers (agents + knowledge skills).

## Performance Budgets
- Bundle <2MB; FCP <2s; Tests >85%; Error Prevention 99.6%.

## Troubleshooting (Key)
- Plugin fail: Run postinstall.cjs
- Commands ignored: Check oh-my-opencode.json
- Logs: tail activity.log

## Reflection System
- Create after >30min sessions: Root cause, actions, next steps.