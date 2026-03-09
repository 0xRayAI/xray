# How to Add an Agent to StringRay Framework

This guide documents how to add agents to StringRay using OpenCode's official agent configuration.

---

## How OpenCode Agents Work (Official Docs)

According to [OpenCode Agents Documentation](https://opencode.ai/docs/agents/):

### Two Types of Agents

1. **Primary Agents** - Main assistants (Build, Plan)
2. **Subagents** - Specialized assistants invoked via `@` mentions

### Agent Invocation

- **Primary agents**: Use Tab key to cycle through during a session
- **Subagents**: Use `@agentname` to invoke directly, e.g., `@strategist help me with architecture`

### Agent Configuration Options

OpenCode agents can be configured in two ways:

1. **JSON** - In `opencode.json` under the `agent` key
2. **Markdown** - In `.opencode/agents/` directory as `.yml` files

Required fields:
- `description` - Brief description of what the agent does
- `mode` - `primary`, `subagent`, or `all`

Optional fields:
- `temperature` - Control randomness (0.0-1.0)
- `tools` - Control which tools are available
- `hidden` - Hide from @ autocomplete

**IMPORTANT**: Do NOT set `model:` in yml files - this causes ProviderModelNotFoundError. Subagents inherit the model's from the primary agent.

---

## Files That Need to Be Updated

### 1. `opencode.json` (RECOMMENDED)

Add the agent to the `agent` section:

```json
{
  "agent": {
    "my-agent": {
      "description": "What this agent does",
      "mode": "subagent",
      "temperature": 1.0
    }
  }
}
```

Or use `.opencode/agents/my-agent.yml`:

```yaml
name: my-agent
description: What this agent does
mode: subagent
version: "1.7.5"
```

### 2. `src/mcps/mcp-client.ts` (REQUIRED for MCP)

Add MCP server configuration in `serverConfigs`:

```typescript
"my-agent": {
  serverName: "my-agent",
  command: "node",
  args: [
    `${basePath}/mcps/knowledge-skills/my-agent.server.js`,
  ],
  timeout: 30000,
},
```

### 3. Update Skills List

Add to skill lists in:
- `src/mcps/mcp-client.ts` - `availableSkills` array
- `src/mcps/knowledge-skills/skill-invocation.server.ts` - skill enum

---

## Agent Access Methods

| Method | How | Works for Custom Agents? |
|--------|-----|-------------------------|
| `@agent` | Type `@strategist` in chat | ✅ Yes |
| Tab key | Cycle primary agents | ❌ Built-in only |
| Task tool | Primary agent invokes subagent | ✅ Yes |
| StringRay MCP | Direct MCP invocation | ✅ Yes |

---

## Troubleshooting

### Issue 1: ProviderModelNotFoundError

**Error**: `ProviderModelNotFoundError: ProviderModelNotFoundError`

**Cause**: A `.yml` file in `.opencode/agents/` has an explicit `model:` setting that references a model not available in your provider configuration.

**Solution**:
1. Check `.opencode/agents/*.yml` files for `model:` field
2. Remove any `model:` lines from yml files - they should NOT have models set
3. Subagents inherit the model from the primary agent that invokes them

```yaml
# WRONG - will cause ProviderModelNotFoundError
name: my-agent
model: openrouter/xai-grok-2
mode: subagent

# CORRECT - no model field
name: my-agent
mode: subagent
```

---

### Issue 2: Unknown agent type

**Error**: `Error: Unknown agent type: my-agent is not a valid agent type`

**Cause**: Agent is missing from `opencode.json` OR OpenCode hasn't reloaded the configuration after you added it.

**Solution**:
1. Add agent to `opencode.json` under the `agent` key:

```json
{
  "agent": {
    "my-agent": {
      "description": "What this agent does",
      "mode": "subagent",
      "temperature": 1.0
    }
  }
}
```

2. **Reboot OpenCode** - The configuration is cached. You MUST restart OpenCode for new agents to work.

3. After reboot, test with `@my-agent hello`

---

### @mention Not Working

**Cause**: Agent missing `mode: subagent`

**Fix**: Add `mode: subagent` to agent configuration
