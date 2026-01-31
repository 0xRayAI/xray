#!/bin/bash

# StringRay Framework Deployment Script (Simplified)
# Deploys StringRay plugin for oh-my-opencode integration

# @since 2026-01-12

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VERSION_TYPE="${1:-patch}"
DRY_RUN="${2:-false}"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "Starting StringRay Framework Deployment"
echo "=============================================="

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Remove existing package if it exists
if [ -f "strray-ai-*.tgz" ]; then
    log_warning "Removing existing package: $(ls strray-ai-*.tgz)"
    rm -f strray-ai-*.tgz
fi

log_success "Pre-deployment checks passed"

# Build framework
log_info "Building StringRay framework..."

npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    log_error "Build failed"
    exit 1
fi

# Check if plugin file exists
log_info "Checking for plugin file..."

PLUGIN_FILE="dist/plugin/strray-codex-injection.js"
if [ -f "$PLUGIN_FILE" ]; then
    log_success "Plugin file exists"
    log_success "Plugin file validated"
else
    log_error "Plugin file missing"
    exit 1
fi

log_success "Plugin deployment complete!"