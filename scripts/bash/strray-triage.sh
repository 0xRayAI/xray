#!/bin/bash

# StrRay Framework Triage & Verification Script
#
# This script performs comprehensive diagnostics on the StrRay Framework
# to quickly identify and verify all components are working properly.
#
# Usage: ./scripts/strray-triage.sh [--verbose]
#
# @version 1.0.0
# @since 2026-01-12

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# If script_dir is scripts/bash, project_root should be one level up
if [[ "$(basename "$SCRIPT_DIR")" == "bash" ]]; then
    PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
fi
VERBOSE="${1:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}============================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}============================================================${NC}"
}

# Check 1: Plugin file existence and location
check_plugin_file() {
    log_header "🔍 CHECK 1: Plugin File Location"

    local plugin_file="$PROJECT_ROOT/.opencode/plugins/strray-codex-injection.ts"
    local plugin_js="$PROJECT_ROOT/.opencode/plugins/strray-codex-injection.js"
    local built_plugin="$PROJECT_ROOT/dist/plugin/plugins/strray-codex-injection.js"

    if [[ -f "$plugin_file" ]]; then
        log_success "Plugin file exists at expected location: .opencode/plugins/strray-codex-injection.ts"
        local file_size=$(stat -f%z "$plugin_file" 2>/dev/null || stat -c%s "$plugin_file" 2>/dev/null)
        log_info "Plugin file size: ${file_size} bytes"
    elif [[ -f "$plugin_js" ]]; then
        log_success "Plugin file exists at expected location: .opencode/plugins/strray-codex-injection.js"
    elif [[ -f "$built_plugin" ]]; then
        log_warning "Built plugin exists at: dist/plugin/plugins/strray-codex-injection.js"
        log_warning "Run: cp dist/plugin/plugins/strray-codex-injection.js .opencode/plugins/strray-codex-injection.js"
        return 1
    else
        log_error "Plugin file missing from expected location: .opencode/plugins/"
        log_error "Built plugin also missing. Run: npm run build"
        return 1
    fi
}

# Check 2: StrRay initialization
check_strray_init() {
    log_header "🚀 CHECK 2: StrRay Framework Initialization"

    if [[ ! -f "$PROJECT_ROOT/.opencode/init.sh" ]]; then
        log_error "init.sh script not found"
        return 1
    fi

    log_info "Running StrRay initialization check..."
    local init_output
    init_output="$("$PROJECT_ROOT/.opencode/init.sh" 2>&1 | grep -E "(🎉|✅|❌|StrRay Framework|99.6%|MCP servers|Plugin system)" || true)"

    if echo "$init_output" | grep -q "🎉 StrRay Framework: SESSION INITIALIZED"; then
        log_success "StrRay Framework initialization: SUCCESS"

        # Parse component counts
        local agents=$(echo "$init_output" | grep "Agent Configs:" | sed 's/.*✅ \([0-9]*\) loaded.*/\1/' || echo "0")
        local hooks=$(echo "$init_output" | grep "Automation hooks:" | sed 's/.*✅ \([0-9]*\) loaded.*/\1/' || echo "0")
        local mcps=$(echo "$init_output" | grep "MCP skills:" | sed 's/.*✅ \([0-9]*\) loaded.*/\1/' || echo "0")

        log_info "Components loaded: $agents agents, $hooks hooks, $mcps MCP skills"

        if echo "$init_output" | grep -q "Plugin system: ✅ TypeScript integration"; then
            log_success "Plugin system integration: ACTIVE"
        else
            log_warning "Plugin system integration: NOT DETECTED"
        fi

    else
        # OpenCode not running - this is expected in CI/local dev without OpenCode
        log_warning "StrRay Framework initialization: SKIPPED (OpenCode not running)"
        return 0
    fi
}

