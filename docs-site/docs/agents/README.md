# Agents

**Version**: 2.0.0

0xRay provides 42 specialized agents for AI governance, code quality, and automation. Each agent has a specific role and set of capabilities.

## Agent Types

| Agent | Purpose |
|-------|---------|
| `@enforcer` | Codex compliance & error prevention |
| `@orchestrator` | Complex multi-step task coordination |
| `@architect` | System design & technical decisions |
| `@security-auditor` | Vulnerability detection |
| `@code-reviewer` | Quality assessment |
| `@refactorer` | Technical debt elimination |
| `@testing-lead` | Testing strategy |
| `@bug-triage-specialist` | Error investigation |
| `@researcher` | Codebase exploration |
| `@frontend-engineer` | React, Vue, Angular, responsive design |
| `@backend-engineer` | REST/GraphQL APIs, microservices, auth |
| `@database-engineer` | SQL/NoSQL, query optimization |
| `@devops-engineer` | CI/CD, infrastructure, containers |
| `@mobile-developer` | iOS, Android, React Native, Flutter |
| `@content-creator` | Marketing copy, technical docs, blog posts |
| `@strategist` | System design, architecture decisions |
| `@performance-engineer` | Profiling, benchmarking, optimization |
| `@growth-strategist` | Growth hacking, user acquisition, analytics |
| `@seo-consultant` | SEO, keyword research, organic traffic |
| `@frontend-ui-ux-engineer` | Visual design, CSS, accessibility, UX |
| `@multimodal-looker` | Media file analysis & interpretation |
| `@log-monitor` | Log diagnostics |
| `@code-analyzer` | Code metrics analysis |
| `@librarian` | Knowledge management |
| `@document-writer` | Documentation authoring |
| `@general` | General-purpose multi-step tasks |

## Invocation

Agents are invoked via `@agent-name` in OpenCode:

```
@enforcer analyze this code
@orchestrator implement feature
@architect design API
```

## thinDispatch Routing

The Autonomous Engine routes tasks by complexity:

- **Simple** (≤15): Single agent
- **Moderate** (≤25): Single agent with tools
- **Complex** (≤50): Multi-agent coordination
- **Enterprise** (>50): Orchestrator-led team

## Related

- [Architecture](../architecture/) — Three-subsystem model
- [MCP Servers](../mcp/) — MCP skill servers
- [Agent Configuration](./AGENT_CONFIG) — Configuration reference
