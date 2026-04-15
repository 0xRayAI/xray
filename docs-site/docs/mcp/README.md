# MCP Server Overview

**Version**: 1.22.13

0xRay provides 39 MCP (Model Context Protocol) servers that expose agent capabilities as tools for the OpenCode framework.

## Server Categories

| Category | Count | Description |
|----------|-------|-------------|
| Infrastructure | 15 | Core framework operations |
| Knowledge Skills | 25 | Specialized domain expertise |

## Quick Reference

| Server | Category | Purpose |
|--------|----------|---------|
| `orchestrator.server.ts` | Infrastructure | Multi-agent workflow coordination |
| `boot-orchestrator.server.ts` | Infrastructure | Framework initialization |
| `processor-pipeline.server.ts` | Infrastructure | Pre/post processor execution |
| `enforcer-tools.server.ts` | Infrastructure | Codex compliance enforcement |
| `architect-tools.server.ts` | Infrastructure | System design tools |
| `researcher.server.ts` | Infrastructure | Codebase exploration |
| `security-scan.server.ts` | Infrastructure | Security vulnerability detection |
| `code-analyzer.server.ts` | Knowledge | Deep code analysis |
| `api-design.server.ts` | Knowledge | REST/GraphQL API design |
| `devops-deployment.server.ts` | Knowledge | CI/CD and deployment |
| `database-design.server.ts` | Knowledge | Schema and optimization |
| `frontend-ui-ux-engineer.server.ts` | Knowledge | UI/UX design |
| `mobile-development.server.ts` | Knowledge | iOS/Android/React Native |
| `performance-optimization.server.ts` | Knowledge | Performance profiling |
| `testing-strategy.server.ts` | Knowledge | Test architecture |

## Detailed Documentation

- [Infrastructure MCP Servers](./infrastructure.md) - 15 core framework servers
- [Knowledge Skills MCP Servers](./knowledge-skills.md) - 24 specialized skill servers

## Usage

MCP servers are automatically loaded by the framework and exposed as tools to agents. Each server provides specific capabilities that can be invoked through the OpenCode tool interface.

## Server Status

All 40 MCP servers are active and operational in v1.22.13.