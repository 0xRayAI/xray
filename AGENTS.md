# StringRay Framework - Agent Context Guide v1.1.1

**Version**: 1.1.1 **Purpose**: Enterprise AI orchestration with 99.6% error prevention **Updated**: 2026-01-26  
**Note**: Lightweight guide for per-request inclusion (token-efficient). Full architecture, 59-term codex, pipeline diagrams and 51-file mapping → see master StringRay Complete System Architecture document.

## Executive Overview
- 9 Specialized AI Agents with complexity-based routing (including librarian for codebase exploration).
- 28 MCP Servers for tool integration.
- Universal Development Codex (59 mandatory terms enforced via enforcer agent).
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

**Prohibited**: False success claims, partial edits, over-engineering, committing without verification, destructive operations without explicit user command, hard-coded paths, auto-publishing/pushing.

## Agent Capabilities Matrix
| Agent                     | Role                              | Threshold     | Tools                                      | Strategy          |
|---------------------------|-----------------------------------|---------------|--------------------------------------------|-------------------|
| enforcer                  | Compliance                        | All           | read, grep, lsp_*                          | Block violations  |
| architect                 | Design                            | High          | read, grep, lsp_*, background_task         | Expert priority   |
| orchestrator              | Coordination                      | Enterprise    | read, grep, lsp_*, call_omo_agent          | Consensus         |
| bug-triage-specialist     | Fixes                             | Debug         | read, grep, ast_grep_*                     | Majority vote     |
| code-reviewer             | Quality                           | Changes       | read, grep, lsp_diagnostics                | Expert priority   |
| security-auditor          | Vulnerabilities                   | Security      | read, grep, grep_app_searchGitHub          | Block critical    |
| refactorer                | Debt                              | Refactor      | read, grep, lsp_rename                     | Majority vote     |
| test-architect            | Testing                           | Tests         | read, grep, lsp_*                          | Expert priority   |
| librarian                 | Codebase exploration & docs       | Analysis      | project-analysis_*                         | N/A (solo)        |

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
- MCP: 28 servers (agents + knowledge skills).

## Performance Budgets
- Bundle <2MB; FCP <2s; Tests >85%; Error Prevention 99.6%.

## Troubleshooting (Key)
- Plugin fail: Run postinstall.cjs
- Commands ignored: Check oh-my-opencode.json
- Logs: tail activity.log

## Reflection System
- Create after >30min sessions: Root cause, actions, next steps.

## Handling Large Test Suites (Mandatory for Test-Architect and Bug-Triage Agents)
- **Rule**: For suites >100 tests or prone to timeouts (e.g., Linux default limits), ALWAYS prioritize logging, monitoring, and isolation to prevent incomplete runs and ensure full error visibility.
- **Step 1: Log and Monitor Output**
  - Run in background, pipe to a log file, and poll periodically.
  - Post-run: Parse log for failures, auto-generate TODOs (e.g., as code comments or issues).
  - Example for validation script:
    ```
    cd /Users/blaze/dev/stringray && ./scripts/validate-stringray-framework.sh > /tmp/validation_log.txt 2>&1 & echo "Validation running in background (PID: $!)" && sleep 5 && echo "Initial output check:" && head -30 /tmp/validation_log.txt
    ```
  - Monitoring:
    ```
    cd /Users/blaze/dev/stringray && echo "Monitoring validation script completion..." && { while kill -0 $! 2>/dev/null; do echo "Still running... $(date)"; sleep 10; done; echo "Script completed!"; tail -20 /tmp/validation_log.txt; }
    ```
- **Step 2: Isolate and Fix**
  - Identify failures from logs, then fix one test at a time.
  - Rerun only the targeted test(s) to verify.
  - Example for npm:
    ```
    npm test -- src/__tests__/unit/agent-delegator.test.ts --testNamePattern="executeDelegation"
    ```
- **Additional**: If timeouts recur, adjust limits (e.g., `ulimit -t unlimited`) or split suites. Clean up logs after use.

## Advanced Logging and Monitoring (For All Agents)
- **Rule**: ALWAYS log JobIds, timestamps, and full command outputs to activity.log. Use structured JSON for errors.
- **Tools Integration**: Leverage `read` for log verification; grep for pattern searches (e.g., `grep "ERROR" activity.log`).
- **Alerts**: On failures, notify orchestrator and add blocking TODOs.
- **Best Practice**: Tail logs in real-time during long ops (e.g., `tail -f activity.log | grep JobId`).

## Platform-Specific Timeout Handling (For All Agents)
- **Rule**: Use `timeout` for time-limiting test runs to prevent hangs. On macOS, prefix with `g` (gtimeout) if using Homebrew coreutils. On Linux, use plain `timeout` (pre-installed via coreutils).
- **Mac Installation** (if missing):
  ```bash
  brew install coreutils
  # Then use: gtimeout 45s ...
  # Optional alias in ~/.zshrc: alias timeout='gtimeout'