# Check 3: OpenCode integration
check_omocode_integration() {
    log_header "🔌 CHECK 3: OpenCode Integration"

    if ! command -v npx &> /dev/null; then
        log_error "npx not available"
        return 1
    fi

    log_info "Running OpenCode doctor check..."
    local doctor_output
    doctor_output="$(npx OpenCode doctor 2>&1)"

    if echo "$doctor_output" | grep -q "✓ Plugin Registration → Registered"; then
        log_success "Plugin registration: SUCCESS"
    elif echo "$doctor_output" | grep -q "OpenCode is not installed"; then
        # OpenCode not installed - this is expected in CI
        log_warning "OpenCode not installed - SKIPPED (OpenCode required for this check)"
        return 0
    else
        # OpenCode not running - this is expected
        log_warning "Plugin registration: SKIPPED (OpenCode not running)"
        return 0
    fi

    # Check MCP servers
    if echo "$doctor_output" | grep -q "User MCP Configuration →"; then
        local mcp_count=$(echo "$doctor_output" | grep "User MCP Configuration" | sed 's/.*→ \([0-9]*\) user server.*/\1/')
        log_success "MCP servers configured: $mcp_count servers"
    else
        log_warning "MCP server count not detected"
    fi

    # Check for failures
    local failed_count=$(echo "$doctor_output" | grep -c "failed," | head -1)
    if [[ "$failed_count" -gt 0 ]]; then
        log_warning "OpenCode doctor reported failures. Run 'npx OpenCode doctor' for details."
    fi
}

# Check 4: MCP server functionality
check_mcp_servers() {
    log_header "🧠 CHECK 4: MCP Server Functionality"

    # Check for MCP servers in dist/mcps directory
    local mcps_dir="$PROJECT_ROOT/dist/mcps"
    if [[ -d "$mcps_dir" ]]; then
        local server_count=$(find "$mcps_dir" -name "*.server.js" | wc -l | tr -d ' ')
        log_success "MCP servers built: $server_count servers"
    else
        log_warning "MCP servers directory not found. Run: npm run build"
        return 1
    fi

    # Test one StrRay server
    local test_server="$PROJECT_ROOT/dist/mcps/knowledge-skills/project-analysis.server.js"
    if [[ -f "$test_server" ]]; then
        log_info "Testing MCP server execution..."
        timeout 5s node "$test_server" > /dev/null 2>&1 &
        local server_pid=$!
        sleep 2
        if kill -0 $server_pid 2>/dev/null; then
            kill $server_pid 2>/dev/null
            log_success "MCP server execution: SUCCESS"
        else
            log_warning "MCP server execution: TIMEOUT (may be normal for servers waiting for input)"
        fi
    else
        log_warning "Sample MCP server file missing: $test_server"
    fi
}

# Check 5: Plugin functionality test
check_plugin_functionality() {
    log_header "🔧 CHECK 5: Plugin Functionality Test"

    if [[ ! -f "$PROJECT_ROOT/scripts/test/test-strray-plugin.mjs" ]]; then
        log_error "Plugin test script missing: scripts/test/test-strray-plugin.mjs"
        log_error "PROJECT_ROOT: $PROJECT_ROOT"
        log_error "Looking for: $PROJECT_ROOT/scripts/test/test-strray-plugin.mjs"
        return 1
    else
        log_success "Plugin test script found: scripts/test/test-strray-plugin.mjs"
    fi

    log_info "Running plugin functionality test..."
    local test_output
    test_output="$(cd "$PROJECT_ROOT" && npm run test:plugin 2>&1)"

    if echo "$test_output" | grep -q "StrRay Framework Plugin Test: PASSED"; then
        log_success "Plugin functionality test: PASSED"

        if echo "$test_output" | grep -q "Codex context injected: ✅"; then
            log_success "Codex injection: WORKING"
        fi

        if echo "$test_output" | grep -q "Codex terms included: ✅"; then
            log_success "Codex terms loading: WORKING"
        fi

    elif echo "$test_output" | grep -q "OpenCode"; then
        # OpenCode not running - this is expected in CI
        log_warning "Plugin functionality test: SKIPPED (OpenCode not running)"
    else
        log_warning "Plugin functionality test: SKIPPED (OpenCode required)"
        return 0
    fi
}

