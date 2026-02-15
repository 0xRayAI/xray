#!/bin/bash

# Framework Compliance Audit Script

set -e

echo "Framework Compliance Audit"
echo "========================="

# Check for required files
REQUIRED_FILES=(
    "package.json"
    "tsconfig.json"
    "opencode.json"
    ".opencode/OpenCode.json"
    "dist/plugin/strray-codex-injection.js"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file missing"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -eq 0 ]; then
    echo "✅ All required files present"
    exit 0
else
    echo "❌ $MISSING files missing"
    exit 1
fi
