# xray Test Inventory (Three-Subsystem Focused)

xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT is the authoritative model.

## Overview

xray 2.0 implements comprehensive testing for the three-subsystem architecture (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator) with strong coverage on live surfaces: MCP orchestrator thinDispatch 7-flow, perProc, ProcessorManager, PostProcessor, YML SSOT, governance bridges (Dynamo + codex), deletion protection, CJS pack paces, FORCE/ownership detectors.

## Test Surfaces (Current)

- **Deletion Protection**: scripts/test-v2-consumer/01-deletion-protection.cjs (targets current surfaces; three-subsystem)
- **Thin Dispatch Funnel**: scripts/test-v2-consumer/02-thin-dispatch-funnel.cjs (7 flows in planner, ownership, dispatchStats, perProc, gov verdicts)
- **Processor Pipeline**: scripts/test-v2-consumer/03-processor-pipeline.cjs (ProcessorManager, commitBatcher etc.)
- **Full Facet + E2E Playbook Paces**: run-all-playbook-paces.cjs + run-e2e (dual source + fresh npm pack temp-dir extraction)
- **Ownership / Rift / Gov SSOT / MCP Regression**: scripts/v2-refactor/validation/*.sh (check-execution-ownership.sh etc.)
- **Unit/Pipeline**: src/__tests__/unit/ (core deletion protection + three-subsystem tests), src/__tests__/pipeline/
- **Existing vitest + integration** green for live three-subsystem (per playbooks + reports)

## Modular / Facet Coverage

Focus: three-subsystem validation harnesses (CJS + FORCE + playbooks as contracts).

xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT is the SSOT.

See current test playbooks + CJS paces for validation of live surfaces.
