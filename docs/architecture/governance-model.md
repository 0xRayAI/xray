# Governance Model (Dynamo Solar SSOT)

## Overview

xray 2.0 governance system operates as the External Governance subsystem within the pure v2 three-subsystem model (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT. It provides a strict required filter layer for reliability and separation of concerns, with internal deliberation hosted under Inference.

### 1. Internal Deliberation Layer
- Performed by three specialized skill MCP servers:
  - `code-review`
  - `security-audit`
  - `researcher`
- These servers analyze proposals using codebase knowledge, historical patterns, and domain expertise.
- This layer represents **human-like engineering judgment**.

### 2. External Filter Layer — Dynamo Solar SSOT
- **Dynamo** acts as the **Single Source of Truth (SSOT)** for an external governance signal.
- It is based on:
  - Real sunlight physics data (NOAA solar activity)
  - Neural network processing
  - Temporal first principles
- This layer serves as a **required, independent filter** that proposals must pass through.
- It is **not optional** and **not a fallback**. When `governance.enabled` (or `inference_governance.enabled`) is active, the system requires successful interaction with the Dynamo Solar SSOT.

## Governance Flow

```
Proposals
   ↓
[Internal Layer]     → 3 Real Skill MCPs (deliberation)
   ↓
[External Filter]    → Dynamo Solar SSOT (required check)
   ↓
[Merge Layer]        → GovernanceService + governance-core.ts
   ↓
Final Decision (approve / needs_revision / reject)
```

## Key Components

- Governance service: Central orchestrator. Calls internal skill MCPs in parallel, then the external Dynamo filter.
- InferenceGovernanceIntegration: Manages the Dynamo client, feature flags, retries, and lifecycle.
- governance core: Contains pure logic (mergeVotes, applyDecisionMatrix).
- Governance MCP Server: Exposes govern_proposals and govern_reflection tools.

## Feature Flag

Governance behavior is controlled via `features.json`:

```json
{
  "inference_governance": {
    "enabled": true
  }
}
```

When disabled, governance reduces to internal deliberation paths only (not recommended for production deployments).

## Strict Requirement Model

- Dynamo Solar SSOT is a **hard requirement** by default.
- If the integration is not initialized or unavailable when required, governance throws a clear error.
- This design prevents silent degradation of governance quality.

xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT. MCP orchestrator bridges for governance verdicts in thinDispatch flows.
