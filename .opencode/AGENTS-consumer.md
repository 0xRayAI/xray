# StringRay Agents

Quick reference for StringRay AI orchestration framework.

## What is StringRay?

StringRay provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation. Agents operate via OpenCode plugin injection - no manual setup needed.

## How StringRay Works

StringRay provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation. Agents operate via OpenCode plugin injection - no manual setup needed.

### Basic Operation

1. **Install**: Run `npx strray-ai install` to configure agents in your project
2. **Invoke**: Use `@agent-name` syntax in prompts or code comments (e.g., `@architect design this API`)
3. **Automatic Routing**: StringRay automatically routes tasks to the appropriate agent based on complexity
4. **Agent Modes**: Agents can be `primary` (main coordinator) or `subagent` (specialized helper)

### Where to Find Reflections

Deep reflection documents capture development journeys and lessons learned:
- **Location**: `docs/reflections/` (main) and `docs/deep-reflections/` (detailed)
- **Examples**: `kernel-v2.0-skill-system-fix-journey.md`, `typescript-build-fix-journey-2026-03-09.md`, `stringray-framework-deep-reflection-v1.4.21.md`

These documents capture:
- Technical challenges encountered and solved
- Architectural decisions made
- Lessons learned for future development
- Best practices established

### Reflection Template Paths

**Template Location**: `docs/reflections/` and `docs/deep-reflections/`

**Naming Convention**: `{YYYY-MM-DD}-{feature-name}.md`

**Example Files**:
- `docs/reflections/stringray-framework-deep-reflection-v1.4.21.md`
- `docs/deep-reflections/typescript-build-fix-journey-2026-03-09.md`
- `docs/deep-reflections/kernel-v2.0-skill-system-fix-journey.md`

Each reflection document includes:
1. Executive Summary
2. The Journey in Retrospective
3. Technical Deep Dive
4. Cognitive Insights
5. Strategic Implications
6. Key Metrics and Impact
7. Looking Forward
8. Lessons Learned
9. Acknowledgments
10. Final Thoughts

## Available Agents

| Agent | Purpose | Invoke |
|-------|---------|--------|
| `@enforcer` | Codex compliance & error prevention | `@enforcer analyze this code` |
| `@orchestrator` | Complex multi-step task coordination | `@orchestrator implement feature` |
| `@architect` | System design & technical decisions | `@architect design API` |
| `@security-auditor` | Vulnerability detection | `@security-auditor scan` |
| `@code-reviewer` | Quality assessment | `@code-reviewer review PR` |
| `@refactorer` | Technical debt elimination | `@refactorer optimize code` |
| `@testing-lead` | Testing strategy | `@testing-lead plan tests` |
| `@bug-triage-specialist` | Error investigation | `@bug-triage-specialist debug error` |
| `@researcher` | Codebase exploration | `@researcher find implementation` |

## Complexity Routing

StringRay automatically routes tasks based on complexity:

- **Simple (≤20)**: Single agent
- **Moderate (21-35)**: Single agent with tools
- **Complex (36-75)**: Multi-agent coordination  
- **Enterprise (>75)**: Orchestrator-led team

## CLI Commands

```bash
npx strray-ai install       # Install and configure
npx strray-ai status       # Check configuration
npx strray-ai health        # Health check
npx strray-ai validate      # Validate installation
npx strray-ai capabilities # Show all features
npx strray-ai report        # Generate reports
npx strray-ai analytics    # Pattern analytics
npx strray-ai calibrate    # Calibrate complexity
```

## Features.json Configuration

StringRay uses `.opencode/strray/features.json` for feature flags and settings:

### Location
- **Path**: `.opencode/strray/features.json`
- **Consumer Path**: When installed as npm package, loaded from `node_modules/strray-ai/.opencode/strray/features.json`

