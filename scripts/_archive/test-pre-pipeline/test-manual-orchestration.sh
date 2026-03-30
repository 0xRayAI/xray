#!/bin/bash

# StringRay Framework - Manual Multi-Agent Orchestration Demo
# Demonstrates explicit agent coordination for specific tasks

set -e

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to log success
success() {
    echo -e "✅ $1"
}

# Function to log info
info() {
    echo -e "ℹ️  $1"
}

# Function to log error
error() {
    echo -e "❌ $1"
}

# Manual orchestration demo
manual_orchestration_demo() {
    echo ""
    log "Demonstrating MANUAL multi-agent orchestration..."
    
    node -e '
    (async () => {
      try {
        const { createAgentDelegator } = require("/Users/blaze/dev/stringray/dist/delegation/agent-delegator.js");
        const { StringRayStateManager } = require("/Users/blaze/dev/stringray/dist/state/state-manager.js");
        
        const stateManager = new StringRayStateManager(".opencode/state", true, false);
        const delegator = createAgentDelegator(stateManager);
        
        console.log("🔄 AUTOMATED ORCHESTRATION (Framework decides):");
        const autoResult = await delegator.analyzeDelegation({
          operation: "simple-task",
          description: "Simple utility function",
          context: { fileCount: 1, changeVolume: 10, dependencies: 0 }
        });
        console.log("   Strategy:", autoResult.strategy);
        console.log("   Agents:", autoResult.agents.length);
        console.log("   Reasoning: Framework analyzed complexity automatically");
        console.log("");
        
        console.log("🎯 MANUAL ORCHESTRATION (This Demo)");
        const manualResult = await delegator.analyzeDelegation({
          operation: "complex-audit",
          description: "Comprehensive audit requiring specific expertise",
          context: {
            fileCount: 1, // Still simple
            changeVolume: 10 // Still minimal
          },
          forceMultiAgent: true,
          requiredAgents: ["security-auditor", "code-reviewer", "enforcer"]
        });
        console.log("   Strategy: FORCED multi-agent");
        console.log("   Agents:", manualResult.agents.join(", "));
        console.log("   Reasoning: Developer explicitly requested multi-agent coordination");
        console.log("");
        
        success("Manual orchestration demonstrated successfully!");
      } catch (err) {
        error("Manual orchestration error: " + err.message);
      }
    })();
    ' 2>/dev/null
    
    if [ $? -eq 0 ]; then
        success "Manual orchestration completed successfully!"
    else
        error "Manual orchestration failed"
    fi
}

# Main execution
log "🎯 StringRay Framework - Manual Multi-Agent Orchestration Demo"
log "=========================================================="

log "🔄 AUTOMATED ORCHESTRATION (Previous Demo)"
log "   Framework automatically decides agent count based on complexity"
log "   • Simple tasks → Single agent"
log "   • Complex tasks → Multi-agent"

log "🎯 MANUAL ORCHESTRATION (This Demo)"
log "   Developer explicitly forces multi-agent coordination"
log "   • Override complexity analysis"
log "   • Specify exact agents needed"
log "   • Force collaboration for specific expertise"

log ""
log "Demonstrating MANUAL multi-agent orchestration..."
manual_orchestration_demo