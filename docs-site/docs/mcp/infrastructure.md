# Infrastructure MCP Servers

**Version**: 1.22.13

Infrastructure MCP servers provide core framework operations and are typically invoked by the orchestrator or other system components.

## Complete Server List

| # | Server File | Purpose |
|---|-------------|---------|
| 1 | `architect-tools.server.ts` | System design, dependency mapping, architecture validation |
| 2 | `auto-format.server.ts` | Code formatting and style consistency |
| 3 | `boot-orchestrator.server.ts` | Framework initialization and boot sequence |
| 4 | `enforcer-tools.server.ts` | Codex compliance and rule enforcement |
| 5 | `estimation.server.ts` | Effort estimation and complexity scoring |
| 6 | `framework-compliance-audit.server.ts` | Comprehensive codex validation |
| 7 | `framework-help.server.ts` | Framework utilities and help system |
| 8 | `lint.server.ts` | Code linting and static analysis |
| 9 | `model-health-check.server.ts` | AI model health monitoring |
| 10 | `orchestrator.server.ts` | Multi-agent workflow coordination |
| 11 | `performance-analysis.server.ts` | Performance profiling and analysis |
| 12 | `processor-pipeline.server.ts` | Pre/post processor execution |
| 13 | `researcher.server.ts` | Codebase exploration and documentation search |
| 14 | `security-scan.server.ts` | Security vulnerability detection |
| 15 | `state-manager.server.ts` | State management and persistence |

## Server Details

### orchestrator.server.ts
- **Purpose**: Multi-agent workflow coordination
- **Tools**: Spawn agents, manage complex tasks, coordinate subagents
- **Used by**: Primary orchestrator for complex task execution

### boot-orchestrator.server.ts
- **Purpose**: Framework initialization and component startup
- **Tools**: Initialize framework, load configuration, start processors
- **Used by**: System boot process

### processor-pipeline.server.ts
- **Purpose**: Pre/post processor execution pipeline
- **Tools**: execute-pre-processors, execute-post-processors, codex-validation
- **Used by**: All tool execution paths

### enforcer-tools.server.ts
- **Purpose**: Codex compliance and rule enforcement
- **Tools**: validate-codex, check-compliance, enforce-rules
- **Used by**: Enforcer agent and pre-processors

### architect-tools.server.ts
- **Purpose**: System design and architectural validation
- **Tools**: architecture-validation, dependency-mapping, design-review
- **Used by**: Architect agent

### researcher.server.ts
- **Purpose**: Codebase exploration and documentation search
- **Tools**: search-code, find-docs, analyze-context
- **Used by**: Researcher agent

### security-scan.server.ts
- **Purpose**: Security vulnerability detection
- **Tools**: scan-vulnerabilities, security-audit, vulnerability-report
- **Used by**: Security auditor agent

### auto-format.server.ts
- **Purpose**: Code formatting and style consistency
- **Tools**: format-code, check-style, apply-formatting
- **Used by**: Auto-format skill

### estimation.server.ts
- **Purpose**: Effort estimation and complexity scoring
- **Tools**: estimate-effort, calculate-complexity, assess-scope
- **Used by**: Planning and orchestration

### framework-compliance-audit.server.ts
- **Purpose**: Comprehensive codex validation
- **Tools**: audit-framework, validate-codex, compliance-report
- **Used by**: Enforcer agent and compliance checks

### framework-help.server.ts
- **Purpose**: Framework utilities and help system
- **Tools**: get-help, list-commands, framework-docs
- **Used by**: User assistance

### lint.server.ts
- **Purpose**: Code linting and static analysis
- **Tools**: lint-code, analyze-quality, check-patterns
- **Used by**: Code quality validation

### model-health-check.server.ts
- **Purpose**: AI model health monitoring and diagnostics
- **Tools**: check-model-health, diagnose-issues, performance-metrics
- **Used by**: System health monitoring

### performance-analysis.server.ts
- **Purpose**: Performance profiling and analysis
- **Tools**: profile-performance, analyze-bottlenecks, benchmark
- **Used by**: Performance engineer agent

### state-manager.server.ts
- **Purpose**: State management and persistence
- **Tools**: get-state, set-state, clear-state
- **Used by**: Framework state management