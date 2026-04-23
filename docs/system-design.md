# 0xRay System Design

**Version**: 1.22.14

```
┌──────────────────────────────────────┐
│      0xRay Architecture v1.22.14    │
├──────────────────────────────────────┤
│         Governance Layer              │
│  Codex (60 rules) + Processors      │
│  Agents + Skills + Security          │
└──────────────────────────────────────┘
                ↓
        ┌───────┼───────┐
        ↓       ↓       ↓
    OpenCode  Hermes  OpenClaw
     (plugin) (MCP)    (WS)
```

## How Community Skills/MCPs Fit

```
┌─────────────────────────────────────────┐
│            0xRay (Governance)           │
├─────────────────────────────────────────┤
│  Core: Codex, Agents, Skills, Processors│
│  + Community Extensions                 │
└─────────────────────────────────────────┘
         ↑                    ↑
    ┌────┴────┐       ┌────┴────┐
    │ Skills  │       │  MCPs  │
    │ Registry│       │ Registry│
    ├─────────┤       ├─────────┤
    │ antigrav│       │ xmcp   │
    │ 1300+   │       │ X API  │
    ├─────────┤       ├─────────┤
    │ agency  │       │github-mcp│
    │ 170+    │       │GitHub  │
    ├─────────┤       ├─────────┤
    │ builtin │       │builtin  │
    │   43    │       │   14    │
    └─────────┘       └─────────┘
```

**The hierarchy:**

1. **0xRay Core** - Codex rules, enforcement, orchestration
2. **Built-in Skills (43)** - Framework skills (api-design, researcher...)
3. **Built-in MCPs (14)** - Framework tools (lint, test, build...)
4. **Community Skills** - Installable from registry (antigravity, superpowers...)
5. **Community MCPs** - Installable from registry (xmcp, github-mcp...)

**Flow:**

```
User → OpenCode/Hermes/OpenClaw
    → 0xRay plugin/MCP (governance)
    → Built-in Skills + MCPs
    → Community Skills + MCPs (optional install)
```

**To add community MCP:**
```bash
npx strray-ai mcp:install xmcp      # X API tools
npx strray-ai mcp:install github    # GitHub tools
npx strray-ai skill:install antigrav  # 1300+ skills
```

That clear?