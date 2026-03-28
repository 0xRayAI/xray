#!/bin/bash
#
# pre-publish-check.sh
# MANDATORY: Run this BEFORE npm version or npm publish
# Ensures universal version manager has been run and versions are synchronized
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running Pre-Publish Version Check..."
echo ""

# Get package.json version
PACKAGE_VERSION=$(cat package.json | grep '"version"' | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

# Get version from universal version manager
UVM_VERSION=$(cat scripts/node/universal-version-manager.js | grep -A1 'framework:' | grep 'version:' | sed 's/.*"\([^"]*\)".*/\1/')

# Get version from a sample source file
SOURCE_VERSION=$(cat src/cli/index.ts 2>/dev/null | grep '\.version(' | sed 's/.*\.version("\([^"]*\)").*/\1/' || echo "NOT_FOUND")

echo "📊 Version Check:"
echo "   package.json:     $PACKAGE_VERSION"
echo "   version-manager:  $UVM_VERSION"
echo "   source files:     $SOURCE_VERSION"
echo ""

# Check if versions match
if [ "$PACKAGE_VERSION" != "$UVM_VERSION" ]; then
    echo -e "${RED}❌ FATAL ERROR: Version mismatch detected!${NC}"
    echo ""
    echo "   package.json version:     $PACKAGE_VERSION"
    echo "   version-manager version:  $UVM_VERSION"
    echo ""
    echo -e "${YELLOW}🔧 REQUIRED ACTION:${NC}"
    echo "   1. Update scripts/node/universal-version-manager.js"
    echo "      Set OFFICIAL_VERSIONS.framework.version to '$PACKAGE_VERSION'"
    echo "   2. Run: node scripts/node/universal-version-manager.js"
    echo "   3. Commit the changes"
    echo "   4. Then run: npm version [patch|minor|major]"
    echo "   5. Then run: npm publish"
    echo ""
    echo "📖 See: AGENTS.md section on Version Management"
    exit 1
fi

# Check if source files match
if [ "$SOURCE_VERSION" != "$PACKAGE_VERSION" ] && [ "$SOURCE_VERSION" != "NOT_FOUND" ]; then
    echo -e "${RED}❌ WARNING: Source file version mismatch!${NC}"
    echo ""
    echo "   package.json version:  $PACKAGE_VERSION"
    echo "   source files version:  $SOURCE_VERSION"
    echo ""
    echo -e "${YELLOW}🔧 Run: node scripts/node/universal-version-manager.js${NC}"
    exit 1
fi

# Check README
README_VERSION=$(grep -oE 'v?1\.[0-9]+\.[0-9]+' README.md | head -1 | sed 's/v//')
if [ "$README_VERSION" != "$PACKAGE_VERSION" ]; then
    echo -e "${YELLOW}⚠️  WARNING: README.md version mismatch${NC}"
    echo "   README shows: v$README_VERSION"
    echo "   package.json: $PACKAGE_VERSION"
    echo ""
    echo "🔧 Update README.md or run version manager if it handles README"
fi

echo -e "${GREEN}✅ Version check passed!${NC}"
echo "   All versions synchronized to: $PACKAGE_VERSION"
echo ""
echo "🚀 Ready for: npm version [patch|minor|major] && npm publish"
exit 0