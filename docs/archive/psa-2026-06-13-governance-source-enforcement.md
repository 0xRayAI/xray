# PSA: Governance `source` Enforcement (Breaking Change)

**Date**: 2026-06-13
**Version**: 3.1.0
**Author**: 0xRay Governance Team

## Summary

All proposals flowing through the governance pipeline must now include a valid `source` field. Previously, unrecognized or missing sources silently defaulted to `'agent'` in the Dynamo integration path. This change enforces source integrity matching Dynamo's own structured proposal validation.

## What Changed

| Change | File | Line(s) | Before | After |
|--------|------|---------|--------|-------|
| `GovernanceProposal.source` made required | `src/governance/governance-types.ts` | 23 | `source?: ...` | `source: ...` |
| `GovernanceProposalInput.source` made required | `src/mcps/governance.server.ts` | 43 | `source?: string` | `source: 'inference' \| ...` |
| JSON schema required `"source"` in MCP entry | `src/mcps/governance.server.ts` | 162 | `required: ["type", "title", "description"]` | `required: ["type", "title", "description", "source"]` |
| JSON schema required `"source"` in Vercel entry | `api/mcp.ts` | 86 | `required: ['type', 'title', 'description']` | `required: ['type', 'title', 'description', 'source']` |
| Runtime validation in MCP `validateGovernProposalsArgs()` | `src/mcps/governance.server.ts` | 111-113 | none | throws if source missing |
| Runtime validation in Vercel MCP | `api/mcp.ts` | 153-154 | none | throws if source missing |
| `toDynamoSource()` throws on unknown sources | `src/governance/governance-service.ts` | 302-310 | `return 'agent'` (default) | `throw new Error(...)` |
| Added `normalizeProposalWithSource()` helper | `src/governance/governance-types.ts` | 105-131 | n/a | factory with validation |
| Wired normalization into `handleGovernRequest` | `src/nucleus/govern-http.ts` | 79-81 | pass-through | validates + normalizes |

## Valid Source Values

| Source | Meaning | Example Usage |
|--------|---------|---------------|
| `inference` | Auto-generated from inference cycle | Recurring patterns, problem detection |
| `reflection` | Generated from developer/agent reflection | Code review, retrospective |
| `manual` | Human-initiated proposal | UI, CLI, direct API |
| `ci` | CI/CD pipeline generated | PR detectors, smoke tests |
| `phase-planning` | Phase planning process | Multiplexer, orchestration |
| `metamorphosis` | Self-evolution system | Internal improvement proposals |

## Callers That Must Be Updated

| Caller | File:Line | Old Source | Replacement |
|--------|-----------|------------|-------------|
| Source-change governance detector | `scripts/ci/source-change-governance-detector.mjs:108` | `"source-change-governance-detector"` | `"ci"` |
| E2E pipeline smoke test | `scripts/ci/e2e-pipeline-smoke.mjs:179` | `"e2e-smoke"` | `"ci"` |
| Retro-governance script | `scripts/governance/retro-governance.mjs:130` | `"architect-review"` | `"manual"` |
| Regulatory governance test fixture | `src/__tests__/fixtures/regulatory-governance-proposals.ts:20,39,58,78,98,118` | `"compliance-review"` | `"manual"` |

## Migration Guide

For any caller that creates a `GovernanceProposal` (directly or via `handleGovernRequest`), ensure the `source` field is set to one of the six valid values above. The canonical helper `normalizeProposalWithSource()` is available in `src/governance/governance-types.ts` for TypeScript callers:

```typescript
import { normalizeProposalWithSource } from 'src/governance/governance-types.js';

const proposal = normalizeProposalWithSource({
  type: 'fix',
  title: 'Fix auth bug',
  description: '...',
  source: 'ci',
});
```

For plain-object callers, simply include `source` with a valid value in the proposal object.

## Rollback

To revert the breaking behavior while keeping the type improvements, change `toDynamoSource()` at `src/governance/governance-service.ts:305` from `throw` back to `return 'agent'`. This allows unrecognized sources to pass through as before, while keeping type/validation enforcement at the entrypoints.
