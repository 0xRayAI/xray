---
name: dynamo
description: >
  Read the dynamo lens. Use when the Dynamo client is the page.
---

# dynamo

The client is `src/integrations/governance/governance-client.ts`. The resolver is `src/integrations/governance/types.ts`. The plate is `docs-site/docs/plates/dynamo.md`.

1. Read this lens. The skill is this file.
2. `resolveDynamoBaseUrl` picks the configured endpoint, else `GOVERNANCE_ENDPOINT`, else `PUBLIC_DYNAMO_SSOT`.
3. `callTool` posts `{baseUrl}/call_connected_tool`.
4. Shipped `inference_governance.enabled` is false, so `inference:run` does not reach this client.
