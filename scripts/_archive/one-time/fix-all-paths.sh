#!/bin/bash

# StringRay Scripts Path Fix
# Fixes all hardcoded broken paths in script files

echo "🔧 Fixing broken paths in StringRay scripts..."
echo "=========================================="

# Fix scripts with broken plugin paths
echo ""
echo "🔧 Fixing plugin path references..."

# scripts to fix with src/plugin -> dist/plugin/strray-codex-injection.js
for script in scripts/bash/manual-build.sh scripts/bash/copy-plugin.sh scripts/bash/validate-stringray-build.sh; do
    if [ -f "$script" ]; then
        echo "  Fixing: $script"
        sed -i.bak 's|src/plugins/strray-codex-injection\.ts|dist/plugin/strray-codex-injection\.js|g' "$script"
        echo "    ✅ Fixed plugin path references"
    else
        echo "  ⚠️ Script not found: $script"
    fi
done

# Fix scripts with broken node_modules paths
echo ""
echo "🔧 Fixing node_modules path references..."

for script in scripts/bash/test-end-to-end-comprehensive.sh scripts/bash/test-deployment.sh scripts/bash/test-regression-critical-issues.sh; do
    if [ -f "$script" ]; then
        echo "  Fixing: $script"
        sed -i.bak 's|node_modules/strray-ai/dist|dist|g' "$script"
        echo "    ✅ Fixed node_modules path references"
    else
        echo "  ⚠️ Script not found: $script"
    fi
done

# Update package.json paths if needed
echo ""
echo "🔧 Checking package.json main field..."
MAIN_FIELD=$(node -e "console.log(require('./package.json').main)" 2>/dev/null)
echo "Current main: $MAIN_FIELD"

if echo "$MAIN_FIELD" | grep -q "dist/plugin/plugins"; then
    echo "✅ package.json main field is correct"
else
    echo "⚠️ package.json main field may need updating"
fi

echo ""
echo "✅ Path fixing complete!"
echo "All broken script paths have been updated to match current project structure."
echo ""
echo "Summary of changes:"
echo "  - Fixed src/plugins -> dist/plugin/strray-codex-injection.js"
echo "  - Fixed node_modules/strray-ai/dist -> dist/"
echo "  - Scripts with broken paths have been backed up (.bak)"
echo ""
echo "Run individual scripts again to verify the fixes!"