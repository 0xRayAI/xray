---
title: Consumer MCP
sidebar_label: Consumer MCP
plate_type: pipeline
---

# Consumer MCP

The worn checkout lists seven MCP servers.

```
┌────────────────────────────────────────────────────────────┐ 
│ INPUT LAYER                                                │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ a worn checkout                                    │   │ 
│   └──────────────────────────┬─────────────────────────┘   │ 
└──────────────────────────────┼─────────────────────────────┘ 
             v                                                 
┌────────────┼────────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐    │
│   │ read .mcp.json                                     │    │
│   └──────────────────────────┬─────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────┘
                               v                               
┌──────────────────────────────┼─────────────────────────────┐ 
│ OUTPUT LAYER                 v                             │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ the seven servers                                  │   │ 
│   └────────────────────────────────────────────────────┘   │ 
└────────────────────────────────────────────────────────────┘ 
```

The card owns `src/mcps`. A longer card still wins. The seven servers are xray-governance, xray-skills, xray-enforcer, xray-orchestrator, xray-researcher, xray-code-review, and xray-architect-tools. Repertoire and goggles sit beside them in `.mcp.json`. `src/mcps/registry.json` is the community catalog. Orchestrator and governance keep their own cards.

stamped · 0xray 4.1.4
