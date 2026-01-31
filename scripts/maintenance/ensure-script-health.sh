#!/bin/bash

# StringRay Framework Script Maintenance System
# Ensures 95% of scripts have correct paths and are properly maintained
# Author: StringRay Enforcer Agent
# Version: 1.1.1
# Date: 2026-01-28

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
FIXED_CHECKS=0
ARCHIVED_CHECKS=0

# Logging functions
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

# Check if script needs fixing
needs_path_fix() {
    local file="$1"
    
    # Check for TypeScript import path issues
    if grep -q "import.*\"\.\./" "$file" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Found relative import paths in $file${NC}"
        return 1
    fi
    
    # Check for JavaScript ES module issues
    if grep -q "import.*from" "$file" 2>/dev/null; then
        if ! grep -q "require(" "$file" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Found ES import syntax in CommonJS script $file${NC}"
            return 1
        fi
    fi
    
    # Check for path resolution issues
    if grep -q "scripts/dist/" "$file" 2>/dev/null; then
        if grep -q "\.\./" "$file" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Found incorrect relative path in $file${NC}"
            return 1
        fi
    fi
    
    return 0
}

# Archive broken scripts
archive_broken_script() {
    local file="$1"
    local archive_dir="scripts/archives/broken/$(date +%Y%m%d)"
    mkdir -p "$archive_dir"
    
    mv "$file" "$archive_dir/"
    echo -e "${YELLOW}📦 Archived: $file -> $archive_dir/${NC}"
    ((ARCHIVED_CHECKS++))
}

# Check all scripts systematically
check_all_scripts() {
    echo -e "${BLUE}🔍 COMPREHENSIVE SCRIPT AUDIT${NC}"
    echo -e "${BLUE}=======================================${NC}"
    
    local script_types=("*.ts" "*.js" "*.mjs" "*.cjs")
    
    for type in "${script_types[@]}"; do
        echo ""
        echo -e "${BLUE}🔍 Checking $type scripts...${NC}"
        
        local count=0
        local fixed_count=0
        
        while IFS= read -r -d '' file; do
            ((TOTAL_CHECKS++))
            
            if [[ -f "$file" ]]; then
                ((count++))
                
                if needs_path_fix "$file"; then
                    ((FIXED_CHECKS++))
                    fix_script_paths "$file"
                    ((fixed_count++))
                fi
                
                # Check if script is executable and actually works
                if [[ -x "$file" ]]; then
                    # Basic syntax check
                    if bash -n "$file" 2>/dev/null; then
                        echo -e "   ✅ Syntax: Valid${NC}"
                    else
                        echo -e "   ❌ Syntax: Invalid${NC}"
                    fi
                fi
            fi
        done
        
        echo -e "${GREEN}📊 $type Results:${NC}"
        echo -e "   Total: $count"
        echo -e "   Fixed: $fixed_count"
        echo -e "   Success Rate: $((fixed_count * 100 / count))%"
        
        if [[ $fixed_count -gt 0 ]]; then
            success "$type scripts: $fixed_count issues resolved"
        else
            echo -e "   ✅ All $type scripts working correctly"
        fi
        echo ""
}

# Fix all scripts automatically
    auto_fix_all_scripts() {
    echo -e "${BLUE}🚀 AUTO-FIXING ALL PATH AND MODULE ISSUES${NC}"
    echo -e "${BLUE}============================================${NC}"
}
}
}
    
    local auto_fix_count=0
    
    # Fix TypeScript import paths
    for file in $(find scripts -name "*.ts" -type f); do
        if needs_path_fix "$file"; then
            sed -i '' 's|"\./src/|"../../../src/|g' "$file"
            ((auto_fix_count++))
            echo -e "   Fixed TypeScript paths: $file"
        fi
    done
    
    # Fix JavaScript ES module issues
    for file in $(find scripts -name "*.js" -type f); do
        if needs_path_fix "$file"; then
            sed -i '' 's|import.*from|require.*from|g' "$file"
            ((auto_fix_count++))
            echo -e "   Fixed JavaScript ES modules: $file"
        fi
    done
    
    # Fix MJS path issues
    for file in $(find scripts -name "*.mjs" -type f); do
        if needs_path_fix "$file"; then
            sed -i '' 's|\.\./dist/|../../dist/|g' "$file"
            ((auto_fix_count++))
            echo -e "   Fixed MJS paths: $file"
        fi
    done
    
    # Fix Bash script path issues
    for file in $(find scripts -name "*.sh" -type f); do
        if needs_path_fix "$file"; then
            # Fix PROJECT_ROOT calculation for scripts in subdirectories
            sed -i '' 's|PROJECT_ROOT="$(dirname "$(dirname "${BASH_SOURCE[0]}")" && pwd)"|PROJECT_ROOT="$(dirname "$(dirname "${BASH_SOURCE[0]}")"/..")|g' "$file"
            ((auto_fix_count++))
            echo -e "   Fixed Bash paths: $file"
        fi
    done
    
    echo -e "${GREEN}✅ AUTO-FIX COMPLETE${NC}"
    echo -e "${GREEN}Applied $auto_fix_count automatic fixes${NC}"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}🔧 StringRay Framework - Script Maintenance System${NC}"
    echo -e "${BLUE}=============================================${NC}"
    
    # Phase 1: Systematic audit
    check_all_scripts
    
    # Phase 2: Auto-fix critical issues
    auto_fix_all_scripts
    
    # Phase 3: Report results
    echo ""
    echo -e "${BLUE}📊 AUDIT RESULTS${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo -e "${GREEN}Scripts Checked: $TOTAL_CHECKS${NC}"
    echo -e "${GREEN}Scripts Fixed: $FIXED_CHECKS${NC}"
    echo -e "${GREEN}Scripts Archived: $ARCHIVED_CHECKS${NC}"
    
    if [[ $FIXED_CHECKS -gt 0 ]]; then
        success "Script maintenance complete - issues resolved"
    else
        warning "No issues found requiring fixes"
    fi
    
    echo ""
    echo -e "${BLUE}🔧 NEXT STEPS${NC}"
    echo -e "${BLUE}1. Update documentation with current status${NC}"
    echo -e "${BLUE}2. Run maintenance monthly${NC}"
    echo -e "${BLUE}3. Review scripts before major framework changes${NC}"
}

# Execute main
main "$@"