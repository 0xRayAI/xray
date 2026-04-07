---
slug: /
title: "StringRay - Enterprise AI Orchestration Framework"
sidebar_position: 0
---

# ⚡ StringRay

**Enterprise AI Orchestration Framework for OpenCode**

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STRINGRAY ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│    │   AGENTS    │    │   PLUGINS   │    │   PROCESSORS│                 │
│    │             │    │             │    │             │                 │
│    │  @enforcer  │    │  Discovery  │    │ Pre-Validate│                 │
│    │  @architect │    │  Lifecycle  │    │ CodexCompl  │                 │
│    │  @orchestrat│    │  MCP Reg    │    │ TestAuto    │                 │
│    │  @bug-triage│    │             │    │ Regression  │                 │
│    │  @code-revw │    │             │    │ ...         │                 │
│    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│           │                   │                   │                        │
│           └───────────────────┼───────────────────┘                        │
│                               ▼                                            │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                    TASK ROUTING                                 │     │
│    │     Skill-based routing → Agent delegation → Execution         │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│                               │                                            │
│                               ▼                                            │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                    OUTPUT                                         │     │
│    │     Codex-compliant, validated, enterprise-ready code           │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│    25 AGENTS  •  44 SKILLS  •  15 MCP SERVERS  •  20 PROCESSORS            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# Install in your project
npx strray-ai install

# Check health
npx strray-ai health

# Use an agent
@enforcer analyze this code
```

---

## 🎯 What StringRay Does

| Feature | Description |
|---------|-------------|
| **Multi-Agent Orchestration** | Coordinates 25 specialized agents for different tasks |
| **Codex Compliance** | 60 validation rules preventing errors before they happen |
| **Auto-Delegation** | Intelligent task routing to the right agent |
| **Plugin System** | Extensible architecture with auto-discovery |
| **Processors** | 20 pre/post processors for code validation and testing |

---

## 📚 Documentation

<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem'}}>

### Getting Started
- [Installation Guide](/docs/guides/installation/installation)
- [Configuration](/docs/guides/configuration)
- [Quick Start](/docs/guides/getting-started/getting-started)

### Architecture
- [Overview](/docs/architecture)
- [Boot Pipeline](/docs/architecture/pipelines/boot-pipeline-tree)
- [Plugin System](/docs/development/plugin-system)

### Agents
- [Enforcer](/docs/agents/enforcer)
- [Architect](/docs/agents/architect)
- [Orchestrator](/docs/agents/orchestrator)
- [All Agents](/docs/agents)

### Reference
- [CLI Commands](/docs/reference/commands)
- [API Reference](/docs/api)
- [Releases](/docs/releases)

</div>

---

## 🛠️ Available Agents

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         25 SPECIALIZED AGENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CORE (7)              │  DOMAIN (18)                                      │
│  ─────────────────────┼───────────────────────────                        │
│  @enforcer            │  @frontend-engineer    @database-engineer         │
│  @architect           │  @backend-engineer     @devops-engineer          │
│  @orchestrator        │  @mobile-developer    @performance-engineer     │
│  @bug-triage-specialist│ @seo-consultant      @content-creator           │
│  @code-reviewer       │  @growth-strategist   @tech-writer               │
│  @security-auditor     │  @multimodal-looker   @code-analyzer             │
│  @refactorer          │  @log-monitor        @storyteller                │
│                       │  @testing-lead       @researcher                  │
│                       │  ...                  ...                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Agents | 25 |
| Skills | 44 |
| MCP Servers | 15+ |
| Processors | 20 |
| Tests | 2448 |
| Error Prevention | 99.6% |

---

## 🔗 Links

- [GitHub](https://github.com/htafolla/StringRay)
- [npm](https://npmjs.com/package/strray-ai)
- [OpenCode](https://opencode.ai)
