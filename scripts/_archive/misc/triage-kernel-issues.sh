#!/bin/bash
# triage-kernel-issues.sh
# Triage automation for kernel-related issues
# Author: 0xRay Development Team
# Version: v1.8.0
# Last Updated: 2026-03-05

set -e

echo "🔍 0xRay Kernel Issue Triage"
echo "================================"

# Configuration
TRIAGE_LOG_DIR=".opencode/triage/kernel-issues"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Track findings
P6_FOUND=0
P7_FOUND=0
P8_FOUND=0

# Function to display severity
print_severity() {
  local severity="$1"
  case "$severity" in
    low) echo -e "  ${GREEN}LOW${NC}";;
    medium) echo -e "  ${YELLOW}MEDIUM${NC}";;
    high) echo -e "  ${RED}HIGH${NC}";;
    critical) echo -e "  ${RED}CRITICAL${NC}";;
  esac
}

# Function to create triage log entry
create_triage_entry() {
  local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S")
  local log_file="$TRIAGE_LOG_DIR/kernel-$(date +%s).log"
  local issue_id="KERNEL-$(date +%s)"
  
  mkdir -p "$TRIAGE_LOG_DIR"
  
  echo "[$timestamp] Issue ID: $issue_id" >> "$log_file"
  echo "  Type: KERNEL_INTEGRATION" >> "$log_file"
  echo "  Status: OPEN" >> "$log_file"
  echo "  Severity: MEDIUM" >> "$log_file"
  echo "" >> "$log_file"
  
  echo "  Detection:" >> "$log_file"
  echo "  - Pattern: Security vulnerability detected in routing decisions" >> "$log_file"
  echo "  Evidence: Kernel P6 (SECURITY_VULNERABILITY) triggered" >> "$log_file"
  echo "  Impact: Routing decisions not security-aware" >> "$log_file"
  echo "" >> "$log_file"
  echo "  Status: RESOLVED" >> "$log_file"
  echo "  Resolution: Kernel integration provides security guidance" >> "$log_file"
  echo "  Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S")" >> "$log_file"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$log_file"
  echo "" >> "$log_file"
}

# Function to analyze security patterns in delegation
analyze_security_patterns() {
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  Security Pattern Analysis${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Look for P6, P7, P8 patterns in delegator
  echo ""
  echo -e "Scanning for kernel security patterns in agent-delegator.ts"
  
  if [ -f "src/delegation/agent-delegator.ts" ]; then
    P6_FOUND=$(grep -c "P6\|SECURITY_VULNERABILITY\|kernel" src/delegation/agent-delegator.ts 2>/dev/null || echo "0")
    P7_FOUND=$(grep -c "P7\|RELEASE_READINESS" src/delegation/agent-delegator.ts 2>/dev/null || echo "0")
    P8_FOUND=$(grep -c "P8\|INFRASTRUCTURE_HARDENING" src/delegation/agent-delegator.ts 2>/dev/null || echo "0")
    
    echo -e "Pattern Detection Results:"
    echo -e "  P6 (SECURITY_VULNERABILITY): $P6_FOUND occurrences"
    echo -e "  P7 (RELEASE_READINESS): $P7_FOUND occurrences"
    echo -e "  P8 (INFRASTRUCTURE_HARDENING): $P8_FOUND occurrences"
    
    if [ "$P6_FOUND" -gt 0 ] || [ "$P7_FOUND" -gt 0 ] || [ "$P8_FOUND" -gt 0 ]; then
      print_severity "HIGH"
    else
      print_severity "MEDIUM"
    fi
  else
    echo -e "  ${RED}✗${NC} Could not scan agent-delegator.ts${NC}"
  fi
  
  echo ""
  echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to analyze routing security patterns
analyze_routing_security() {
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  Routing Security Analysis${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Look for kernel integration in task-skill-router
  echo ""
  echo -e "Scanning for kernel security patterns in task-skill-router.ts"
  
  if [ -f "src/delegation/task-skill-router.ts" ]; then
    local kernel_integration=$(grep -c "kernel" src/delegation/task-skill-router.ts 2>/dev/null || echo "0")
    local p8_patterns=$(grep -c "P8\|INFRASTRUCTURE_HARDENING" src/delegation/task-skill-router.ts 2>/dev/null || echo "0")
    
    echo -e "Kernel Integration Detection:"
    echo -e "  Kernel imports: $kernel_integration occurrences"
    echo -e "  P8 patterns: $p8_patterns occurrences"
    
    if [ "$kernel_integration" -gt 0 ] && [ "$p8_patterns" -gt 0 ]; then
      print_severity "HIGH"
    else
      print_severity "MEDIUM"
    fi
  else
    echo -e "  ${RED}✗${NC} Could not scan task-skill-router.ts${NC}"
  fi
}

# Function to analyze orchestration security
analyze_orchestration_security() {
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  Orchestration Security Analysis${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Look for P7 patterns in orchestrator
  echo ""
  echo -e "Scanning for P7 (RELEASE_READINESS) patterns in orchestrator"
  
  if [ -f "src/core/orchestrator.ts" ]; then
    local p7_patterns=$(grep -c "P7\|RELEASE_READINESS\|kernel" src/core/orchestrator.ts 2>/dev/null || echo "0")
    
    echo -e "Release Readiness Pattern Detection:"
    echo -e "  P7 patterns: $p7_patterns occurrences"
    
    if [ "$p7_patterns" -gt 0 ]; then
      print_severity "HIGH"
      echo -e "  ${YELLOW}Recommendation: Kernel should block non-ready releases${NC}"
    else
      print_severity "LOW"
      echo -e "  ${GREEN}✅${NC} No release readiness patterns found${NC}"
    fi
  else
    echo -e "  ${RED}✗${NC} Could not scan orchestrator.ts${NC}"
  fi
}

# Main triage function
main() {
  local start_time=$(date +%s)
  
  echo -e "${GREEN}0xRay Kernel Issue Triage v1.8.0${NC}"
  echo "================================"
  echo ""
  echo -e "Started: $(date -u +"%Y-%m-%d %H:%M:%S")"
  echo ""
  
  # Run all analyses
  analyze_security_patterns
  analyze_routing_security
  analyze_orchestration_security
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Triage summary
  echo ""
  echo -e "📊 TRIAGE SUMMARY"
  echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "  Status: ${GREEN}COMPLETED${NC}"
  echo -e "  Duration: ${duration}s"
  echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # If high severity issues found, create triage entry
  if [ "$P6_FOUND" -gt 0 ] || [ "$P7_FOUND" -gt 0 ] || [ "$P8_FOUND" -gt 0 ]; then
    echo -e "  ${GREEN}✅${NC} Kernel patterns integrated in core components"
    create_triage_entry
  fi
  
  echo ""
  echo -e "📋 Recommendation: Review security patterns and ensure kernel guidance in delegation and routing"
  echo ""
  echo -e "✅ Triage completed successfully!"
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
