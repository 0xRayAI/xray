# How to Add an Agent to xray 2.0 (Three-Subsystem)

This guide documents how to add agents to the current v2 three-subsystem model (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML declarations in .opencode/agents/*.yml are the SSOT.

---

## Architecture Overview

xray 2.0 uses the pure three-subsystem architecture (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator) with MCP orchestrator as primary execution surface + declarative .opencode/agents/*.yml as YML SSOT + skills.

**Primary Surfaces for Agents:**
- `.opencode/agents/{agent}.yml` (declarative YML SSOT)
- Skills (orchestrator, researcher, code-reviewer, security-auditor)
- MCP orchestrator (thinDispatch 7-flow + perProc + governance bridges)

When adding agents, target the YML + skills + orchestrator MCP surfaces only.

---

## Quick Checklist

When adding a new agent, update these (pure v2 three-subsystem surfaces only):

| # | File | What to Add |
|---|------|-------------|
| 1 | `.opencode/agents/{agent}.yml` | Agent YAML configuration (SSOT) |
| 2 | `docs/agents/ADDING_AGENTS.md` | Agent in current agents list |
| 3 | MCP orchestrator surfaces + skills | Via YML discovery (no manual) |

xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT. Target only current surfaces. Zero legacy paths.

---

## Current Agents List (27 Total)

| Agent | Mode | Description |
|-------|------|-------------|
| enforcer | primary | Codex compliance & error prevention |
| orchestrator | subagent | Multi-agent workflow coordination |
| architect | subagent | System design & technical decisions |
| testing-lead | subagent | Testing strategy |
| bug-triage-specialist | subagent | Debugging & error investigation |
| code-reviewer | subagent | Code quality assessment |
| security-auditor | subagent | Vulnerability detection |
| refactorer | subagent | Technical debt elimination |
| researcher | subagent | Codebase exploration |
| strategist | subagent | Strategic planning |
| storyteller | subagent | Narrative deep reflections |
| log-monitor | subagent | Performance monitoring |
| frontend-engineer | subagent | React, Vue, Angular development |
| backend-engineer | subagent | Node.js, Python, Go APIs |
| mobile-developer | subagent | iOS, Android, React Native |
| database-engineer | subagent | Schema design, migrations |
| devops-engineer | subagent | CI/CD, containers, infrastructure |
| performance-engineer | subagent | Optimization, profiling |
| seo-consultant | subagent | SEO optimization |
| content-creator | subagent | Content optimization |
| growth-strategist | subagent | Marketing strategy |
| tech-writer | subagent | Technical documentation |
| multimodal-looker | subagent | Image/video analysis |
| code-analyzer | subagent | Code analysis |
| documentation-writer | subagent | Documentation creation |
| testing-strategy | subagent | Test planning |
| framework-compliance-audit | subagent | Compliance validation |

---

## Adding Agents (Pure YML SSOT)

### .opencode/agents/{agent}.yml (Primary SSOT)

Create the declarative agent YAML:

```yaml
name: my-agent
description: "What this agent does"
version: "2.0.0"
mode: subagent
```

YML declarations in .opencode/agents/*.yml are the SSOT. No manual registration.

### Update Surfaces

- Add to `.opencode/agents/` YML
- Update agent list in this doc and related consumer docs
- MCP orchestrator and skills will pick up via YML + thinDispatch

Target only current v2 three-subsystem surfaces: YML + MCP orchestrator (thinDispatch 7-flow) + skills.

---

## Verification

Test with:

```
@my-agent hello
```

xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT is the authoritative model. Agents are live immediately via YML.
