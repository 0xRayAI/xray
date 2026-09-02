# Agents

**v4.0.1** — a suit that survives the context window

Organs, not the product. The product is the exo.

**42 YML surfaces** in `src/opencode/agents/*.yml`. Zero manual registration. Invoke via `@agent-name` in OpenCode.

Consumer projects receive a slimmed **AGENTS.md** (from `AGENTS-consumer.md`) on `npm install 0xray`.

## Core governance agents

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

## Engineering agents

| Agent | Purpose |
|-------|---------|
| `@frontend-engineer` | React, Vue, Angular, responsive design |
| `@backend-engineer` | REST/GraphQL APIs, microservices, auth |
| `@database-engineer` | SQL/NoSQL, query optimization |
| `@devops-engineer` | CI/CD, infrastructure, containers |
| `@mobile-developer` | iOS, Android, React Native, Flutter |
| `@frontend-ui-ux-engineer` | Visual design, CSS, accessibility, UX |
| `@performance-engineer` | Profiling, benchmarking, optimization |

## Knowledge & content agents

| Agent | Purpose |
|-------|---------|
| `@content-creator` | Marketing copy, technical docs |
| `@strategist` | System design, architecture decisions |
| `@growth-strategist` | Growth strategy, conversion |
| `@seo-consultant` | Technical SEO |
| `@tech-writer` | API docs, READMEs, changelogs |
| `@storyteller` | Narrative reflections, technical stories |
| `@multimodal-looker` | Media file analysis |

## Framework & ops agents

| Agent | Purpose |
|-------|---------|
| `@boot-orchestrator` | Framework boot orchestration |
| `@processor-pipeline` | Data processing pipelines |
| `@state-manager` | Session / state persistence |
| `@session-management` | Session lifecycle |
| `@inference-improve` | Autonomous inference improvement |
| `@model-health-check` | Model health diagnostics |
| `@framework-compliance-audit` | Framework compliance |
| `@log-monitor` | Log diagnostics |
| `@code-analyzer` | Code metrics, pattern detection |
| `@lint` | Code linting |
| `@auto-format` | Automated formatting |
| `@git-workflow` | Git workflow management |
| `@hermes-agent` | Hermes bridge operations |

## Skill-aligned agents

| Agent | Purpose |
|-------|---------|
| `@api-design` | REST/GraphQL API design |
| `@architecture-patterns` | Architecture patterns |
| `@performance-analysis` | Performance analysis |
| `@performance-optimization` | Performance optimization |
| `@project-analysis` | Project health metrics |
| `@security-scan` | Security vulnerability scanning |
| `@testing-best-practices` | Testing QA |
| `@ui-ux-design` | UI/UX design |

:::info
Removed from prior docs: `@librarian`, `@general`, `@document-writer` — not present in the YML SSOT. Use `@tech-writer` for documentation tasks.
:::

## Invocation

```
@enforcer analyze this code
@orchestrator implement feature
@architect design API
```

## thinDispatch Routing

- **Simple** (≤15): Single agent
- **Moderate** (≤25): Single agent with tools
- **Complex** (≤50): Multi-agent coordination
- **Enterprise** (>50): Orchestrator-led team

## Memory routing

Shipped on. See [Memory Routing](../guides/memory-routing.md).

## Related

- [4.0 vision](../architecture/v4-vision.md)
- [MCP Servers](../mcp/README.md) — 7 consumer MCP servers
- [SKILLS.md](https://github.com/0xRayAI/xray/blob/main/SKILLS.md)