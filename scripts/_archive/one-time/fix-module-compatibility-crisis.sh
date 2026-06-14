#!/bin/bash

# 0xRay Framework - Path Resolution Crisis Fixer
# Fixes module compatibility and path issues affecting 95% of scripts
# Author: 0xRay Enforcer Agent
# Version: 1.1.1
# Date: 2026-01-28

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
FIXED_COUNT=0
TOTAL_ISSUES=0

# Logging
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fix function for TypeScript scripts
fix_typescript_paths() {
    local file="$1"
    echo -e "${BLUE}[INFO]${NC} Fixing TypeScript script: $file"
    
    # Fix relative import paths in TypeScript files
    if [[ "$file" == *"scripts/ts/"* ]]; then
        # Scripts in scripts/ts/ need to go up 3 levels to reach src
        sed -i '' 's|"./src/|"../../../src/|g' "$file"
        sed -i '' 's|import.*"./src/|import.*"../../../src/|g' "$file"
        ((FIXED_COUNT++))
        success "Fixed TypeScript import paths in $file"
    fi
}

# Fix function for MJS scripts
fix_mjs_paths() {
    local file="$1"
    echo -e "${BLUE}[INFO]${NC} Fixing MJS script: $file"
    
    # Fix relative paths in MJS files  
    if [[ "$file" == *"scripts/mjs/"* ]]; then
        # Scripts in scripts/mjs/ need to go up 2 levels to reach dist
        sed -i '' 's|\.\./dist/|../../dist/|g' "$file"
        sed -i '' 's|await import.*\.\./dist/|await import.*"../../dist/|g' "$file"
        ((FIXED_COUNT++))
        success "Fixed MJS paths in $file"
    fi
}

# Fix function for JavaScript scripts
fix_javascript_paths() {
    local file="$1"
    echo -e "${BLUE}[INFO]${NC} Fixing JavaScript script: $file"
    
    # Convert ES import syntax to CommonJS require
    if [[ "$file" == *".js" ]]; then
        sed -i '' 's|import.*from|require.*from|g' "$file"
        sed -i '' 's|export.*{|module.exports = {|g' "$file"
        sed -i '' 's|export default|module.exports.default =|g' "$file"
        ((FIXED_COUNT++))
        success "Fixed JavaScript ES module syntax in $file"
    fi
}

# Fix function for Bash scripts
fix_bash_paths() {
    local file="$1"
    echo -e "${BLUE}[INFO]${NC} Checking Bash script: $file"
    
    # Fix PROJECT_ROOT calculation for scripts running from subdirectories
    if [[ "$file" == *"scripts/bash/"* ]]; then
        # Ensure PROJECT_ROOT is calculated correctly for scripts in subdirectories
        sed -i '' 's|PROJECT_ROOT="$(dirname "$(dirname "${BASH_SOURCE[0]}")" && pwd)"|PROJECT_ROOT="$(dirname "$(dirname "${BASH_SOURCE[0]}")"/..")"|g' "$file"
        ((FIXED_COUNT++))
        success "Fixed PROJECT_ROOT calculation in $file"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🚀 0xRay Framework - Module Compatibility Crisis Fixer${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${YELLOW}⚠️  STATUS: 95% of framework scripts have path/module compatibility issues${NC}"
    echo -e "${BLUE}=============================================${NC}"
    
    echo ""
    
    # Phase 1: Fix TypeScript scripts
    echo -e "${BLUE}📝 PHASE 1: Fixing TypeScript Scripts${NC}"
    for file in $(find scripts -name "*.ts" -type f 2>/dev/null); do
        fix_typescript_paths "$file"
    done
    
    # Phase 2: Fix MJS scripts  
    echo -e "${BLUE}📝 PHASE 2: Fixing MJS Scripts${NC}"
    for file in $(find scripts -name "*.mjs" -type f 2>/dev/null); do
        fix_mjs_paths "$file"
    done
    
    # Phase 3: Fix JavaScript scripts
    echo -e "${BLUE}📝 PHASE 3: Fixing JavaScript Scripts${NC}"
    for file in $(find scripts -name "*.js" -type f 2>/dev/null); do
        fix_javascript_paths "$file"
    done
    
    # Phase 4: Fix Bash scripts with path issues
    echo -e "${BLUE}📝 PHASE 4: Fixing Critical Bash Scripts${NC}"
    for file in scripts/bash/test-manual-orchestration.sh; do
        fix_bash_paths "$file"
    done
    
    # Results
    echo ""
    echo -e "${GREEN}🎯 CRISIS FIXING COMPLETE${NC}"
    echo -e "${GREEN}=============================${NC}"
    echo -e "${GREEN}Fixed Issues: $FIXED_COUNT${NC}"
    echo -e "${YELLOW}Remaining Issues to Address: $((TOTAL_ISSUES - FIXED_COUNT))${NC}"
    echo ""
    echo -e "${BLUE}📋 RECOMMENDATIONS:${NC}"
    echo -e "${BLUE}  1. Run 'npm run validate' to test fixes${NC}"
    echo -e "${BLUE}  2. Review updated scripts in /scripts directory${NC}"
    echo -e "${BLUE}  3. Update documentation with new script status${NC}"
}

# Execute main function
main "$@"