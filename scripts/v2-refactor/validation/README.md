# 0xRay v2 Refactor Validation Harness

**Status:** Phase 1 Foundation (Expand as slices are completed)

This directory contains the reusable validation commands and checks that every agent must run before a slice can be considered complete.

## Minimum Required Checks (Phase 1)

Every slice must at minimum satisfy the requirements in:
- `0xray-v2-protected-paths-and-validation-contract-2026-05-20.md`
- The "Validation Requirements" section of the current Phase Execution Plan

## Planned Structure

```
validation/
├── README.md
├── run-mcp-regression.sh          # End-to-end Grok CLI + MCP flows
├── check-boundaries.sh            # 3-subsystem ownership + import rules
├── activity-log-audit.sh          # Grep patterns for legacy fallbacks
├── update-researcher-mapping.sh   # Helper to keep the raw mapping in sync
└── ...
```

## Current State (2026-05-20)

This is the initial scaffold. The first real harness components will be added during V2-P1-S05 (Establish the Refactor Validation Harness).

Until then, agents must manually execute the checks listed in the Protected Paths contract and the active Phase plan, and record the evidence.

## Contribution Rule

Any new check added here must be:
- Referenced from the active Phase Execution Plan
- Usable by future agents after compaction
- Logged via frameworkLogger where appropriate

---

**Part of the official 2026-05-20 v2 execution tooling.**