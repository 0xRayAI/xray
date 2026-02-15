#!/bin/bash
#
# CI NPM Orchestration Test
# Comprehensive test of npm package installation, postinstall, and orchestration
# Designed to run in CI/CD pipelines (GitHub Actions, etc.)
#
# This script:
# 1. Builds the npm package
# 2. Creates isolated test environment
# 3. Installs package via npm
# 4. Runs postinstall
# 5. Verifies plugin paths transformed correctly
# 6. Runs orchestration tests
# 7. Reports results
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
TEST_DIR="${TEST_DIR:-/tmp/strray-ci-test-$$}"
PACKAGE_NAME="strray-ai"
# Dynamically get version from package.json
PACKAGE_VERSION="${PACKAGE_VERSION:-$(cd "$PROJECT_DIR" && node -p \"require('./package.json').version\")}"
PACKAGE_FILE="${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz"
TIMEOUT=300

# Track results
ERRORS=0
WARNINGS=0
PASSED=0

# Cleanup function
cleanup() {
    if [[ -d "$TEST_DIR" ]]; then
        echo -e "${BLUE}🧹 Cleaning up test directory...${NC}"
        rm -rf "$TEST_DIR"
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

log_step() {
    echo ""
    echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Step $1: $2${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
}

run_with_timeout() {
    local timeout=$1
    shift
    local cmd="$@"
    
    if timeout $timeout bash -c "$cmd"; then
        return 0
    else
        return 1
    fi
}

# Header
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     StringRay CI NPM Orchestration Test          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Project: $PROJECT_DIR"
log_info "Test Directory: $TEST_DIR"
log_info "Package: $PACKAGE_FILE"
echo ""

# ═══════════════════════════════════════════════════════
# STEP 1: Build Package
# ═══════════════════════════════════════════════════════
log_step "1" "Build Package"

cd "$PROJECT_DIR"

log_info "Running npm run build:all..."
if npm run build:all > /tmp/build.log 2>&1; then
    log_success "Build completed"
else
    log_error "Build failed (see /tmp/build.log)"
    tail -20 /tmp/build.log
    exit 1
fi

log_info "Creating npm package..."
if npm pack --silent > /tmp/pack.log 2>&1; then
    if [[ -f "$PACKAGE_FILE" ]]; then
        log_success "Package created: $PACKAGE_FILE ($(ls -lh $PACKAGE_FILE | awk '{print $5}'))"
    else
        log_error "Package file not found after npm pack"
        exit 1
    fi
else
    log_error "npm pack failed (see /tmp/pack.log)"
    exit 1
fi

# ═══════════════════════════════════════════════════════
# STEP 2: Create Test Environment
# ═══════════════════════════════════════════════════════
log_step "2" "Create Test Environment"

if [[ -d "$TEST_DIR" ]]; then
    log_info "Removing existing test directory..."
    rm -rf "$TEST_DIR"
fi

log_info "Creating test directory: $TEST_DIR"
mkdir -p "$TEST_DIR"

log_info "Initializing npm project..."
cd "$TEST_DIR"
if npm init -y > /tmp/init.log 2>&1; then
    log_success "Test environment created"
else
    log_error "npm init failed"
    exit 1
fi

# ═══════════════════════════════════════════════════════
# STEP 3: Install Package
# ═══════════════════════════════════════════════════════
log_step "3" "Install Package via NPM"

log_info "Installing $PACKAGE_FILE..."
if run_with_timeout $TIMEOUT "npm install '$PROJECT_DIR/$PACKAGE_FILE' --silent" > /tmp/install.log 2>&1; then
    log_success "Package installed successfully"
else
    log_error "npm install failed (see /tmp/install.log)"
    tail -30 /tmp/install.log
    exit 1
fi

# Verify installation
if [[ -d "node_modules/strray-ai" ]]; then
    log_success "Package exists in node_modules"
else
    log_error "Package not found in node_modules"
    exit 1
fi

# ═══════════════════════════════════════════════════════
# STEP 4: Run Postinstall
# ═══════════════════════════════════════════════════════
log_step "4" "Run Postinstall Script"

log_info "Running postinstall..."
if node node_modules/strray-ai/scripts/node/postinstall.cjs > /tmp/postinstall.log 2>&1; then
    log_success "Postinstall completed"
else
    log_error "Postinstall failed (see /tmp/postinstall.log)"
    tail -30 /tmp/postinstall.log
    exit 1
fi

# ═══════════════════════════════════════════════════════
# STEP 5: Verify Plugin Paths (THE KEY TEST!)
# ═══════════════════════════════════════════════════════
log_step "5" "Verify Plugin Path Transformation"

log_info "Running path verification..."
if [[ -f "node_modules/strray-ai/scripts/mjs/verify-plugin-paths.mjs" ]]; then
    if node node_modules/strray-ai/scripts/mjs/verify-plugin-paths.mjs; then
        log_success "All plugin paths correctly transformed"
    else
        log_error "Plugin path verification FAILED"
        log_error "Postinstall did not transform paths correctly"
        exit 1
    fi
else
    log_warning "verify-plugin-paths.mjs not found in package, skipping"
fi

# Additional manual checks
log_info "Checking configuration files..."

# Check OpenCode.json
if [[ -f ".opencode/OpenCode.json" ]]; then
    if grep -q "node_modules/strray-ai" .opencode/OpenCode.json; then
        log_success "OpenCode.json has correct paths"
    else
        log_error "OpenCode.json missing node_modules paths"
        ((ERRORS++))
    fi
else
    log_error "OpenCode.json not found"
    ((ERRORS++))
fi

# Check opencode.json
if [[ -f "opencode.json" ]]; then
    if grep -q "node_modules/strray-ai" opencode.json; then
        log_success "opencode.json has correct paths"
    else
        log_warning "opencode.json may need path verification"
    fi
else
    log_warning "opencode.json not found"
fi

# ═══════════════════════════════════════════════════════
# STEP 6: Test CLI Commands
# ═══════════════════════════════════════════════════════
log_step "6" "Test CLI Commands"

CLI_FAILED=0

log_info "Testing CLI help..."
if npx strray-ai --help > /tmp/cli-help.log 2>&1; then
    log_success "CLI help works"
else
    log_error "CLI help failed"
    CLI_FAILED=1
fi

log_info "Testing CLI status..."
if npx strray-ai status > /tmp/cli-status.log 2>&1; then
    log_success "CLI status works"
else
    log_error "CLI status failed"
    CLI_FAILED=1
fi

log_info "Testing CLI version..."
if npx strray-ai --version > /tmp/cli-version.log 2>&1; then
    log_success "CLI version works"
else
    log_error "CLI version failed"
    CLI_FAILED=1
fi

# ═══════════════════════════════════════════════════════
# STEP 7: Run Orchestration Tests
# ═══════════════════════════════════════════════════════
log_step "7" "Run Orchestration Tests"

# Test simple orchestration
log_info "Running simple orchestration test..."
if [[ -f "node_modules/strray-ai/scripts/mjs/test-simple-prompt.mjs" ]]; then
    if run_with_timeout 60 "node node_modules/strray-ai/scripts/mjs/test-simple-prompt.mjs" > /tmp/simple-test.log 2>&1; then
        log_success "Simple orchestration test PASSED"
    else
        log_error "Simple orchestration test FAILED"
        tail -20 /tmp/simple-test.log
    fi
else
    log_warning "test-simple-prompt.mjs not found"
fi

# Test complex orchestration
log_info "Running complex orchestration test..."
if [[ -f "node_modules/strray-ai/scripts/mjs/test-orchestrator-complex.mjs" ]]; then
    if run_with_timeout 120 "node node_modules/strray-ai/scripts/mjs/test-orchestrator-complex.mjs" > /tmp/complex-test.log 2>&1; then
        log_success "Complex orchestration test PASSED"
    else
        log_error "Complex orchestration test FAILED"
        tail -20 /tmp/complex-test.log
    fi
else
    log_warning "test-orchestrator-complex.mjs not found"
fi

# ═══════════════════════════════════════════════════════
# STEP 8: Additional Validation
# ═══════════════════════════════════════════════════════
log_step "8" "Additional Validation"

# Check file structure
log_info "Verifying file structure..."
[[ -f "opencode.json" ]] && log_success "opencode.json exists" || log_error "opencode.json missing"
[[ -d ".opencode" ]] && log_success ".opencode directory exists" || log_error ".opencode missing"
[[ -L ".strray" ]] && log_success ".strray symlink exists" || log_warning ".strray symlink missing"

# Check plugin files exist
log_info "Verifying plugin files..."
[[ -f "node_modules/strray-ai/dist/plugin/strray-codex-injection.js" ]] && \
    log_success "Plugin file exists" || log_error "Plugin file missing"

# ═══════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 FINAL REPORT                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 Test Summary:"
echo -e "   ✅ Passed: $PASSED"
echo -e "   ❌ Errors: $ERRORS"
echo -e "   ⚠️  Warnings: $WARNINGS"
echo ""

if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}🎉 CI NPM ORCHESTRATION TEST: PASSED${NC}"
    echo -e "${GREEN}✅ Package is ready for production deployment${NC}"
    echo ""
    echo "📦 Package location:"
    echo "   $PROJECT_DIR/$PACKAGE_FILE"
    echo ""
    exit 0
else
    echo -e "${RED}❌ CI NPM ORCHESTRATION TEST: FAILED${NC}"
    echo -e "${RED}⚠️  Package has issues that need fixing${NC}"
    echo ""
    echo "📋 Check logs:"
    echo "   Build: /tmp/build.log"
    echo "   Install: /tmp/install.log"
    echo "   Postinstall: /tmp/postinstall.log"
    echo ""
    exit 1
fi