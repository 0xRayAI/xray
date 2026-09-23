#!/bin/bash
# 0xRay v2 Refactor Validation — Orchestrator Rift Detector
# Part of the official Protected Paths validation harness (prepares V2-P1-S03 — highest-risk slice)
#
# Purpose: Detect direct imports of the legacy MultiAgentOrchestrationCoordinator
# inside src/mcps/orchestrator/server.ts (the active MCP orchestrator path used by Grok CLI).
#
# This is the critical "orchestrator rift" identified in the 2026-05-20 researcher mapping.
# The MCP orchestrator (Autonomous Engine canonical surface) must not directly depend on legacy
# top-level coordinator. This violates Tier 1 Protected Surface (MCP Orchestrator Task Flow).
#
# Currently (pre-S03): This check correctly FAILS because the import still exists.
# After S03 severs the rift (replace with governed adapter or full migration), it must pass.
#
# References:
# - 0xray-v2-phase-1-execution-plan-2026-05-20.md (V2-P1-S03)
# - 0xray-v2-protected-paths-and-validation-contract-2026-05-20.md (Tier 1 red line)
# - 0xray-v2-researcher-full-codebase-mapping-2026-05-20.md (explicit rift finding)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Navigate from scripts/v2-refactor/validation/ up to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
if [[ ! -d "$PROJECT_ROOT/src" ]]; then
  # Fallback if path calculation is off
  PROJECT_ROOT="/Users/blaze/dev/stringray"
fi

echo "=== 0xRay v2 Orchestrator Rift Validation ==="
echo "Project root: $PROJECT_ROOT"
echo ""

TARGET_FILE="$PROJECT_ROOT/src/mcps/orchestrator/server.ts"
LEGACY_CLASS="MultiAgentOrchestrationCoordinator"

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "ERROR: Target file not found: $TARGET_FILE"
  exit 1
fi

echo "Scanning active MCP path for direct legacy coordinator import..."
echo "Target: $TARGET_FILE"
echo "Pattern: import of $LEGACY_CLASS from legacy orchestrator/"
echo ""

if grep -n -E "import.*${LEGACY_CLASS}|${LEGACY_CLASS}.*from" "$TARGET_FILE" > /tmp/orchestrator_rift_violations.txt 2>/dev/null; then
  echo ""
  echo "❌ ORCHESTRATOR RIFT DETECTED"
  echo "   Direct import of legacy $LEGACY_CLASS still present in the live Grok CLI MCP orchestrator:"
  cat /tmp/orchestrator_rift_violations.txt
  echo ""
  echo "   This is a Tier 1 Protected Path violation (MCP Orchestrator + active usage surface)."
  echo "   The rift must be removed in V2-P1-S03:"
  echo "     - Replace with thin governed interface owned by MCP orchestrator, or"
  echo "     - Complete migration of logic into Autonomous Engine canonical path."
  echo "   See full details in Phase 1 Execution Plan (S03) and Protected Paths contract."
  echo "   Researcher mapping explicitly flags this as highest-risk live entanglement."
  echo ""
  echo "   DO NOT declare S03 (or any slice touching this file) complete until this check passes."
  exit 1
else
  echo "✅ Orchestrator rift clean: No direct legacy $LEGACY_CLASS import detected in src/mcps/orchestrator/server.ts"
  echo "   MCP orchestrator is properly decoupled from legacy coordinator."
  exit 0
fi
