# Agent Configuration Guide

This guide explains how to configure agents in your `opencode.json` for StringRay.

## Default Configuration

StringRay automatically configures these core agents when you install `strray-ai`. The postinstall script copies `opencode.json` to your project root with all agents enabled by default.

## Copy-Paste Agent Configuration

Add this section to your `opencode.json` to enable all StringRay agents:

```json
"agent": {
  "enforcer": {
    "temperature": 1.0,
    "mode": "primary"
  },
  "architect": {
    "temperature": 1.0,
    "mode": "subagent"
  },
  "orchestrator": {
    "temperature": 1.0,
    "mode": "subagent"
  },
  "test-architect": {
    "temperature": 1.0,
    "mode": "subagent"
  },
  "bug-triage-specialist": {
    "temperature": 1.0,
    "mode": "subagent"
  },
  "code-reviewer": {
    "temperature": 1.0,
    "mode": "subagent"
  },
  "security-auditor": {
    "temperature": 1.0,
    "mode": "subagent"
  },
  "refactorer": {
    "temperature": 1.0,
    "mode": "subagent"
  },
  "librarian": {
    "temperature": 1.0,
    "mode": "subagent"
  },
  "log-monitor": {
    "temperature": 1.0,
    "mode": "subagent"
  }
}
```

## Agent Modes Explained

| Mode | Description |
|------|-------------|
| `primary` | The main agent that handles initial requests |
| `subagent` | Specialized agent invoked by other agents |

## Temperature Settings

| Value | Use Case |
|-------|----------|
| `0.0 - 0.3` | Precise, deterministic tasks (code review, security) |
| `0.4 - 0.7` | Balanced tasks (architecture, refactoring) |
| `0.8 - 1.0` | CreativeExploratory tasks (new features, prototyping) |

## Core Agents (Recommended)

These 10 agents form the core StringRay framework:

| Agent | Purpose | Recommended Mode |
|-------|---------|------------------|
| `enforcer` | Codex compliance & error prevention | `primary` |
| `architect` | System design & technical decisions | `subagent` |
| `orchestrator` | Complex multi-step task coordination | `subagent` |
| `bug-triage-specialist` | Error investigation & debugging | `subagent` |
| `code-reviewer` | Quality assessment | `subagent` |
| `security-auditor` | Vulnerability detection | `subagent` |
| `refactorer` | Technical debt elimination | `subagent` |
| `test-architect` | Testing strategy & coverage | `subagent` |
| `librarian` | Codebase exploration | `subagent` |
| `log-monitor` | Performance monitoring | `subagent` |

## Specialized Agents

StringRay includes additional specialized agents for specific domains:

| Agent | Purpose |
|-------|---------|
| `frontend-engineer` | React, Vue, Angular development |
| `backend-engineer` | Node.js, Python, Go APIs |
| `mobile-developer` | iOS, Android, React Native, Flutter |
| `database-engineer` | Schema design, migrations |
| `devops-engineer` | CI/CD, containers, infrastructure |
| `performance-engineer` | Optimization, profiling |
| `seo-specialist` | SEO optimization |
| `seo-copywriter` | Content optimization |
| `marketing-expert` | Marketing strategy |
| `documentation-writer` | Technical docs |
| `multimodal-looker` | Image/video analysis |
| `code-analyzer` | Code analysis |

To enable specialized agents, add them to your `opencode.json`:

```json
"agent": {
  "frontend-engineer": {
    "temperature": 0.7,
    "mode": "subagent"
  },
  "mobile-developer": {
    "temperature": 0.7,
    "mode": "subagent"
  }
}
```

## Disabling Agents

To disable an agent, set `disable: true`:

```json
"agent": {
  "enforcer": {
    "disable": true
  }
}
```

## Full opencode.json Example

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/big-pickle",
  // NOTE: "plugin" array is for npm packages only (e.g., "my-plugin" or "@org/plugin")
  // For local plugins, place .js files in .opencode/plugin/ directory - OpenCode auto-loads them
  "mcp": {
    "enforcer": {
      "type": "local",
      "command": ["node", "./node_modules/strray-ai/dist/mcps/enforcer-tools.server.js"],
      "enabled": true
    },
    "orchestrator": {
      "type": "local",
      "command": ["node", "./node_modules/strray-ai/dist/mcps/orchestrator.server.js"],
      "enabled": true
    }
  },
  "agent": {
    "enforcer": {
      "temperature": 1.0,
      "mode": "primary"
    },
    "architect": {
      "temperature": 1.0,
      "mode": "subagent"
    },
    "orchestrator": {
      "temperature": 1.0,
      "mode": "subagent"
    },
    "test-architect": {
      "temperature": 1.0,
      "mode": "subagent"
    },
    "bug-triage-specialist": {
      "temperature": 1.0,
      "mode": "subagent"
    },
    "code-reviewer": {
      "temperature": 1.0,
      "mode": "subagent"
    },
    "security-auditor": {
      "temperature": 1.0,
      "mode": "subagent"
    },
    "refactorer": {
      "temperature": 1.0,
      "mode": "subagent"
    },
    "librarian": {
      "temperature": 1.0,
      "mode": "subagent"
    },
    "log-monitor": {
      "temperature": 1.0,
      "mode": "subagent"
    }
  }
}
```

## Next Steps

- [View Agent Documentation](AGENTS.md) - Detailed agent capabilities
- [Configuration Reference](CONFIGURATION.md) - Full features.json settings
- [Universal Codex](.opencode/strray/codex.json) - 59-term codex reference
