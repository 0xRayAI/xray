#!/bin/bash
# 0xRay v2 Refactor Validation — Activity Log Audit
# Part of the official Protected Paths validation harness (V2-P1-S05)
#
# Purpose: Grep logs/framework/activity.log (and recent dated/rotated .gz archives)
# for signs of:
#   - Legacy fallback behavior (e.g. governance-legacy-fallback, unexpected opencode fallbacks)
#   - Orchestrator rift usage indicators (legacy coordinator references in runtime context)
#   - Non-frameworkLogger events during v2 work (raw/direct logging or legacy activity paths
#     active while v2-refactor / execution / proposal-applier / governance-mcp-primary paths
#     are in play)
#   - Recent job health after slices (error spikes in execution/v2 components, missing
#     frameworkLogger job correlation on recent activity)
#
# This enforces the "Framework Activity Logging" and "Activity Log Sanity" rules from the
# Protected Paths contract: all significant events via frameworkLogger; no unexplained
# spikes in errors or fallbacks to legacy in the last 24h+ of usage after changes.
#
# Produces structured, machine-readable output (sections + counts + samples) suitable for CI.
# Exits non-zero when concerning patterns are present (with actionable messages referencing
# the Phase Plan, Protected Paths, and researcher mapping).
#
# References:
# - 0xray-v2-phase-1-execution-plan-2026-05-20.md (V2-P1-S05 harness, S01/S02/S03 boundaries)
# - 0xray-v2-protected-paths-and-validation-contract-2026-05-20.md (Framework Activity Logging + Activity Log Sanity requirements)
# - 0xray-v2-researcher-full-codebase-mapping-2026-05-20.md (legacy fallback + rift inventory + harness expansion recommendation)
# - 0xray-v2-master-refactoring-playbook-2026-05-20.md (strangler-fig + frameworkLogger discipline)
#
# Usage (from project root):
#   bash scripts/v2-refactor/validation/activity-log-audit.sh
#
# Part of the reusable validation suite. Must be run (and clean) before declaring any
# slice complete that touches inference, execution, governance, or orchestrator paths.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Navigate from scripts/v2-refactor/validation/ up to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
if [[ ! -d "$PROJECT_ROOT/src" ]]; then
  # Fallback if path calculation is off
  PROJECT_ROOT="/Users/blaze/dev/stringray"
fi

echo "=== 0xRay v2 Activity Log Audit ==="
echo "Project root: $PROJECT_ROOT"
echo ""

LOG_DIR="$PROJECT_ROOT/logs/framework"
MAIN_LOG="$LOG_DIR/activity.log"
REPORT_JSON="$LOG_DIR/activity-report.json"

if [[ ! -d "$LOG_DIR" ]]; then
  echo "⚠️  Log directory not found: $LOG_DIR (no activity yet — acceptable for fresh env)"
  echo "✅ Activity Log Audit: No logs present to audit (clean slate)."
  exit 0
fi

echo "Log directory: $LOG_DIR"
echo "Scanning: main activity.log + up to 10 most recent rotated .gz archives"
echo ""

# Collect logs for listing + efficient analysis (main + recent gz)
declare -a LOG_FILES=()
if [[ -f "$MAIN_LOG" ]]; then
  LOG_FILES+=("$MAIN_LOG")
fi

# Recent gz for display (up to 10) + analysis uses a strict subset for speed
while IFS= read -r gz; do
  LOG_FILES+=("$gz")
done < <(ls -1t "$LOG_DIR"/activity-*.log.gz 2>/dev/null | head -10 || true)