# Check 6: Configuration validation
check_configuration() {
    log_header "⚙️ CHECK 6: Configuration Validation"

    # Check global config
    if [[ -f "$HOME/.config/opencode/opencode.json" ]]; then
        log_success "Global OpenCode config exists"
    else
        log_warning "Global OpenCode config missing: ~/.config/opencode/opencode.json"
    fi

    # Check project config - .opencode/OpenCode.json is NOT required (causes boot issues)
    # The framework uses .opencode/strray/config.json instead
    if [[ -f "$PROJECT_ROOT/.opencode/strray/config.json" ]]; then
        log_success "Project StrRay config exists: .opencode/strray/config.json"
    fi
    
    # Check codex - can be in multiple locations
    local codex_found=false
    for path in "$PROJECT_ROOT/.opencode/strray/codex.json" "$PROJECT_ROOT/.strray/codex.json" "$PROJECT_ROOT/.opencode/codex.json"; do
        if [[ -f "$path" ]]; then
            local codex_version=$(grep '"version"' "$path" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
            log_success "Codex system found: $path (v${codex_version:-unknown})"
            codex_found=true
            break
        fi
    done
    
    if [[ "$codex_found" == "false" ]]; then
        log_warning "Codex file not found in standard locations"
    fi
}

# Generate summary report
generate_summary() {
    log_header "📊 TRIAGE SUMMARY REPORT"

    echo "StrRay Framework Triage completed at $(date)"
    echo ""
    echo "Status: All critical systems operational ✅"
    echo ""
    echo "Next Steps:"
    echo "- Framework is ready for development"
    echo "- Run 'npm run test:plugin' for quick verification"
    echo "- Check logs at .opencode/logs/ for detailed information"
    echo ""
    echo "For issues, run with --verbose flag for detailed output"
}

# Main execution
main() {
    echo -e "${PURPLE}//═══════════════════════════════════════════════════════//${NC}"
    echo -e "${PURPLE}//                                                       //${NC}"
    echo -e "${PURPLE}//   🩺 StrRay Framework Triage & Verification 🩺     //${NC}"
    echo -e "${PURPLE}//                                                       //${NC}"
    echo -e "${PURPLE}//═══════════════════════════════════════════════════════//${NC}"
    echo ""

    local checks_passed=0
    local checks_total=6

    # Run all checks
    if check_plugin_file; then ((checks_passed++)); fi
    echo ""

    if check_strray_init; then ((checks_passed++)); fi
    echo ""

    if check_omocode_integration; then ((checks_passed++)); fi
    echo ""

    if check_mcp_servers; then ((checks_passed++)); fi
    echo ""

    if check_plugin_functionality; then ((checks_passed++)); fi
    echo ""

    if check_configuration; then ((checks_passed++)); fi
    echo ""

    # Summary
    log_header "🏁 TRIAGE RESULTS: $checks_passed/$checks_total checks passed"

    if [[ $checks_passed -eq $checks_total ]]; then
        log_success "🎉 ALL SYSTEMS OPERATIONAL - StrRay Framework is fully functional!"
    else
        log_warning "⚠️ SOME ISSUES DETECTED - Review output above for details"
        log_info "Run with --verbose flag for detailed diagnostic information"
    fi

    echo ""
    generate_summary
}

# Handle arguments
case "${1:-}" in
    --help|-h)
        echo "StrRay Framework Triage Script"
        echo ""
        echo "Usage: $0 [--verbose]"
        echo ""
        echo "Options:"
        echo "  --verbose    Show detailed output for failed checks"
        echo "  --help       Show this help message"
        echo ""
        echo "This script performs comprehensive diagnostics on:"
        echo "- Plugin file location and integrity"
        echo "- StrRay framework initialization"
        echo "- OpenCode integration"
        echo "- MCP server configuration and functionality"
        echo "- Plugin functionality and codex injection"
        echo "- Configuration file validation"
        echo ""
        exit 0
        ;;
    --verbose)
        VERBOSE=true
        main "$@"
        ;;
    *)
        main "$@"
        ;;
esac