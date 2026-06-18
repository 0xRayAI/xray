# 0xray Skills

**v3.4.6** — **45 skills** · invoked via `xray-skills` MCP · synced on postinstall

xray ships 45 knowledge skills (`src/skills/<name>/SKILL.md`) across the full software lifecycle. Lead-dev operating model lives in **`orchestrator`** skill + `multi_agent_orchestration.lead_dev_mode` in features.json. Skills load on demand via the **xray-skills** MCP server (`npx -y 0xray mcp skills`), agent `@mentions`, or platform skill directories after postinstall.

Consumer `npm install 0xray` syncs all 45 skills to Grok, Hermes, and OpenClaw skill dirs. Framework repo also ships this file to consumers (3.1.1+).

---

## Governance & Compliance

| Skill | Agent | Description |
|-------|-------|-------------|
| `code-review` | @code-reviewer | Proposal quality, code analysis, best practices |
| `security-audit` | @security-auditor | Vulnerability detection, threat modeling |
| `security-scan` | @security-auditor | Security vulnerability scanning and assessment |
| `enforcer` | @enforcer | Codex compliance validation and error prevention |
| `framework-compliance-audit` | — | Framework compliance auditing and validation |

## Architecture & Design

| Skill | Agent | Description |
|-------|-------|-------------|
| `architect-tools` | @architect | System design and technical architecture tools |
| `architecture-patterns` | — | Software architecture patterns and best practices |
| `api-design` | — | RESTful API design and validation |
| `database-engineer` | @database-engineer | SQL/NoSQL schema design, query optimization, migrations |
| `state-manager` | — | Application state management and persistence |
| `session-management` | — | User sessions and persistent state |

## Engineering

| Skill | Agent | Description |
|-------|-------|-------------|
| `backend-engineer` | @backend-engineer | REST/GraphQL APIs, microservices, auth, server architecture |
| `frontend-engineer` | @frontend-engineer | React/Vue/Angular/Svelte, responsive design, accessibility |
| `frontend-ui-ux-engineer` | @frontend-ui-ux-engineer | Visual design, CSS systems, accessibility, UX |
| `mobile-developer` | @mobile-developer | iOS, Android, React Native, Flutter |
| `devops-engineer` | @devops-engineer | CI/CD, IaC, containers, cloud deployment |

## Code Quality & Analysis

| Skill | Agent | Description |
|-------|-------|-------------|
| `code-analyzer` | @code-analyzer | Deep code analysis, metrics, pattern detection |
| `project-analysis` | — | Project structure, complexity, health metrics |
| `lint` | — | Code linting and static analysis |
| `auto-format` | — | Automated formatting and style consistency |
| `refactoring-strategies` | @refactorer | Refactoring techniques and strategies |

## Testing

| Skill | Agent | Description |
|-------|-------|-------------|
| `testing-strategy` | @testing-lead | Comprehensive testing strategies and coverage |
| `testing-best-practices` | — | Testing best practices and QA patterns |

## Performance

| Skill | Agent | Description |
|-------|-------|-------------|
| `performance-analysis` | — | System performance analysis |
| `performance-engineer` | @performance-engineer | Profiling, benchmarking, load testing |
| `performance-optimization` | — | Application performance tuning |

## Debugging & Monitoring

| Skill | Agent | Description |
|-------|-------|-------------|
| `bug-triage` | @bug-triage-specialist | Bug triage, debugging, issue prioritization |
| `log-monitor` | @log-monitor | Log analysis, pattern detection, alerting |
| `model-health-check` | — | AI model health monitoring and diagnostics |

## Orchestration & Workflow

| Skill | Agent | Description |
|-------|-------|-------------|
| `orchestrator` | @orchestrator | Multi-agent coordination + **lead-dev mode** (codex 67–68) |
| `xray-orchestrator` | — | xray orchestration skill (MCP orchestrator surface) |
| `processor-pipeline` | — | Data processing pipeline management |
| `boot-orchestrator` | — | Framework boot orchestration |

