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
- Location: `docs/deep-reflections/`
- Examples: `kernel-v2.0-skill-system-fix-journey.md`, `typescript-build-fix-journey-2026-03-09.md`

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

## Codex

StringRay enforces Universal Development Codex (60 terms) for systematic error prevention. See [.opencode/strray/codex.json](https://github.com/htafolla/stringray/blob/master/.opencode/strray/codex.json) for full reference.

## Documentation

- [Full Documentation](https://github.com/htafolla/stringray)
- [Configuration Guide](https://github.com/htafolla/stringray/blob/master/docs/CONFIGURATION.md)
- [Troubleshooting](https://github.com/htafolla/stringray/blob/master/docs/TROUBLESHOOTING.md)

---
**Version**: 1.7.8 | [GitHub](https://github.com/htafolla/stringray)
### What Else?

### Framework Configuration Limits

While StringRay provides extensive configuration options, some settings may have limitations in consumer environments:

- **Features.json Location**: In consumer installations, `.opencode/strray/features.json` is automatically loaded from the package, not from project root. To modify features, use: `npx strray-ai config set --feature my-feature --value true`
- **Codex Updates**: In consumer mode, the Universal Development Codex version (v1.7.8) is frozen for stability. Dynamic updates from MCP servers are disabled.
- **Plugin Behavior**: The OpenCode plugin (`strray-codex-injection`) has reduced functionality in consumer mode:
  - No dynamic codex term enrichment from MCP servers
  - Fixed codex version used (fallback: v1.7.5)
  - No MCP server discovery
  - No plugin status indicators
  - No real-time tool discovery

### Consumer-Specific Behaviors

When `strray-ai` is installed as a dependency in your project (consumer environment):

- **Postinstall Behavior**: The `postinstall.cjs` script automatically:
  1. Copies `.opencode/AGENTS-consumer.md` to your `.opencode/` directory
  2. Creates symlinks for `scripts/` → `node_modules/strray-ai/scripts`
  3. Copies `.opencode/strray/` → `node_modules/strray-ai/.strray/`
  4. Configures paths for consumer package structure

- **Configuration Discovery**: Framework detects consumer installation and automatically:
  1. Uses `.opencode/.opencode/` for configuration files
  2. Falls back to `node_modules/strray-ai/dist/` for plugins
  3. Adjusts relative paths for consumer installations

- **What You Experience**:
  - Full agent capabilities with codex enrichment
  - Complete framework with v2.0 analytics integration
  - Production-grade stability and error prevention
  - All features fully functional

### Development vs Consumer Deployment

**Development Mode** (`npx strray-ai install` in your project):
- Full feature availability
- Latest codex terms and context
- Dynamic agent discovery from MCP servers
- Real-time plugin capabilities
- Hot-reload on configuration changes
- Complete script documentation and tooling
- Intended for active development

**Consumer Mode** (installing `strray-ai` as dependency):
- Optimized installation with minimal AGENTS.md (322 lines vs 89 lines in dev)
- Production-grade stability
- Reduced feature set for predictability
- No hot-reload capability (configuration is read-only at install time)

**Recommendation**: For full development experience with all features, develop locally using `npx strray-ai install`. Consumer mode is designed for production deployments and optimized distribution.

### Key Differences Summary

| Aspect | Development | Consumer |
|--------|-----------|----------|
| AGENTS.md Size | 89 lines (comprehensive) | 322 lines (minimal) |
| Codex Version | Latest with updates | Fallback v1.7.5 |
| Agent Discovery | Dynamic (MCP servers) | Static only |
| Plugin Capabilities | Full | Reduced (no hot-reload) |
| Hot Reload | ✓ | ✗ |
| Configuration | Development | Consumer |
| Documentation | Minimal | Full |

**Note**: The consumer version is intentionally minimal to reduce complexity and ensure stability for production deployments. It provides all core functionality but with fewer documentation sections to match the production-focused approach.

---

## Documentation

- [Full Documentation](https://github.com/htafolla/stringray)
- [Configuration Guide](https://github.com/htafolla/stringray/blob/master/docs/CONFIGURATION.md)
- [Troubleshooting](https://github.com/htafolla/stringray/blob/master/docs/TROUBLESHOOTING.md)

---
**Version**: 1.7.8 | [GitHub](https://github.com/htafolla/stringray)
