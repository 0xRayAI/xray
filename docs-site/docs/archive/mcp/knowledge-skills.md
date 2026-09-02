# Knowledge Skills

0xRay includes **44 knowledge skills** — declarative SKILL.md files that provide specialized domain expertise for agents. These are loaded at runtime by the `skill-invocation` MCP server.

Unlike the framework MCP servers (which are Node.js `.server.js` files with tool endpoints), knowledge skills are plain markdown files that provide contextual instructions to agents. They are not standalone MCP servers.

## Skill List

api-design, architect-tools, architecture-patterns, auto-format, backend-engineer, boot-orchestrator, bug-triage, code-analyzer, code-review, content-creator, database-engineer, devops-engineer, enforcer, framework-compliance-audit, frontend-engineer, frontend-ui-ux-engineer, git-workflow, growth-strategist, hermes-agent, inference-improve, lint, log-monitor, mobile-developer, model-health-check, multimodal-looker, orchestrator, performance-analysis, performance-engineer, performance-optimization, processor-pipeline, project-analysis, refactoring-strategies, researcher, security-audit, security-scan, seo-consultant, session-management, state-manager, storyteller, strategist, tech-writer, testing-best-practices, testing-strategy, ui-ux-design

## Usage

Skills are invoked automatically by agents. You can also browse and install additional skill packs:

```bash
npx 0xray skill:install
```

## Marketplace

The 13 most commonly used skills are exposed as tools through the [xray-skills MCP server](./) for use in any MCP-compatible client (Grok, OpenCode, etc.).
