#!/bin/bash

# Version Compliance Enforcement Shell Wrapper
# 
# This shell script wraps the TypeScript version compliance enforcement.
# It provides the CLI interface expected by CI/CD pipelines.
#
# Usage: ./scripts/node/enforce-version-compliance.sh
#
# @version 1.0.0
# @since 2026-01-15

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Use npx tsx to run TypeScript files directly
# tsx is a zero-config TypeScript execution engine
npx tsx "$SCRIPT_DIR/enforce-version-compliance.ts"