## Research & Content

| Skill | Agent | Description |
|-------|-------|-------------|
| `researcher` | @researcher | Codebase exploration, implementation lookup |
| `content-creator` | @content-creator | Marketing copy, technical docs, SEO content |
| `tech-writer` | @tech-writer | API docs, READMEs, ADRs, changelogs |
| `storyteller` | @storyteller | Narrative reflections, sagas, technical stories |
| `seo-consultant` | @seo-consultant | Technical SEO, schema markup, Core Web Vitals |
| `growth-strategist` | @growth-strategist | Campaign strategy, market analysis, conversion |

## UX & Design

| Skill | Agent | Description |
|-------|-------|-------------|
| `ui-ux-design` | — | Mobile-first, cognitive simplicity, accessibility |
| `multimodal-looker` | @multimodal-looker | Diagrams, screenshots, UI mockup analysis |

## Strategy & Inference

| Skill | Agent | Description |
|-------|-------|-------------|
| `strategist` | @strategist | Architecture decisions, risk analysis |
| `inference-improve` | — | Autonomous inference improvement |

## Git, Workflow & Integration

| Skill | Agent | Description |
|-------|-------|-------------|
| `git-workflow` | — | Git workflow and collaboration |
| `hermes-agent` | @hermes-agent | Hermes Agent bridge operations |

---

## Invoking Skills

### Via agent (OpenCode / chat)

```
@code-reviewer review this PR
@researcher find where auth is implemented
```

### Via xray-skills MCP (13 tools)

Configured in project `.mcp.json` on postinstall:

```bash
npx -y 0xray mcp skills    # stdio server
```

MCP tools include: `invoke-skill`, `list-skills`, `skill-code-review`, `skill-security-audit`, `skill-api-design`, `skill-testing-strategy`, and more.

### Install additional skill packs

```bash
npx 0xray skill:install
npx 0xray skill:install <source>
```

## Skill locations

| Context | Path |
|---------|------|
| Source (framework) | `src/skills/<name>/SKILL.md` |
| Published package | `node_modules/0xray/dist/skills/<name>/SKILL.md` |
| OpenCode (after setup) | `.opencode/skills/<name>/SKILL.md` |
| Grok | `~/.grok/skills/<name>/SKILL.md` + plugin dir |
| Hermes / OpenClaw | Platform skill dirs (postinstall sync) |

## Related features (since 3.1)

| Feature | Skill connection |
|---------|------------------|
| **Memory routing** (v3.3) | Researcher uses Repertoire signals; optional `@0xray/repertoire` MCP |
| **AsideContext** (v3.2) | Orchestrator subcontexts during skill dispatch |
| **7 MCP servers** (v3.4.1) | `xray-skills` is the primary skill invocation surface |

Docs: [AGENTS.md](AGENTS.md) · [README.md](README.md) · [Docusaurus guides](docs-site/docs/guides/)

## Complete catalog (45)

`api-design` · `architect-tools` · `architecture-patterns` · `auto-format` · `backend-engineer` · `boot-orchestrator` · `bug-triage` · `code-analyzer` · `code-review` · `content-creator` · `database-engineer` · `devops-engineer` · `enforcer` · `framework-compliance-audit` · `frontend-engineer` · `frontend-ui-ux-engineer` · `git-workflow` · `growth-strategist` · `hermes-agent` · `inference-improve` · `lint` · `log-monitor` · `mobile-developer` · `model-health-check` · `multimodal-looker` · `orchestrator` · `performance-analysis` · `performance-engineer` · `performance-optimization` · `processor-pipeline` · `project-analysis` · `refactoring-strategies` · `researcher` · `security-audit` · `security-scan` · `seo-consultant` · `session-management` · `state-manager` · `storyteller` · `strategist` · `tech-writer` · `testing-best-practices` · `testing-strategy` · `ui-ux-design` · `xray-orchestrator`