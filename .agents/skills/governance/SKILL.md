---
name: governance
description: >
  Read the governance lens. Use when Dynamo or the codex is the job.
---

# governance

The file is `src/governance/governance-service.ts`. The plate is `docs-site/docs/plates/governance.md`.

Read the plate before opening the service. Two doors run: `GovernanceService` may require Dynamo, and `inference:run` uses the local matrix while `inference_governance.enabled` is false. The PreToolUse gate is delegation-gate, beside the vote.