### Key Features
- `token_optimization` - Context token management
- `model_routing` - AI model routing
- `batch_operations` - File batch processing
- `multi_agent_orchestration` - Agent coordination
- `autonomous_reporting` - Automatic reporting
- `activity_logging` - Activity logging configuration
- `security` - Security settings
- `performance_monitoring` - Performance tracking

### Modifying Features
To modify features in consumer installations:
```bash
# View current features
cat .opencode/strray/features.json

# Set feature via CLI
npx strray-ai config set --feature token_optimization.enabled --value false
```

## Agent Discovery & Capabilities

### First-Time Agent Context

When agents are first spawned:
- **Zero Context**: Agents start with minimal initial context
- **Discovery Happens**: Agents discover available tools through MCP servers
- **State Builds**: Over time, agents build comprehensive knowledge graph

### Static vs Dynamic Discovery

**Static Discovery** (Immediate):
- Source: `.opencode/agents/` directory
- Speed: Fast - scans local directory
- Scope: Only locally configured agents

**Dynamic Discovery** (After Startup):
- Source: MCP Protocol via `mcp-client.ts`
- Process: Loads config → Connects to servers → Lists tools → Makes available
- Scope: Full agent capabilities with MCP server tools

### Access & Permissions Pipeline

**Load Priority**:
1. Development: `node_modules/strray-ai/dist/` (most current)
2. Consumer: Falls back to `dist/` directory
3. Configuration: `.opencode/strray/features.json`

**Spawn Authorization**:
- Only main orchestrator can spawn agents
- Subagents cannot spawn other agents
- Workers cannot spawn agents directly

## Activity Log & Reporting

### Activity Logging

**Location**: `.opencode/logs/` directory
- **File Format**: `strray-plugin-YYYY-MM-DD.log`
- **Enabled by**: `activity_logging` feature in features.json

### Report Generation

**CLI Command**:
```bash
# Generate daily report
npx strray-ai report --daily

# Generate performance report
npx strray-ai report --performance

# Generate compliance report
npx strray-ai report --compliance
```

**Report Types**:
- Daily reports: Agent invocations, task completions
- Performance reports: Response times, resource usage
- Compliance reports: Codex violations, agent performance

## Skill Scripts & Agent Registry

### Agent Registry

**Location**: `scripts/node/agent-registry.js`
- **Purpose**: Register new custom agents
- **Usage**: Add to `.opencode/agents/` and auto-discovered

### Custom Skills

**Adding Custom Agents**:
1. Create skill file in `.opencode/agents/`
2. Export handler function
3. Auto-available to agents

**Example**:
```javascript
// .opencode/agents/my-custom-skill.js
module.exports = async (context, tool) => {
  return { result: "Skill executed", data: {} };
};
```

## Codex

StringRay enforces Universal Development Codex (60 terms) for systematic error prevention. See [.opencode/strray/codex.json](https://github.com/htafolla/stringray/blob/master/.opencode/strray/codex.json) for full reference.

## Framework Configuration Limits

### Consumer Environment Limitations

- **Features.json**: Automatically loaded from package, not project root
- **Codex Version**: Frozen at v1.7.5 in consumer mode (stable)
- **Plugin Behavior**: Reduced functionality in consumer mode:
  - No dynamic codex term enrichment
  - Fixed codex version
  - No MCP server discovery
  - No real-time tool discovery

### Development vs Consumer

| Aspect | Development | Consumer |
|--------|-----------|----------|
| Features | Full (latest) | Optimized (stable) |
| Codex | Latest terms | v1.7.5 fallback |
| Discovery | Dynamic (MCP) | Static only |
| Hot Reload | Yes | No |

## Documentation

- [Full Documentation](https://github.com/htafolla/stringray)
- [Configuration Guide](https://github.com/htafolla/stringray/blob/master/docs/CONFIGURATION.md)
- [Troubleshooting](https://github.com/htafolla/stringray/blob/master/docs/TROUBLESHOOTING.md)

---
**Version**: 1.7.8 | [GitHub](https://github.com/htafolla/stringray)
