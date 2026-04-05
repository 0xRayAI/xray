#!/bin/bash
#
# enforce-version-compliance.sh
# ENFORCER AGENT: Blocks commits/publishes if version compliance fails
# This script is called by CI/CD, pre-commit hooks, and can be run manually
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "🔍 ENFORCER AGENT: Version Compliance Check"
echo "=============================================="
echo ""

# Get versions
NPM_VERSION=$(npm view strray-ai@latest version 2>/dev/null || echo "NOT_PUBLISHED")
PKG_VERSION=$(cat package.json 2>/dev/null | grep '"version"' | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/' || echo "NOT_FOUND")
UVM_VERSION=$(cat scripts/node/universal-version-manager.js 2>/dev/null | grep -A1 'framework:' | grep 'version:' | sed 's/.*"\([^"]*\)".*/\1/' || echo "NOT_FOUND")

echo "📊 Version Audit:"
echo "   NPM Published:    ${BLUE}${NPM_VERSION}${NC}"
echo "   package.json:     ${BLUE}${PKG_VERSION}${NC}"
echo "   Version Manager:  ${BLUE}${UVM_VERSION}${NC}"
echo ""

# Rule 1: Universal Version Manager MUST be 1 ahead of NPM
echo "1️⃣  Checking: Version Manager 1 Ahead Rule"
if [ "$NPM_VERSION" != "NOT_PUBLISHED" ]; then
  # Extract version numbers
  NPM_MAJOR=$(echo $NPM_VERSION | cut -d. -f1)
  NPM_MINOR=$(echo $NPM_VERSION | cut -d. -f2)
  NPM_PATCH=$(echo $NPM_VERSION | cut -d. -f3)
  
  UVM_MAJOR=$(echo $UVM_VERSION | cut -d. -f1)
  UVM_MINOR=$(echo $UVM_VERSION | cut -d. -f2)
  UVM_PATCH=$(echo $UVM_VERSION | cut -d. -f3)
  
  # Calculate expected next version
  EXPECTED_PATCH=$((NPM_PATCH + 1))
  EXPECTED_VERSION="${NPM_MAJOR}.${NPM_MINOR}.${EXPECTED_PATCH}"
  
  if [ "$UVM_VERSION" != "$EXPECTED_VERSION" ]; then
    echo -e "   ${RED}❌ VIOLATION:${NC} Version manager not 1 ahead of npm"
    echo "      NPM:     ${NPM_VERSION}"
    echo "      UVM:     ${UVM_VERSION}"
    echo "      Expected: ${EXPECTED_VERSION}"
    echo ""
    echo -e "   ${YELLOW}🔧 FIX REQUIRED:${NC}"
    echo "      1. Edit scripts/node/universal-version-manager.js"
    echo "      2. Set OFFICIAL_VERSIONS.framework.version to '${EXPECTED_VERSION}'"
    echo "      3. Run: node scripts/node/universal-version-manager.js"
    ((ERRORS++))
  else
    echo -e "   ${GREEN}✅ PASS:${NC} Version manager is 1 ahead (${UVM_VERSION} > ${NPM_VERSION})"
  fi
else
  echo -e "   ${YELLOW}⚠️  NPM version not available (first publish)${NC}"
fi
echo ""

# Rule 2: package.json MUST match UVM when not in preversion
echo "2️⃣  Checking: package.json Synchronization"
if [ "$PKG_VERSION" != "$UVM_VERSION" ]; then
  echo -e "   ${YELLOW}⚠️  WARNING:${NC} package.json version mismatch"
  echo "      package.json: ${PKG_VERSION}"
  echo "      UVM:          ${UVM_VERSION}"
  echo ""
  echo -e "   ℹ️  This is OK if you're about to run: npm version [patch|minor|major]"
  echo "      That command will update package.json to ${UVM_VERSION}"
  # Don't increment ERRORS - this is just a warning
  ((WARNINGS++))
else
  echo -e "   ${GREEN}✅ PASS:${NC} package.json matches UVM (${PKG_VERSION})"
fi
echo ""

# Rule 3: Source files MUST match UVM
echo "3️⃣  Checking: Source File Synchronization"
SAMPLE_FILE="src/cli/index.ts"
if [ -f "$SAMPLE_FILE" ]; then
  SOURCE_VERSION=$(grep '\.version(' "$SAMPLE_FILE" 2>/dev/null | sed 's/.*\.version("\([^"]*\)").*/\1/' || echo "NOT_FOUND")
  if [ "$SOURCE_VERSION" != "$UVM_VERSION" ] && [ "$SOURCE_VERSION" != "NOT_FOUND" ]; then
    echo -e "   ${RED}❌ VIOLATION:${NC} Source files not synchronized"
    echo "      ${SAMPLE_FILE}: ${SOURCE_VERSION}"
    echo "      UVM:          ${UVM_VERSION}"
    echo ""
    echo -e "   ${YELLOW}🔧 FIX REQUIRED:${NC}"
    echo "      Run: node scripts/node/universal-version-manager.js"
    ((ERRORS++))
  else
    echo -e "   ${GREEN}✅ PASS:${NC} Source files synchronized to ${UVM_VERSION}"
  fi
else
  echo -e "   ${YELLOW}⚠️  Source file ${SAMPLE_FILE} not found${NC}"
fi
echo ""

# Rule 4: README MUST reference correct version
echo "4️⃣  Checking: README.md Version References"
if [ -f "README.md" ]; then
  README_VERSION=$(grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' README.md | head -1 | sed 's/v//' || echo "NOT_FOUND")
  # README should show UVM (next) version or current
  if [ "$README_VERSION" != "$UVM_VERSION" ] && [ "$README_VERSION" != "$PKG_VERSION" ]; then
    echo -e "   ${YELLOW}⚠️  WARNING:${NC} README version may be outdated"
    echo "      README:  v${README_VERSION}"
    echo "      UVM:     ${UVM_VERSION}"
    echo "      package: ${PKG_VERSION}"
    ((WARNINGS++))
  else
    echo -e "   ${GREEN}✅ PASS:${NC} README version references are current"
  fi
else
  echo -e "   ${YELLOW}⚠️  README.md not found${NC}"
fi
echo ""

# Summary
echo "=============================================="
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ COMPLIANCE CHECK FAILED${NC}"
  echo "   Errors:   $ERRORS"
  echo "   Warnings: $WARNINGS"
  echo ""
  echo -e "${RED}🚫 BLOCKED: Cannot proceed with commit/publish${NC}"
  echo "   Fix the violations above and retry."
  exit 1
else
  echo -e "${GREEN}✅ COMPLIANCE CHECK PASSED${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo "   Warnings: $WARNINGS (non-blocking)"
  fi
  echo ""
  echo -e "${GREEN}🚀 APPROVED: Ready for commit/publish${NC}"
  exit 0
fi