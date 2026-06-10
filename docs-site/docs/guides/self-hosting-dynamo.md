# Self-Hosting Dynamo Governance

Dynamo is the **external governance service** (Solar SSOT) that provides the required external filter layer in the 0xRay three-subsystem model. It evaluates proposals against a 68-term Codex, applies solar-context-weighted voting, and returns pass/revision/reject decisions.

The Dynamo server lives in the **[chrono-warp-drive](https://github.com/htafolla/chrono-warp-drive)** repository. You can fork it, deploy your own instance, and point your 0xRay client to it.

## Fork & Deploy

1. **Fork** the repo at [https://github.com/htafolla/chrono-warp-drive](https://github.com/htafolla/chrono-warp-drive)
2. **Clone** your fork and deploy the MCP server:
   ```bash
   git clone https://github.com/YOUR_USERNAME/chrono-warp-drive.git
   cd chrono-warp-drive
   npm install
   npm run build
   npm start
   ```

The server exposes MCP tools at an HTTP endpoint. See the chrono-warp-drive README for deployment options (Docker, cloud, etc.).

## Point 0xRay to Your Instance

There are two ways to configure the Dynamo endpoint:

### 1. Environment Variable

```bash
export GOVERNANCE_ENDPOINT=https://your-dynamo-instance.example.com
```

This is checked at `src/integrations/governance/governance-client.ts:35` and is the simplest method.

### 2. Feature Flag (`features.json`)

Add an `inference_governance` section to `.opencode/xray/features.json` (or `xray/features.json`):

```json
{
  "inference_governance": {
    "enabled": true,
    "endpoint_url": "https://your-dynamo-instance.example.com",
    "request_timeout_ms": 10000,
    "min_confidence_threshold": 0.5,
    "decision_logic": {
      "pass_confidence_min": 0.9,
      "revision_confidence_max": 0.89
    }
  }
}
```

This is read at `src/integrations/governance/index.ts:391-401` and merged with the defaults from `src/integrations/governance/types.ts:76-86`.

## Local Development: Bypassing Dynamo

For local development or CI environments where no Dynamo instance is available, set:

```bash
export XRAY_LOCAL_MODE=true
```

This bypasses the external Dynamo requirement, allowing governance to proceed with internal deliberation only. The check happens at:

- `src/governance/governance-service.ts:59` — `requireExternalDynamo: !XRAY_LOCAL_MODE`
- `src/inference/inference-cycle.ts:646` — `requireExternalDynamo: !XRAY_LOCAL_MODE`
- `src/mcps/governance.server.ts:258` — `require_external ?? !XRAY_LOCAL_MODE`

## Architecture Context

Dynamo runs as the middle layer of the three-subsystem architecture:

```
┌─────────────────────────────────┐
│        Inference Layer          │
├─────────────────────────────────┤
│  External Governance (Dynamo)   │  ← Your self-hosted instance here
│  Codex enforcement · SSOT       │
├─────────────────────────────────┤
│   Autonomous Engine (dispatch)  │
└─────────────────────────────────┘
```

See the [Governance Model](../../architecture/governance-model.md) doc for the full architecture description.
