# How to Add an Agent to StringRay Framework

This guide documents all the files that need to be updated when adding a new agent to StringRay.

---

## The Problem

Adding a new agent currently requires updating **8+ files** across the codebase. This is error-prone and tedious.

---

## Important: Two Types of Agent Access

### 1. Task Tool (OpenCode native)
The Task tool has a **hardcoded list** of agent types in OpenCode's framework:
- general, explore, orchestrator, enhanced-orchestrator, architect, test-architect, bug-triage-specialist, code-reviewer, security-auditor, refactorer, librarian, log-monitor, oracle, document-writer, multimodal-looker, frontend-ui-ux-engineer

**To add new agents here**, you must modify OpenCode's Task tool definition.

### 2. StringRay Enhanced Access
StringRay provides additional ways to access agents:
- **@agent commands** - Via framework-help server
- **enhanced-orchestrator spawn-agent** - Programmatic access
- **features.json** - Agent model configuration

This is where seo-specialist, marketing-expert, etc. are accessible.

---

## Files That Need to Be Updated

### 1. `.opencode/strray/features.json` (REQUIRED)
Add the agent to `agent_management.agent_models`:

```json
"agent_management": {
  "agent_models": {
    "new-agent": "claude-sonnet-4"
  }
}
```

### 2. `src/mcps/mcp-client.ts` (REQUIRED)
Add MCP server configuration in `serverConfigs`:

```typescript
"new-agent": {
  serverName: "new-agent",
  command: "node",
  args: [
    `${process.env.STRRAY_MCP_PATH || "dist"}/mcps/knowledge-skills/new-agent.server.js`,
  ],
  timeout: 30000,
},
```

Also update `strray_get_commands` tool to include the new agent.

### 3. `src/mcps/framework-help.server.ts` (REQUIRED)
Update the `agent-commands` case to include the new agent:

```typescript
@new-agent - Description of what the agent does
```

### 4. `src/delegation/agent-delegator.ts` (if applicable)
Add agent configuration if using delegation.

### 5. `src/delegation/task-skill-router.ts` (if applicable)
Add keyword mappings for skill-based routing.

### 6. `.opencode/agents/new-agent.yml` (optional)
Create agent YAML configuration.

### 7. `.opencode/agents/new-agent.md` (optional)
Create agent documentation.

### 8. `src/agents/new-agent.ts` (optional)
Create the agent implementation if it has custom logic.

### 9. `src/mcps/knowledge-skills/new-agent.server.ts` (optional)
Create MCP server if the agent has tools.

---

## Current Agent List

### Available via Task Tool (OpenCode native - 16 agents)
| Agent | Features.json | MCP Client | Framework Help |
|-------|--------------|------------|----------------|
| general | - | - | - |
| explore | ✅ | ✅ (alias) | ✅ |
| orchestrator | ✅ | ✅ | ✅ |
| enhanced-orchestrator | ❌ | ✅ | ✅ |
| architect | ✅ | ✅ (alias) | ✅ |
| test-architect | ✅ | ✅ (alias) | ✅ |
| bug-triage-specialist | ✅ | ✅ | ✅ |
| code-reviewer | ✅ | ✅ (alias) | ✅ |
| security-auditor | ✅ | ✅ | ✅ |
| refactorer | ✅ | ✅ (alias) | ✅ |
| librarian | ✅ | ✅ (alias) | ✅ |
| log-monitor | ✅ | ✅ | ✅ |
| oracle | ✅ | ✅ (alias) | ✅ |
| document-writer | ✅ | ✅ (alias) | ✅ |
| multimodal-looker | ✅ | ✅ | ✅ |
| frontend-ui-ux-engineer | ✅ | ✅ (alias) | ✅ |

### Available via enhanced-orchestrator Only (StringRay - 3 agents)
| Agent | Features.json | MCP Client | Framework Help |
|-------|--------------|------------|----------------|
| seo-specialist | ✅ | ✅ | ✅ |
| seo-copywriter | ✅ | ✅ | ✅ |
| marketing-expert | ✅ | ✅ | ✅ |

---

## Aliases

Many agents use aliases to share MCP servers:

- `code-reviewer` → `code-review.server.js`
- `security-auditor` → `security-audit.server.js`
- `refactorer` → `refactoring-strategies.server.js`
- `test-architect` → `testing-strategy.server.js`
- `oracle` → `project-analysis.server.js`
- `librarian` → `project-analysis.server.js`
- `explore` → `project-analysis.server.js`
- `document-writer` → `documentation-generation.server.js`
- `frontend-ui-ux-engineer` → `ui-ux-design.server.js`
- `enforcer` → `enforcer-tools.server.js`
- `architect` → `architect-tools.server.js`
- `backend-engineer` → `api-design.server.js`

---

## Recommended: Minimal Update Path

For a new agent, minimum required updates:

1. **Add to features.json** - Required for OpenCode to know about the agent
2. **Add MCP config** - Required for the agent to actually work
3. **Add to framework-help** - So users know about it via `@` commands

---

## Future: Automated Registration

This system should be automated. Ideas:
- Generate all docs from a single `agents.json` config
- Auto-generate help text from agent metadata
- Single source of truth for agent definitions
- Work with OpenCode to add agents to Task tool enum
