# 0xray Skills

xray ships **45 skills** that provide domain expertise across the full software lifecycle. Skills are loaded on demand and invoked via MCP servers, agents, or direct API.

---

## Governance & Compliance

| Skill | Agent | Description |
|-------|-------|-------------|
| `code-review` | @code-reviewer | Proposal quality, code analysis, best practices |
| `security-audit` | @security-auditor | Vulnerability detection, threat modeling |
| `security-scan` | — | Security vulnerability scanning and assessment |
| `enforcer` | @enforcer | Codex compliance validation and error prevention |
| `framework-compliance-audit` | — | Framework compliance auditing and validation |

## Architecture & Design

| Skill | Agent | Description |
|-------|-------|-------------|
| `architect-tools` | — | System design and technical architecture tools |
| `architecture-patterns` | — | Software architecture patterns and best practices |
| `api-design` | — | RESTful API design and validation |
| `database-engineer` | — | SQL/NoSQL schema design, query optimization, migrations |
| `state-manager` | — | Application state management and persistence |
| `session-management` | — | Manage user sessions and persistent state |

## Engineering

| Skill | Agent | Description |
|-------|-------|-------------|
| `backend-engineer` | — | REST/GraphQL APIs, microservices, auth, server architecture |
| `frontend-engineer` | — | React/Vue/Angular/Svelte, responsive design, accessibility |
| `frontend-ui-ux-engineer` | — | Visual design, CSS systems, accessibility, UX |
| `mobile-developer` | — | iOS (Swift/SwiftUI), Android (Kotlin/Compose), RN, Flutter |
| `devops-engineer` | — | CI/CD, IaaC, containers, cloud deployment, reliability |

## Code Quality & Analysis

| Skill | Agent | Description |
|-------|-------|-------------|
| `code-analyzer` | — | Deep code analysis, metrics extraction, pattern detection |
| `project-analysis` | — | Analyze project structure, complexity, and health metrics |
| `lint` | — | Code linting and static analysis |
| `auto-format` | — | Automated code formatting and style consistency |
| `refactoring-strategies` | @refactorer | Code refactoring techniques and strategies |

## Testing

| Skill | Agent | Description |
|-------|-------|-------------|
| `testing-strategy` | @testing-lead | Comprehensive testing strategies and coverage |
| `testing-best-practices` | — | Testing best practices and patterns |

## Performance

| Skill | Agent | Description |
|-------|-------|-------------|
| `performance-analysis` | — | System performance analysis and optimization |
| `performance-engineer` | — | Profiling, benchmarking, load testing, optimization |
| `performance-optimization` | — | Application performance optimization and tuning |

## Debugging & Monitoring

| Skill | Agent | Description |
|-------|-------|-------------|
| `bug-triage` | @bug-triage-specialist | Bug triage, debugging analysis, issue prioritization |
| `log-monitor` | — | Log analysis, pattern detection, alerting |
| `model-health-check` | — | AI model health monitoring and diagnostics |

## Orchestration & Workflow

| Skill | Agent | Description |
|-------|-------|-------------|
| `orchestrator` | @orchestrator | Multi-agent workflow coordination and task delegation |
| `xray-orchestrator` | — | Main orchestration skill for xray agents |
| `processor-pipeline` | — | Data processing pipeline management |
| `boot-orchestrator` | — | Framework initialization and boot orchestration |

## Research & Content

| Skill | Agent | Description |
|-------|-------|-------------|
| `researcher` | @researcher | Codebase exploration, implementation lookup |
| `content-creator` | — | Marketing copy, technical docs, blog posts, social media |
| `tech-writer` | — | API docs, READMEs, ADRs, changelogs, DX |
| `storyteller` | — | Deep narrative reflections, sagas, technical stories |
| `seo-consultant` | — | Technical SEO, schema markup, Core Web Vitals |
| `growth-strategist` | — | Campaign strategy, market analysis, brand positioning |

## UX & Design

| Skill | Agent | Description |
|-------|-------|-------------|
| `ui-ux-design` | — | Mobile-first, cognitive simplicity, accessibility-first |
| `multimodal-looker` | — | Visual content analysis for diagrams, screenshots, UI mockups |

## Strategy

| Skill | Agent | Description |
|-------|-------|-------------|
| `strategist` | @strategist | Strategic guidance, architectural decisions, risk analysis |
| `inference-improve` | — | Autonomous inference improvement through collaborative analysis |

## Git & Workflow

| Skill | Agent | Description |
|-------|-------|-------------|
| `git-workflow` | — | Git workflow management and collaboration tools |

## Integration

| Skill | Agent | Description |
|-------|-------|-------------|
| `hermes-agent` | — | Manage xray from Hermes Agent via native plugin |

---

## Invoking Skills

Skills are invoked automatically by agents or via MCP:

```bash
# Via agent mention (in any chat)
@code-reviewer review this PR

# Via MCP tool call
npx xray mcp call code-review analyze_code_quality --args '{"path": "src/"}' 

# Via direct agent
npx xray agent run @refactorer "optimize src/core/"
```

## Skill Locations

Each skill has a `SKILL.md` with full reference:

- **Source**: `src/skills/<name>/SKILL.md`
- **Consumer**: `node_modules/0xray/dist/skills/<name>/SKILL.md`
- **Opend**: `.opencode/skills/<name>/SKILL.md` (copied on `npx xray setup`)
