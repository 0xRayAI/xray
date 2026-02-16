# StringRay Framework - Agent Context Guide

**Version**: 1.4.1 
**Purpose**: Enterprise AI orchestration with 99.6% error prevention
**Updated**: 2026-02-16

## Quick Start

StringRay operates as an OpenCode plugin. When installed in a project:

1. **Framework loads** via `.opencode/init.sh` on OpenCode startup
2. **Agents available** via `@agent` commands (e.g., `@enforcer`, `@orchestrator`)
3. **Librarian auto-updates** this AGENTS.md as capabilities are discovered

## Available Agents

| Agent | Role | Command |
|-------|------|---------|
| **enforcer** | Codex compliance | `@enforcer analyze code` |
| **architect** | System design | `@architect design system` |
| **orchestrator** | Task coordination | `@orchestrator coordinate task` |
| **test-architect** | Testing strategy | `@test-architect plan tests` |
| **bug-triage-specialist** | Error investigation | `@bug-triage-specialist debug issue` |
| **code-reviewer** | Quality assessment | `@code-reviewer review code` |
| **security-auditor** | Security analysis | `@security-auditor scan codebase` |
| **refactorer** | Code improvement | `@refactorer optimize code` |
| **librarian** | Codebase analysis | `@librarian explore project` |

## Loading StringRay Context

When operating in a StringRay-enabled project:

```bash
# Initialize framework
source .opencode/init.sh

# Agents now available via @ commands
@orchestrator implement feature
@enforcer validate code
```

## Configuration

- **Codex rules**: `.opencode/strray/codex.json` (59 terms)
- **Features**: `.opencode/strray/features.json`
- **Agents**: `.opencode/agents/*.yml`

## Auto-Documentation

The **librarian** agent automatically updates this file as new agents, skills, and capabilities are discovered in the project.

---

**Framework**: StringRay AI v1.4.1 | **Error Prevention**: 99.6%
