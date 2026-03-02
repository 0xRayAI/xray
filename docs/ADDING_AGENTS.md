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
- `model` - Override the model for this agent
- `temperature` - Control randomness (0.0-1.0)
- `tools` - Control which tools are available
- `hidden` - Hide from @ autocomplete

---

## ProviderModelNotFoundError

This error occurs when:
1. An explicit model is specified for a subagent
2. That model is not available in the provider configuration

**Solution**: According to OpenCode docs:
> "If you don't specify a model, primary agents use the model globally configured while subagents will use the model of the primary agent that invoked the subagent."

**Fix**: Don't specify a model for subagents - they inherit the invoking agent's model.

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
version: "1.6.21"
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

### ProviderModelNotFoundError

**Cause**: Explicit model specified but not available

**Fix**: Remove `model` from agent config - subagents inherit parent's model

### Agent Not Found

**Cause**: Agent not properly configured in opencode.json

**Fix**: Ensure agent has `description` and `mode` fields

### @mention Not Working

**Cause**: Agent missing `mode: subagent`

**Fix**: Add `mode: subagent` to agent configuration
