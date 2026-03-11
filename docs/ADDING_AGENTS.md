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

---

## Example: Adding the Storyteller Agent

This section documents how the storyteller agent was added as a real example.

### 1. Create Agent YAML Configuration

Create `.opencode/agents/storyteller.yml`:

```yaml
name: storyteller
description: "Deep reflection author - writes narrative, storytelling-style journey documents"
version: "2.0.0"
mode: subagent

# Story types supported
story_types:
  bug_fix:
    description: "Technical debugging narratives"
    emotional_arc: "frustration → confusion → breakthrough → satisfaction"
  feature_development:
    description: "Stories about building new features"
    emotional_arc: "excitement → challenge → perseverance → accomplishment"
  # ... more types

# Story components
story_components:
  scene_builder:
    description: "Creates vivid scene-setting"
  emotional_architect:
    description: "Shapes emotional journey"
  # ... more components

# Integration with other agents
integration:
  complementary_agents:
    - researcher  # Gather facts first
    - tech-writer # Technical accuracy
    - code-reviewer # Validate details
```

### 2. Add to opencode.json

In `opencode.json`, add to the `agent` section:

```json
{
  "agent": {
    "storyteller": {
      "temperature": 1.0,
      "mode": "subagent"
    }
  }
}
```

### 3. Supporting Documentation (Optional but Recommended)

Create supporting documents for reference:
- `.opencode/agents/storyteller-style-guide.md` - Voice and tone guidelines
- `.opencode/agents/storyteller-growth-strategy.md` - Audience and use cases
- `docs/storyteller-strategic-roadmap.md` - Development roadmap

### 4. Force-Add to Git (If Needed)

Agent files may be gitignored. Use `-f` to force add:

```bash
git add -f .opencode/agents/storyteller.yml
```

### 5. Reboot OpenCode

After adding, you MUST restart OpenCode for the agent to be recognized.

### Usage

After reboot, invoke with:

```
@storyteller write a deep reflection about fixing the memory leak
```

---

## Current Agents List

| Agent | Mode | Description |
|-------|------|-------------|
| orchestrator | subagent | Multi-agent workflow coordination |
| enforcer | primary | Codex compliance & error prevention |
| architect | subagent | System design & technical decisions |
| testing-lead | subagent | Testing strategy |
| bug-triage-specialist | subagent | Debugging & error investigation |
| code-reviewer | subagent | Code quality assessment |
| security-auditor | subagent | Vulnerability detection |
| refactorer | subagent | Technical debt elimination |
| researcher | subagent | Codebase exploration |
| strategist | subagent | Strategic planning |
| storyteller | subagent | Narrative deep reflections |
