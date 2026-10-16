# How to Add an Agent to 0xRay AI v3.4.1

This guide documents how to add agents to 0xRay v3.4.1 and lists **every single file** that needs to be updated.

**SSOT**: `src/opencode/agents/{agent}.yml` — 42 YML surfaces ship to consumers via postinstall/OpenCode bridge.

When adding agents, you'll primarily interact with clean APIs rather than monolithic files.

---

## Quick Checklist

When adding a new agent, you MUST update these files:

| # | File | What to Add |
|---|------|-------------|
| 1 | `opencode.json` | Agent entry in `agent` section |
| 2 | `.opencode/agents/{agent}.yml` | Agent YAML configuration |
| 3 | `AGENTS.md` | Agent in the agents table |
| 4 | `README.md` | Agent in the agents table |
| 5 | `docs/README.md` | Agent in model routing config |
| 6 | `src/mcps/mcp-client.ts` | Server config + availableSkills (via facade) |
| 7 | `src/mcps/knowledge-skills/skill-invocation.server.ts` | Skill enum |
| 8 | `src/delegation/task-skill-router.ts` | Task routing rules (via facade) |
| 9 | `src/enforcement/rule-enforcer.ts` | Rule enforcement mapping (via facade) |
| 10 | `src/orchestrator/orchestrator.ts` | Orchestration routing |
| 11 | `src/orchestrator/multi-agent-orchestration-coordinator.ts` | Coordination |
| 12 | `src/orchestrator/agent-spawn-governor.ts` | Spawn limits |
| 13 | `src/orchestrator/enhanced-multi-agent-orchestrator.ts` | Timeout config |
| 14 | `src/mcps/orchestrator.server.ts` | Agent capabilities |
| 15 | `src/reporting/framework-reporting-system.ts` | Reporting mapping |
| 16 | `src/processors/processor-manager.ts` | Processor routing |
| 17 | `src/processors/agents-md-validation-processor.ts` | Validation |
| 18 | `AGENTS-full.md` | Full agent documentation |
| 19 | `xray/agents_template.md` | Consumer agent documentation template |
| 20 | `src/scripts/profiling-demo.ts` | Profiling support |
| 21 | `tests/validation/config-loader.sh` | Config validation |
| 22 | `tests/validation/config-integration-tests.sh` | Integration tests |
| 23 | `src/__tests__/test-governance-systems.ts` | Governance tests |
| 24 | `docs/ADDING_AGENTS.md` | Update this guide |

---

## Current Agents List

| Agent | Mode | Description |
|-------|------|-------------|
| enforcer | primary | Codex compliance & error prevention |
| orchestrator | subagent | Multi-agent workflow coordination |
| architect | subagent | System design & technical decisions |
| testing-lead | subagent | Testing strategy |
| bug-triage-specialist | subagent | Debugging & error investigation |
| code-reviewer | subagent | Code quality assessment |
| security-auditor | subagent | Vulnerability detection |
| refactorer | subagent | Technical debt elimination |
| researcher | subagent | Codebase exploration |
| strategist | subagent | Strategic planning |
| storyteller | subagent | Narrative deep reflections |
| log-monitor | subagent | Performance monitoring |
| frontend-engineer | subagent | React, Vue, Angular development |
| backend-engineer | subagent | Node.js, Python, Go APIs |
| mobile-developer | subagent | iOS, Android, React Native |
| database-engineer | subagent | Schema design, migrations |
| devops-engineer | subagent | CI/CD, containers, infrastructure |
| performance-engineer | subagent | Optimization, profiling |
| seo-consultant | subagent | SEO optimization |
| content-creator | subagent | Content optimization |
| growth-strategist | subagent | Marketing strategy |
| tech-writer | subagent | Technical documentation |
| multimodal-looker | subagent | Image/video analysis |
| code-analyzer | subagent | Code analysis |
| documentation-writer | subagent | Documentation creation |
| testing-strategy | subagent | Test planning |
| framework-compliance-audit | subagent | Compliance validation |

---

## Detailed Instructions

### 1. opencode.json

Add agent entry in the `agent` section:

```json
{
  "agent": {
    "my-agent": {
      "temperature": 1.0,
      "mode": "subagent"
    }
  }
}
```

### 2. .opencode/agents/{agent}.yml

Create the agent YAML file:

```yaml
name: my-agent
description: "What this agent does"
version: "3.0.0"
mode: subagent
```

**Note:** Do NOT set `model:` in yml files - causes ProviderModelNotFoundError.

### 3. AGENTS.md

Add to the Available Agents table:

```markdown
| `@my-agent` | Purpose | `@my-agent do something` |
```

### 4. README.md

Add to the agents table (line ~72):

```markdown
| `@my-agent` | Purpose |
```

### 5. docs/README.md

Add to model routing config (around line 155):

```json
"my-agent": "openrouter/xai-grok-2-1212-fast-1",
```

### 6. src/mcps/mcp-client.ts

**Note:** Add to the facade's serverConfigs:

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

**A)** Add to serverConfigs (via facade's configuration method)

**B)** Add to availableSkills array:

```typescript
"my-agent": [
  "skill-name",
],
```

### 7. src/mcps/knowledge-skills/skill-invocation.server.ts

Add to the skills enum (around line 71):

```typescript
"my-agent",
```

### 8. src/delegation/task-skill-router.ts

**Note:** This module handles routing across agents.

Add routing rules (around line 401):

```typescript
agent: "my-agent",
```

Search for other agents to see the pattern - there are multiple routing locations.

