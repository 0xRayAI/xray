#!/bin/bash
# 0xRay v2 Refactor Validation — Inference Boundary Checker
# Part of the official Protected Paths validation harness (V2-P1-S05)
#
# Purpose: Enforce that src/inference/ (especially inference-cycle.ts) does NOT own execution/apply/spawn logic.
# This is a core "Must Never Own" rule from the 3-subsystem model.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Navigate from scripts/v2-refactor/validation/ up to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
if [[ ! -d "$PROJECT_ROOT/src" ]]; then
  # Fallback if path calculation is off
  PROJECT_ROOT="/Users/blaze/dev/stringray"
fi

echo "=== 0xRay v2 Inference Boundary Validation ==="
echo "Project root: $PROJECT_ROOT"
echo ""

INFERENCE_CYCLE="$PROJECT_ROOT/src/inference/inference-cycle.ts"
VIOLATION_COUNT=0

if [[ ! -f "$INFERENCE_CYCLE" ]]; then
  echo "ERROR: inference-cycle.ts not found"
  exit 1
fi

echo "Checking Inference boundary violations in inference-cycle.ts..."

# Forbidden patterns (execution/apply/spawn ownership)
FORBIDDEN_PATTERNS=(
  "applyProposal"
  "executeProposal"
  "spawnAgent"
  "agentSpawn"
  "PostProcessor"
  "apply\("
  "execSync"
  "spawn\("
  "child_process"
)

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -n -E "$pattern" "$INFERENCE_CYCLE" > /tmp/inference_violations.txt 2>/dev/null; then
    echo ""
    echo "VIOLATION DETECTED: Pattern '$pattern' found in inference-cycle.ts"
    cat /tmp/inference_violations.txt
    VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
  fi
done

echo ""

if [[ $VIOLATION_COUNT -gt 0 ]]; then
  echo "❌ INFERENCE BOUNDARY VIOLATION: $VIOLATION_COUNT forbidden pattern(s) detected."
  echo "   Inference must only sense and propose. Execution must be owned by Autonomous Engine or gated by Governance."
  echo "   See: 0xray-v2-phase-1-execution-plan-2026-05-20.md (V2-P1-S01)"
  exit 1
else
  echo "✅ Inference boundary clean: No execution/apply/spawn ownership detected in inference-cycle.ts"
  exit 0
fi