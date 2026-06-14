#!/bin/bash
set -e

echo "🏗️  Running build test..."

# Check if build script exists
if [ -f "package.json" ]; then
    echo "📦 Found package.json"
else
    echo "❌ package.json not found"
    exit 1
fi

# Try to build
npm run build > /dev/null 2>&1 || {
    echo "❌ Build failed"
    exit 1
}

echo "✅ Build test completed"