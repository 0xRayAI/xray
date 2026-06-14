#!/bin/bash

# Manual Build Script for 0xRay Framework
echo "🔨 Starting Manual Build Process..."

# Create dist directory
mkdir -p dist/plugin

# Check if source file exists
if [ ! -f "src/plugin/strray-codex-injection.ts" ]; then
    echo "❌ Error: Source file src/plugin/strray-codex-injection.ts not found"
    exit 1
fi

# Compile TypeScript file
echo "📦 Compiling TypeScript files..."
npx tsc src/plugin/strray-codex-injection.ts --outDir dist/plugin --target ES2022 --module ES2022 --moduleResolution bundler --esModuleInterop --allowSyntheticDefaultImports --strict --skipLibCheck --declaration 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Manual build completed successfully!"
else
    echo "❌ Build failed with errors"
    exit 1
fi