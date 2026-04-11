#!/bin/bash

# Copy plugin files to dist directory

set -e

echo "📦 Copying 0xRay plugin files..."

# Create dist directories
mkdir -p dist/plugin

# Copy plugin file (from src/plugin or dist/plugin depending on build state)
if [ -f "dist/plugin/strray-codex-injection.js" ]; then
    echo "✅ Plugin already in dist/plugin/"
elif [ -f "src/plugin/strray-codex-injection.ts" ]; then
    echo "⚠️  Warning: Plugin not built, copy from source (TS files won't work directly)"
    cp src/plugin/strray-codex-injection.ts dist/plugin/ 2>/dev/null || true
else
    echo "⚠️  Warning: No plugin file found"
fi

# Verify
if [ -f "dist/plugin/strray-codex-injection.js" ] || [ -f "dist/plugin/strray-codex-injection.ts" ]; then
    echo "✅ Plugin copied successfully"
    ls -la dist/plugin/
else
    echo "❌ Plugin copy failed"
    exit 1
fi
