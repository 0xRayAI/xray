#!/usr/bin/env bash
set -euo pipefail

# run-self-evolution.sh — Self-evolution loop runner.
#
# Runs the consumer verification pipeline, then checks activity.log
# for self-proposal entries. Loops N times (default: 3).
#
# Usage:
#   bash scripts/run-self-evolution.sh [--iterations N] [--keep]

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ITERATIONS=3
KEEP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --iterations) ITERATIONS="$2"; shift 2 ;;
    --keep) KEEP="--keep"; shift ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

echo "======================================================================"
echo "  Self-Evolution Loop Runner"
echo "  Iterations: $ITERATIONS"
echo "======================================================================"

for ((i=1; i<=ITERATIONS; i++)); do
  echo ""
  echo "======================================================================"
  echo "  Iteration $i / $ITERATIONS"
  echo "======================================================================"

  # Run consumer verification
  echo "[run] Running consumer verification..."
  bash "$PROJECT_ROOT/scripts/verify-consumer.sh" $KEEP || {
    echo "[run] Consumer verification failed at iteration $i"
    exit 1
  }

  # Check activity.log for self-proposal entries
  ACTIVITY_LOG="$PROJECT_ROOT/logs/framework/activity.log"
  if [[ -f "$ACTIVITY_LOG" ]]; then
    echo ""
    echo "--- Self-proposal entries in activity.log ---"
    grep -E 'self-proposal' "$ACTIVITY_LOG" || echo "  (none found)"
  else
    echo "[run] activity.log not found at $ACTIVITY_LOG"
  fi

  # Brief pause between iterations
  if [[ $i -lt $ITERATIONS ]]; then
    echo ""
    echo "[run] Pausing before next iteration..."
    sleep 2
  fi
done

echo ""
echo "======================================================================"
echo "  Self-Evolution Loop Complete ($ITERATIONS iterations)"
echo "======================================================================"