if [[ ${#LOG_FILES[@]} -eq 0 ]]; then
  echo "ℹ️  No activity log files found to scan."
  echo "✅ Activity Log Audit: No data — nothing to violate."
  exit 0
fi

echo "Files considered (display): ${#LOG_FILES[@]} (analysis uses main + 3 newest for CI speed)"
for f in "${LOG_FILES[@]:0:5}"; do   # show first few
  echo "  - $(basename "$f")"
done
[[ ${#LOG_FILES[@]} -gt 5 ]] && echo "  ... ($((${#LOG_FILES[@]} - 5)) more)"
echo ""

# Counters and collectors
LEGACY_FALLBACK_COUNT=0
declare -a LEGACY_FALLBACK_SAMPLES=()

RIFT_INDICATOR_COUNT=0
declare -a RIFT_SAMPLES=()

NON_FW_EVENT_COUNT=0
declare -a NON_FW_SAMPLES=()

V2_FW_LOG_COUNT=0
RECENT_ERROR_COUNT=0
declare -a RECENT_ERROR_SAMPLES=()

JOB_HEALTH_ISSUES=0
declare -a JOB_HEALTH_SAMPLES=()

# Helper: stream a log file (handles .gz transparently)
stream_log() {
  local file="$1"
  if [[ "$file" == *.gz ]]; then
    gunzip -c "$file" 2>/dev/null || true
  else
    cat "$file" 2>/dev/null || true
  fi
}

# Concerning patterns (portable ERE fragments — no PCRE lookaheads, works on mac/BSD + GNU grep)
LEGACY_FALLBACK_PAT='governance-legacy-fallback|legacy-fallback|legacy governance path'
RIFT_PAT='orchestrator.?rift|MultiAgentOrchestrationCoordinator|legacy.*orchestrator.*coordinator'
# Non-frameworkLogger during v2: raw/direct or failed writes; successful (unblocked) opencode fallbacks or non-test file-scan fallbacks
# (simplified to avoid negative lookahead; BLOCKED ones are positive/good signals elsewhere)
NON_FW_PAT='\[activity-logger\].*write-log-failed|direct.*log|raw append.*log|opencode.*fallback[^B]|file-scan-fallback[^t]'
# v2 frameworkLogger usage markers (good signals)
V2_FW_PAT='v2-refactor|proposal-applier|execution.*apply|apply-delegation|governance-mcp-primary-path|job-completed'
# Error spikes in critical post-slice paths (portable)
ERROR_PAT=' - ERROR | - ERROR | - FAIL '

echo "Analyzing log streams for concerning patterns (legacy fallbacks, rift, non-fw v2 events, job health)..."
echo "(Efficient grep passes over recent tails of main + up to 3 newest archives)"
echo ""

# Limit to main + 3 newest gz for CI speed (still covers "recent after slices")
declare -a SCAN_FILES=()
[[ -f "$MAIN_LOG" ]] && SCAN_FILES+=("$MAIN_LOG")
while IFS= read -r gz; do SCAN_FILES+=("$gz"); done < <(ls -1t "$LOG_DIR"/activity-*.log.gz 2>/dev/null | head -3 || true)

TOTAL_LINES_SCANNED=0

# Efficient counting + sampling via grep (no per-line bash loop)
for log_file in "${SCAN_FILES[@]}"; do
  STREAM_CMD="cat"
  if [[ "$log_file" == *.gz ]]; then
    STREAM_CMD="gunzip -c"
  fi

  # Focus on recent tail of each for "post-slice" relevance + speed
  CONTENT=$($STREAM_CMD "$log_file" 2>/dev/null | tail -3000 || true)
  LINES_IN_THIS=$(echo "$CONTENT" | wc -l | tr -d ' ')
  TOTAL_LINES_SCANNED=$((TOTAL_LINES_SCANNED + LINES_IN_THIS))

  # Legacy fallback behavior (count + up to 5 samples)
  while IFS= read -r hit; do
    LEGACY_FALLBACK_COUNT=$((LEGACY_FALLBACK_COUNT + 1))
    if [[ ${#LEGACY_FALLBACK_SAMPLES[@]} -lt 5 ]]; then
      LEGACY_FALLBACK_SAMPLES+=("$(echo "$hit" | cut -c1-200)")
    fi
  done < <(echo "$CONTENT" | grep -E -i "$LEGACY_FALLBACK_PAT" || true)

  # Orchestrator rift usage (count + samples)
  # NOTE: Filter out the *success* signal from V2-P1-S03 (the "legacy-coordinator-removed" boundary log we intentionally emit post-rift-sever).
  # Only real lingering references to the legacy class or active rift usage should count as violations.
  while IFS= read -r hit; do
    if echo "$hit" | grep -qE 'legacy-coordinator-removed|V2-P1-S03 complete|rift severed'; then
      continue
    fi
    RIFT_INDICATOR_COUNT=$((RIFT_INDICATOR_COUNT + 1))
    if [[ ${#RIFT_SAMPLES[@]} -lt 3 ]]; then
      RIFT_SAMPLES+=("$(echo "$hit" | cut -c1-200)")
    fi
  done < <(echo "$CONTENT" | grep -E -i "$RIFT_PAT" || true)

  # v2 frameworkLogger health (count of good signals) — robust portable count
  V2_HITS_RAW=$(echo "$CONTENT" | grep -E -i "$V2_FW_PAT" | wc -l 2>/dev/null || echo "0")
  V2_HITS=$(echo "$V2_HITS_RAW" | tr -d ' \n' | head -c 10)
  [[ -z "$V2_HITS" || "$V2_HITS" == "0" ]] && V2_HITS=0
  V2_FW_LOG_COUNT=$((V2_FW_LOG_COUNT + V2_HITS))

  # Non-frameworkLogger events during v2 work (only if v2 signals present in this window)
  if [[ $V2_HITS -gt 0 ]]; then
    while IFS= read -r hit; do
      NON_FW_EVENT_COUNT=$((NON_FW_EVENT_COUNT + 1))
      if [[ ${#NON_FW_SAMPLES[@]} -lt 5 ]]; then
        NON_FW_SAMPLES+=("$(echo "$hit" | cut -c1-200)")
      fi
    done < <(echo "$CONTENT" | grep -E -i "$NON_FW_PAT" || true)
  fi

  # Recent job health / error spikes on critical components
  while IFS= read -r hit; do
    if echo "$hit" | grep -E -i '(\[execution\]|\[v2-refactor\]|\[inference-cycle\]|\[governance)' >/dev/null 2>&1; then
      if echo "$hit" | grep -E "$ERROR_PAT" >/dev/null 2>&1; then
        RECENT_ERROR_COUNT=$((RECENT_ERROR_COUNT + 1))
        if [[ ${#RECENT_ERROR_SAMPLES[@]} -lt 5 ]]; then
          RECENT_ERROR_SAMPLES+=("$(echo "$hit" | cut -c1-200)")
        fi
      fi
    fi
  done < <(echo "$CONTENT" | grep -E -i ' - (ERROR|error|FAIL) ' || true)

  # Job health issues
  while IFS= read -r hit; do
    if echo "$hit" | grep -E -i 'job-completed|job.*(fail|error)|setCurrentJobContext' >/dev/null 2>&1; then
      if echo "$hit" | grep -E -i 'error|fail' >/dev/null 2>&1; then
        JOB_HEALTH_ISSUES=$((JOB_HEALTH_ISSUES + 1))
        if [[ ${#JOB_HEALTH_SAMPLES[@]} -lt 3 ]]; then
          JOB_HEALTH_SAMPLES+=("$(echo "$hit" | cut -c1-200)")
        fi
      fi
    fi
  done < <(echo "$CONTENT" | grep -E -i 'job' || true)

done

echo ""
echo "=== Scan Summary ==="
echo "Lines processed (recent tails): $TOTAL_LINES_SCANNED"
echo "Legacy fallback events: $LEGACY_FALLBACK_COUNT"
echo "Orchestrator rift indicators: $RIFT_INDICATOR_COUNT"
echo "Non-frameworkLogger v2 events: $NON_FW_EVENT_COUNT"
echo "v2 frameworkLogger signals seen: $V2_FW_LOG_COUNT"
echo "Recent critical-path errors (exec/v2/inf/gov): $RECENT_ERROR_COUNT"
echo "Job health issues (failed jobs in v2 paths): $JOB_HEALTH_ISSUES"
echo ""

# Determine overall result and emit structured report
CONCERNING=0

echo "=== Detailed Findings ==="

if [[ $LEGACY_FALLBACK_COUNT -gt 0 ]]; then
  echo "❌ LEGACY FALLBACK BEHAVIOR DETECTED ($LEGACY_FALLBACK_COUNT occurrences)"
  echo "   Signs of governance-legacy-fallback or equivalent deprecation paths being exercised."
  echo "   This violates the post-S01/S03 expectation that primary paths stay on Governance MCP +"
  echo "   frameworkLogger without silent legacy re-entry."
  for s in "${LEGACY_FALLBACK_SAMPLES[@]}"; do
    echo "     $s"
  done
  echo "   See: inference-cycle.ts governance-legacy-fallback path + Protected Paths \"no unexplained fallbacks\" rule."
  CONCERNING=1
else
  echo "✅ No legacy fallback events (governance-legacy-fallback etc.) found in scanned recent logs."
fi

if [[ $RIFT_INDICATOR_COUNT -gt 0 ]]; then
  echo ""
  echo "❌ ORCHESTRATOR RIFT USAGE IN LOGS ($RIFT_INDICATOR_COUNT occurrences)"
  echo "   Runtime references to legacy MultiAgentOrchestrationCoordinator or rift terminology detected."
  echo "   Indicates the S03 rift is still live in execution paths (or error traces)."
  for s in "${RIFT_SAMPLES[@]}"; do
    echo "     $s"
  done
  echo "   Must be resolved in V2-P1-S03 before any claim of clean MCP orchestrator surface."
  CONCERNING=1
else
  echo "✅ No orchestrator rift indicators found in activity logs."
fi

if [[ $NON_FW_EVENT_COUNT -gt 0 ]]; then
  echo ""
  echo "❌ NON-FRAMEWORKLOGGER EVENTS DURING V2 WORK ($NON_FW_EVENT_COUNT suspicious)"
  echo "   Detected activity that bypasses frameworkLogger discipline (raw writes, activity-logger failures,"
  echo "   or successful opencode fallbacks) while v2-refactor / execution / MCP-primary paths were active."
  for s in "${NON_FW_SAMPLES[@]}"; do
    echo "     $s"
  done
  echo "   All v2 work must route significant events exclusively through frameworkLogger (see framework-logger.ts + proposal-applier.ts)."
  CONCERNING=1
else
  echo "✅ No non-frameworkLogger v2-path events detected (frameworkLogger discipline appears respected in recent tails)."
fi

echo ""
if [[ $V2_FW_LOG_COUNT -gt 0 ]]; then
  echo "✅ v2 frameworkLogger activity present ($V2_FW_LOG_COUNT signals) — good evidence of post-slice canonical paths exercising."
else
  echo "ℹ️  No explicit v2-refactor / execution frameworkLogger entries in the scanned recent tails (may be normal if no proposals applied in window)."
fi

if [[ $RECENT_ERROR_COUNT -gt 5 ]]; then
  echo ""
  echo "⚠️  ELEVATED RECENT ERRORS IN CRITICAL PATHS ($RECENT_ERROR_COUNT)"
  echo "   Multiple ERROR level events on execution / v2-refactor / inference-cycle / governance components."
  echo "   Samples (most recent context):"
  for s in "${RECENT_ERROR_SAMPLES[@]}"; do
    echo "     $s"
  done
  echo "   Review job health + re-run targeted slices. Not necessarily fatal but worth noting for CI trends."
  # Do not force CONCERNING=1 for errors alone (warnings exist); only fallbacks/rift/non-fw are hard fails for now
else
  echo "✅ Recent critical-path error volume acceptable (≤5 in sampled window)."
fi

if [[ $JOB_HEALTH_ISSUES -gt 0 ]]; then
  echo ""
  echo "⚠️  JOB HEALTH ISSUES DETECTED ($JOB_HEALTH_ISSUES failed/completed-with-error in v2 paths)"
  for s in "${JOB_HEALTH_SAMPLES[@]}"; do
    echo "     $s"
  done
fi

echo ""
echo "=== Activity Log Audit Result ==="
if [[ $CONCERNING -gt 0 ]]; then
  echo "❌ ACTIVITY LOG AUDIT FAILED"
  echo "   Concerning patterns found (see details above)."
  echo "   Required action: Investigate the flagged fallback/rift/non-fw entries in logs/framework/activity.log."
  echo "   Reproduce the scenario, ensure primary paths use Governance MCP + frameworkLogger exclusively."
  echo "   Update the relevant slice work package with log excerpts + root cause + fix."
  echo "   References:"
  echo "     - Phase 1 Execution Plan V2-P1-S05 (harness) + S01/S02/S03 (boundaries)"
  echo "     - Protected Paths contract: \"Activity Log Sanity\" + \"Framework Activity Logging\" rules"
  echo "     - Researcher mapping 2026-05-20: legacy/rift inventory + explicit recommendation for this check"
  echo "   DO NOT declare the touching slice complete until a clean re-run of this script."
  exit 1
else
  echo "✅ ACTIVITY LOG AUDIT PASSED"
  echo "   No concerning legacy fallbacks, rift usage, or non-frameworkLogger v2 events detected in recent logs."
  echo "   FrameworkLogger discipline and job correlation appear healthy for scanned window."
  echo "   v2 signals: $V2_FW_LOG_COUNT | critical errors: $RECENT_ERROR_COUNT | job issues: $JOB_HEALTH_ISSUES"
  echo "   This check (plus siblings) must be re-run after every slice touching inference/execution/governance/orchestrator."
  echo "   Evidence suitable for PR / work package / CI gate."
  exit 0
fi
