---
title: Dynamo
sidebar_label: Dynamo
plate_type: pipeline
---

# Dynamo

This drawing is the client. Shipped features set no `endpoint_url` and set `enabled: false` (`xray/features.json:199-206`), so `inference:run` does not reach this client (`src/inference/inference-cycle.ts:406-407`).

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ configured endpoint                                  │   │
│   │ else the endpoint env                                │   │
│   │ else PUBLIC_DYNAMO_SSOT                              │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ PROCESSING LAYER             v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ resolveDynamoBaseUrl                                 │   │
│   │ callTool posts baseUrl/call_connected_tool           │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v                                
┌──────────────────────────────┼───────────────────────────────┐
│ OUTPUT LAYER                 v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ the tool result                                      │   │
│   └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

`resolveDynamoBaseUrl` (`src/integrations/governance/types.ts:83-87`) takes the configured endpoint, else `GOVERNANCE_ENDPOINT`, else `PUBLIC_DYNAMO_SSOT` (`types.ts:77`). `GovernanceClient.callTool` posts `{baseUrl}/call_connected_tool` (`src/integrations/governance/governance-client.ts:52-56`). Line `:35` is `timeoutMs: 10000`, not the endpoint. `ensureDynamoClient` arms that base URL (`src/integrations/governance/index.ts:147-150`). When `inference_governance.enabled` is false, initialization does not build the client (`index.ts:67-69`).

stamped · 0xray 4.1.4