### 9. src/enforcement/rule-enforcer.ts

**Note:** This module handles codex enforcement.

Add enforcement mapping (around line 1008):

```typescript
agent: "my-agent",
```

### 10. src/orchestrator/orchestrator.ts

Add orchestration routing (around line 354):

```typescript
agentsNeeded = ["my-agent"];
```

### 11. src/orchestrator/multi-agent-orchestration-coordinator.ts

Add coordination config (around line 599):

```typescript
"my-agent",
```

### 12. src/orchestrator/agent-spawn-governor.ts

Add spawn limits (around line 71):

```typescript
"my-agent": 2,
```

### 13. src/orchestrator/enhanced-multi-agent-orchestrator.ts

Add timeout config (around line 362):

```typescript
"my-agent": 2800,
```

### 14. src/mcps/orchestrator.server.ts

Add agent capabilities (around line 75):

```typescript
this.agentCapabilities.set("my-agent", {
  // capabilities
});
```

### 15. src/reporting/framework-reporting-system.ts

Add reporting mapping (around line 563):

```typescript
if (component.includes("my-agent")) return "my-agent";
```

### 16. src/processors/processor-manager.ts

Add processor routing (around line 1389):

```typescript
agent: "my-agent",
```

### 17. src/processors/agents-md-validation-processor.ts

Add validation (around line 47):

```typescript
"@my-agent",
```

### 18. AGENTS-full.md

Add comprehensive agent documentation:
- Agent table entry
- Capabilities section
- Model routing config
- Skill routing

### 19. xray/agents_template.md

Consumer-facing AGENTS.md template deployed by `postinstall.cjs` (runs automatically on `npm install 0xray` or `npx 0xray install`).

### 20. src/scripts/profiling-demo.ts

Add profiling support (around line 49):

```typescript
const agents = ['enforcer', 'architect', 'my-agent', ...];
```

### 21. tests/validation/config-loader.sh

Add to expected_agents (around line 66):

```bash
expected_agents = ['enforcer', 'architect', 'my-agent', ...]
```

### 22. tests/validation/config-integration-tests.sh

Add to expected_agents (around line 135):

```bash
expected_agents = ['enforcer', 'architect', 'my-agent', ...]
```

### 23. src/__tests__/test-governance-systems.ts

Add test cases (around line 186):

```typescript
agentType: "my-agent",
```

### 24. docs/ADDING_AGENTS.md

Update the Current Agents List table with your new agent.

---

## Force-Add to Git

Agent files may be gitignored. Use `-f` to force add:

```bash
git add -f .opencode/agents/my-agent.yml
git add -f .opencode/agents/my-agent-*.md
```

---

## Reboot OpenCode

After adding, you MUST restart OpenCode for the agent to be recognized.

---

## Verification

After reboot, test with:

```
@my-agent hello
```

---

## Agent Removal Checklist

When removing an agent, you MUST update these files (reverse of adding):

| # | File | What to Remove |
|---|------|----------------|
| 1 | `opencode.json` | Agent entry in `agent` section |
| 2 | `.opencode/agents/{agent}.yml` | Agent YAML configuration file |
| 3 | `AGENTS.md` | Agent from the agents table |
| 4 | `README.md` | Agent from the agents table |
| 5 | `docs/README.md` | Agent from model routing config |
| 6 | `src/mcps/mcp-client.ts` | Server config + availableSkills |
| 7 | `src/mcps/knowledge-skills/skill-invocation.server.ts` | Skill enum |
| 8 | `src/delegation/task-skill-router.ts` | Task routing rules |
| 9 | `src/enforcement/rule-enforcer.ts` | Rule enforcement mapping |
| 10 | `src/orchestrator/orchestrator.ts` | Orchestration routing |
| 11 | `src/orchestrator/multi-agent-orchestration-coordinator.ts` | Coordination |
| 12 | `src/orchestrator/agent-spawn-governor.ts` | Spawn limits |
| 13 | `src/orchestrator/enhanced-multi-agent-orchestrator.ts` | Timeout config |
| 14 | `src/mcps/orchestrator.server.ts` | Agent capabilities |
| 15 | `src/reporting/framework-reporting-system.ts` | Reporting mapping |
| 16 | `src/processors/processor-manager.ts` | Processor routing |
| 17 | `src/processors/agents-md-validation-processor.ts` | Validation |
| 18 | `AGENTS-full.md` | Full agent documentation |
| 19 | `xray/agents_template.md` | Consumer agent documentation template |
| 20 | `src/scripts/profiling-demo.ts` | Profiling support |
| 21 | `tests/validation/config-loader.sh` | Config validation |
| 22 | `tests/validation/config-integration-tests.sh` | Integration tests |
| 23 | `src/__tests__/test-governance-systems.ts` | Governance tests |
| 24 | `scripts/node/setup.cjs` | Agent from 0xrayAgents array |

### Disable Instead of Remove (Recommended)

Instead of removing an agent completely, consider disabling it in `opencode.json`:

```json
"my-agent": {
  "disable": true,
  "note": "Reason for disabling"
}
```

This preserves the configuration for future reference while preventing the agent from being used.

### Removing vs Disabling

| Action | When to Use |
|--------|-------------|
| **Disable** | Agent is temporarily not needed, or replaced by another agent |
| **Remove** | Agent is completely obsolete and will never be used again |

---

---

**Version:** 3.0.0  
**Architecture:** v3 Three-Subsystem  
**Last Updated:** 2026-03-12
