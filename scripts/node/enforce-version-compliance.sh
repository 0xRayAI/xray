#!/bin/bash

# Version Compliance Enforcement Shell Wrapper
# 
# This shell script wraps the TypeScript version compliance enforcement.
# It provides the CLI interface expected by CI/CD pipelines.
#
# Usage: ./scripts/node/enforce-version-compliance.sh
#
# @version 1.0.0
# @since 2026-01-15

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Check if the TypeScript version exists (after build)
if [ -f "$SCRIPT_DIR/enforce-version-compliance.ts" ]; then
    # Try to run the TypeScript directly with ts-node or npx tsx
    if command -v tsx &> /dev/null; then
        tsx "$SCRIPT_DIR/enforce-version-compliance.ts"
    elif command -v npx &> /dev/null; then
        npx tsx "$SCRIPT_DIR/enforce-version-compliance.ts"
    else
        # Fallback: compile on-the-fly with tsc and run
        echo "Compiling version compliance script..."
        npx tsc "$SCRIPT_DIR/enforce-version-compliance.ts" --outDir "$SCRIPT_DIR" --module commonjs --esModuleInterop true --skipLibCheck true 2>/dev/null || true
        if [ -f "${SCRIPT_DIR}/enforce-version-compliance.js" ]; then
            node "${SCRIPT_DIR}/enforce-version-compliance.js"
        else
            echo "Error: Could not compile or run version compliance script"
            exit 1
        fi
    fi
else
    echo "Error: enforce-version-compliance.ts not found"
    exit 1
fi
