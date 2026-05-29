# Xray Pipeline Inventory (Three-Subsystem)

**Date**: 2026-05-28  

---

Xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in MCP orchestrator) with YML SSOT is the authoritative model.

## Executive Summary

This document catalogs all major system pipelines in the current xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow SSOT in the MCP orchestrator, perProcPreferredForTheseFlows, YML SSOT, governance bridges).

**Total Pipelines Identified**: 7 major (three-subsystem focused) 
**Primary Surfaces**: MCP orchestrator execution surfaces (thinDispatch 7-flow + dispatchStats + governance verdicts), .opencode/agents/*.yml (YML SSOT), skills, governance, processors, postprocessor.

xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT.

## Pipeline 1: Boot Pipeline

**Purpose**: Framework initialization and component startup orchestration (three-subsystem)

**Layers** (current):
- Layer 0: Configuration Loading
- Layer 1: Core Orchestrator (MCP orchestrator three-subsystem + thinDispatch 7-flow)
- Layer 2: Delegation System
- Layer 3: Session Management
- Layer 4: Processors (ProcessorManager + implementations)
- Layer 5: Agents (loaded via YML + MCP orchestrator)
- Layer 6: Security & Compliance (Codex)
- Layer 7: Inference

**Components** (primary):
- MCP orchestrator execution surfaces (SSOT for 7-flow thinDispatch, perProc, dispatchStats, governance verdicts)
- `.opencode/agents/*.yml` (YML SSOT)

**Data Flow**:
Current surfaces use MCP orchestrator / thinDispatch 7-flows: orchestrator-core, delegation-routing, processor-pipeline, postprocessor-healing, security-orchestration, proposal-application, opencode-invocation + perProc + gov bridges.

**Artifacts**:
- State entries
- ExecutionDispatchSnapshot via planner (for Inference/Governance consumption)

Other pipelines focus on live MCP orchestrator, 7-flow thinDispatch, processor pipeline, postprocessor, security, inference/gov feedback.

xray 2.0 three-subsystem (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in the MCP orchestrator). YML SSOT is the SSOT.
