# MCP Server Reference

0xRay includes internal MCP server implementations (`dist/mcps/*.server.js`) beyond the **7 consumer servers** in `.mcp.json`. Consumer projects use the 7-server `npx` surface — see [MCP README](./README.md).

The table below lists framework-level servers loaded at runtime by the orchestrator (subset of full inventory):

| # | Server | Purpose |
|---|--------|---------|
| 1 | `architect-tools` | System design, dependency mapping, architecture validation |
| 2 | `auto-format` | Code formatting and style consistency |
| 3 | `boot-orchestrator` | Framework initialization and boot sequence |
| 4 | `enforcer-tools` | Codex compliance and rule enforcement |
| 5 | `estimation` | Effort estimation and complexity scoring |
| 6 | `framework-compliance-audit` | Comprehensive codex validation |
| 7 | `framework-help` | Framework utilities and help system |
| 8 | `governance` | Proposal governance, codex snapshot, Railway HTTP MCP endpoint |
| 9 | `lint` | Code linting and static analysis |
| 10 | `model-health-check` | AI model health monitoring |
| 11 | `performance-analysis` | Performance profiling and analysis |
| 12 | `processor-pipeline` | Pre/post processor execution |
| 13 | `researcher` | Codebase exploration and documentation search |
| 14 | `security-scan` | Security vulnerability detection |
| 15 | `state-manager` | State management and persistence |

## Consumer MCP Servers (7)

All consumer projects receive `.mcp.json` with 7 servers on postinstall: governance, skills, orchestrator, enforcer, researcher, code-review, architect-tools. See [MCP Servers overview](./README.md).
