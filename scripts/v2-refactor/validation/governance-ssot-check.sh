#!/bin/bash
# 0xRay v2 Refactor Validation — Governance SSOT Codex/Policy Check
# Prepares for V2-P1-S02 (Codex/Policy consolidation) and S06
#
# Purpose: Verify (or surface current state of) that Codex / policy loading is routed exclusively
# through the External Governance layer (or its canonical loaders like CodexLoader).
# This enforces the "Governance as Single Source of Truth" rule from the 3-subsystem architecture.
#
# Current behavior (pre-S02): Detects direct fs reads / JSON parses of codex.json and policy files
# that bypass the governance-owned path. These are the targets for S02 migration.
#
# Part of the official Protected Paths validation harness.
# References:
# - 0xray-v2-phase-1-execution-plan-2026-05-20.md (V2-P1-S02, S06)
# - 0xray-v2-protected-paths-and-validation-contract-2026-05-20.md (Codex Enforcement surface)
# - 0xray-v2-researcher-full-codebase-mapping-2026-05-20.md (current bypass inventory)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Navigate from scripts/v2-refactor/validation/ up to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
if [[ ! -d "$PROJECT_ROOT/src" ]]; then
  # Fallback if path calculation is off
  PROJECT_ROOT="/Users/blaze/dev/stringray"
fi

echo "=== 0xRay v2 Governance SSOT Codex/Policy Validation ==="
echo "Project root: $PROJECT_ROOT"
echo ""

SRC_DIR="$PROJECT_ROOT/src"

# Files/patterns that are ALLOWED to contain codex loading logic today
# (core implementation points + tests + the Governance SSOT owner).
# Everything else doing direct loads is a bypass candidate.
# After S02 these will be the ONLY places, and all consumers will delegate to Governance service.
ALLOWED_PATTERNS=(
  "codex-loader"
  "codex-formatter"
  "config-paths"
  "bridge"
  "__tests__"
  "enforcement/loaders"
  "enforcement/types"
  "core/context-loader"
  "enforcement/core"   # may have governance comments
  "governance/codex-policy.service"  # canonical SSOT owner (V2-P1-S02); self-load is the approved path
  "governance/"  # any future governance-owned policy surfaces
  "core/codex-injector"  # S02-PRUNE: Governance-only policy codex via CodexPolicyService (no transitional fallback blocks remain); helpers for messaging only
  "plugin/strray-codex-injection"  # S02-PRUNE: Governance-only for policy codex via CodexPolicyService; extras load direct (intentional, non-policy)
)

VIOLATION_COUNT=0
declare -a VIOLATION_FILES=()

echo "Scanning src/ for direct Codex/Policy file accesses outside Governance-approved loaders..."
echo "(Looking for codex.json references combined with read/parse/exists actions)"
echo ""

# Find files mentioning codex file paths (broad), then filter for load actions + not allowed
CANDIDATES=$(grep -l -r -E 'codex\.json|\.opencode/strray/codex|\.strray/codex|resolveCodexPath' "$SRC_DIR" \
  --include="*.ts" --include="*.js" --include="*.mjs" 2>/dev/null | head -200 || true)

for file in $CANDIDATES; do
  # Skip allowed
  SKIP=0
  for allowed in "${ALLOWED_PATTERNS[@]}"; do
    if [[ "$file" == *"$allowed"* ]]; then
      SKIP=1
      break
    fi
  done
  [[ $SKIP -eq 1 ]] && continue

  # Does this file actually perform a load action on codex/policy?
  # (Broad match on load actions within files already known to mention codex paths; multi-line cases like enforcer-tools are intentionally caught for S02 review)
  if grep -E -n -i 'readFileSync|readFile\(|JSON\.parse|existsSync.*codex|codex.*(readFile|parse|existsSync|loadJson)' "$file" > /tmp/gov_ssot_violations.txt 2>/dev/null; then
    REL_FILE="${file#$PROJECT_ROOT/}"
    echo "⚠️  POTENTIAL GOVERNANCE BYPASS DETECTED: $REL_FILE"
    # Show a few lines for context (avoid dumping huge files)
    head -5 /tmp/gov_ssot_violations.txt | sed 's/^/     /'
    echo ""
    VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
    VIOLATION_FILES+=("$REL_FILE")
  fi
done

echo ""
if [[ $VIOLATION_COUNT -gt 0 ]]; then
  echo "❌ GOVERNANCE SSOT CHECK: $VIOLATION_COUNT bypass file(s) found."
  echo "   Files with direct codex/policy loads not going through Governance layer / CodexLoader:"
  printf '   - %s\n' "${VIOLATION_FILES[@]}"
  echo ""
  echo "   Action required for S02: Route all policy/Codex consumption through a single"
  echo "   External Governance-owned service (new or extended CodexLoader + governance.server exposure)."
  echo "   Direct loads violate the SSOT principle and Protected Paths Codex Enforcement rule."
  echo "   Re-run this check after S02 changes; target is zero bypasses outside the canonical Governance path."
  echo "   See Phase 1 Execution Plan V2-P1-S02 and the Protected Paths contract."
  exit 1
else
  echo "✅ Governance SSOT clean: No direct codex/policy bypasses detected outside approved Governance loaders."
  echo "   All loading is (or will be) delegated through the External Governance layer."
  exit 0
fi
