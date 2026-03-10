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

- **Note**: The consumer version is intentionally minimal to reduce complexity and ensure stability for production deployments. It provides all core functionality but with fewer documentation sections to match the production-focused approach.

### Reflection Template Examples

Reflection templates follow a consistent structure for documenting development sessions. When creating a new reflection document, use these templates as a guide:

#### Template Structure

Each reflection document should include:

1. **Executive Summary** - 2-3 paragraph overview of what was accomplished
2. **The Journey in Retrospective** - Context and sequence of events
3. **Technical Deep Dive** - Code analysis and architectural decisions
4. **Cognitive Insights** - What was learned
5. **Strategic Implications** - Long-term impact
6. **Key Metrics and Impact** - Quantitative results
7. **Looking Forward** - Questions raised, strategic directions
8. **Lessons Learned** - Takeaways and best practices
9. **Acknowledgments** - Recognition of contributions
10. **Final Thoughts** - Overall conclusions

#### Template Creation Tips

1. **Document immediately** after completing major work
2. **Be specific** - Focus on technical decisions made, challenges solved
3. **Include metrics** - Quantitative data, impact numbers
4. **Use clear structure** - Consistent sections, clear hierarchy
5. **Provide examples** - Concrete code snippets, configuration examples
6. **List lessons** - Specific takeaways for future reference
7. **Acknowledge contributions** - Credit team and community input
8. **Consider time** - Record what worked, what didn't

**Note**: These sections provide template paths and structure. See **"Where to Find Reflection Templates"** section above for more details on when and how to use reflection templates.

---

## Documentation

- [Full Documentation](https://github.com/htafolla/stringray)
- [Configuration Guide](https://github.com/htafolla/stringray/blob/master/docs/complete)
- [Troubleshooting](https://github.com/htafolla/stringray/blob/master/docs/TROUBLESHOOTING.md)

---
**Version**: 1.7.8 | [GitHub](https://github.com/htafolla/stringray)

### Where to Find Skill Scripts

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

### Where to Find Reflection Templates

Reflection templates provide structure for documenting development sessions:
- **Location**: `docs/deep-reflections/` directory
- **Naming Convention**: `{YYYY-MM-DD}-{feature-name}.md` format
- **When to Create**: After major features, releases, or significant debugging sessions

#### Template Structure

Each reflection document should include these sections:
1. **Executive Summary** - 2-3 paragraph overview
2. **The Journey in Retrospective** - Context and sequence of events
3. **Technical Deep Dive** - Code analysis
4. **Cognitive Insights** - What was learned
5. **Strategic Implications** - Long-term impact
6. **Key Metrics and Impact** - Quantitative results
7. **Looking Forward** - Future directions
8. **Lessons Learned** - Takeaways
9. **Acknowledgments** - Recognition of contributions
10. **Final Thoughts** - Conclusions

#### Reflection Template Examples

See the "Reflection Template Examples" section below for concrete examples.

### Where to Find Reflection Templates

Reflection templates follow a consistent structure for documenting development sessions. When creating a new reflection document, use these templates as a guide:

#### Template Structure

Each reflection document should include:

1. **Executive Summary** - 2-3 paragraph overview of what was accomplished
2. **The Journey in Retrospective** - Context, sequence, what started it
3. **Technical Deep Dive** - Code analysis, architecture, implementation details
4. **Cognitive Insights** - What surprised, what was learned
5. **Strategic Implications** - Long-term impact, architectural decisions
6. **Key Metrics and Impact** - Quantitative results
7. **Looking Forward** - Questions for future, strategic directions
8. **Lessons Learned** - Specific takeaways, best practices
9. **Acknowledgments** - Recognition of contributions
10. **Final Thoughts** - Overall conclusions

#### Reflection Template Examples

**Example 1: Simple Build Fix**

```markdown
# Deep Reflection: TypeScript Build Fix Journey

**Date**: 2026-03-09
**Session Focus**: TypeScript Build Error Resolution, Test Suite Improvements
**Reflection Type**: Technical, Quality, Process

---

## The Journey in Retrospective

What began as a routine build issue evolved into a comprehensive debugging campaign that touched every corner of StringRay framework. The session spanned from build system diagnostics through analytics architecture, PostProcessor triggers, and routing configuration.

### Technical Deep Dive

#### The Missing Export Crisis

The build errors pointed to fundamental gaps in module exports...

[... rest of template content ...]

---

## 🌅 Looking Forward

### Questions Raised
1. **How do we document plugins that may not always be present?**
2. **What's the right balance between simplicity and completeness?**
```

---

**Session Summary**:
- TypeScript Errors Fixed: 34 → 0
- Tests Passing: 80 → 1,608 (+1,909% improvement)
- Files Modified: 21 core files
```

**What's Next**:
- Consider reflection template documentation strategy
- Evaluate whether all agent discovery mechanisms need examples
- Document features.json structure and usage patterns
```

**File Location**: `docs/deep-reflections/typescript-build-fix-journey-2026-03-09.md`
```

**Example 2: Kernel Integration**

```markdown
# Deep Reflection: Kernel v2.0 Integration

**Date**: 2026-03-08
**Session Focus**: Analytics Integration, Pattern Learning, Kernel Architecture
**Reflection Type**: Architectural, Feature Implementation

---

## The Journey in Retrospective

[... rest of template ...]

**File Location**: `docs/deep-reflections/kernel-v2.0-integration-journey-2026-03-08.md`
```

---

## Documentation

- [Full Documentation](https://github.com/htafolla/stringray)
- [Configuration Guide](https://github.com/htafolla/stringray/blob/master/docs/CONFIGURATION.md)
- [Troubleshooting](https://github.com/htafolla/stringray/blob/master/docs/TROUBLESHOOTING.md)

---
**Version**: 1.7.8 | [GitHub](https://github.com/htafolla/stringray)
```

#### Key Templates Available

**Feature Development**: `docs/deep-reflections/typescript-build-fix-journey-2026-03-09.md`
**Architecture**: `docs/deep-reflections/kernel-v2.0-skill-system-fix-journey.md`
**Testing Strategy**: `docs/deep-reflections/p9-adaptive-learning-journey-2026-03-08.md`
**Analytics Integration**: `docs/deep-reflections/analytics-pattern-learning-integration-journey-2026-03-09.md`

#### Template Creation Tips

1. **Document immediately** after completing major work
2. **Be specific** - Focus on technical decisions made, challenges solved
3. **Include metrics** - Quantitative data, impact numbers
4. **Use clear structure** - Consistent sections, clear hierarchy
5. **Provide examples** - Concrete code snippets, configuration examples
6. **List lessons** - Specific takeaways for future reference
7. **Acknowledge contributions** - Credit team and community input
8. **Consider time** - Record what worked, what didn't
9. **Keep it actionable** - Include recommendations for future work

---

**Note**: This section provides template examples. For reflection template paths, naming conventions, and format guidance, see the **"Where to Find Reflections"** section above.
