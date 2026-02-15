#!/usr/bin/env bash

# StringRay Full Plugin Test (No Timeout)
# Runs the complete StringRay plugin initialization without any timeouts

echo "🚀 STRINGRAY FULL PLUGIN TEST (NO TIMEOUT)"
echo "=========================================="
echo "Running complete StringRay framework initialization..."
echo "This may take several minutes due to enterprise component loading."
echo ""

# Ensure we're in the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Go up two levels: scripts/bash -> scripts -> project root
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

echo "Running from directory: $(pwd)"

# Run the test and capture output
node scripts/mjs/test-stringray-plugin.mjs

# Check result
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 STRINGRAY PLUGIN TEST COMPLETED SUCCESSFULLY!"
    echo "=============================================="
    echo "✅ Framework fully initialized"
    echo "✅ All components loaded"
    echo "✅ Codex terms injected"
    echo "✅ OpenCode integration ready"
    exit 0
else
    echo ""
    echo "❌ STRINGRAY PLUGIN TEST FAILED"
    echo "=============================="
    exit 1
fi