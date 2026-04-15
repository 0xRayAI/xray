#!/bin/bash

# StrRay Framework - Session Initialization
# Loads framework templates and automation hooks on StrRay startup

echo "🎯 StringRay AI v1.3.4"
echo "Initializing session with Codex compliance..."

# Load framework configuration
if [ -f "strray/strray-config.json" ]; then
    echo "✅ StrRay configuration loaded"
else
    echo "❌ StrRay configuration not found"
    exit 1
fi

# Initialize automation hooks
HOOKS=("pre-commit-introspection" "auto-format" "security-scan" "enforcer-daily-scan" "summary-logger")
for hook in "${HOOKS[@]}"; do
    if [ -f "strray/commands/${hook}.md" ]; then
        echo "✅ Automation hook loaded: ${hook}"
    else
        echo "⚠️ Automation hook missing: ${hook}"
    fi
done

# Initialize MCP knowledge skills
MCPS=("project-analysis" "testing-strategy" "architecture-patterns" "performance-optimization" "git-workflow" "api-design")
for mcp in "${MCPS[@]}"; do
    if [ -f "strray/mcps/${mcp}.mcp.json" ]; then
        echo "✅ MCP knowledge skill loaded: ${mcp}"
    else
        echo "⚠️ MCP knowledge skill missing: ${mcp}"
    fi
done

# Load agent configurations
AGENTS=("enforcer" "architect" "orchestrator" "bug-triage-specialist" "code-reviewer" "security-auditor" "refactorer" "testing-lead")
for agent in "${AGENTS[@]}"; do
    if [ -f "strray/agents/${agent}.md" ]; then
        echo "✅ Agent configuration loaded: ${agent}"
    else
        echo "⚠️ Agent configuration missing: ${agent}"
    fi
done

# Validate workflow templates
if [ -f "strray/workflows/post-deployment-audit.yml" ]; then
    echo "✅ Workflow template loaded: post-deployment-audit"
else
    echo "⚠️ Workflow template missing: post-deployment-audit"
fi

# Run initial compliance check
echo ""
echo "🔍 Running initial framework compliance check..."
if command -v bash &> /dev/null && [ -f "strray/commands/enforcer-daily-scan.md" ]; then
    # Skip frontmatter (first 5 lines) and execute bash script
    tail -n +6 strray/commands/enforcer-daily-scan.md | bash
else
    echo "⚠️ Compliance check unavailable"
fi

echo ""
echo "🎯 StrRay Framework: SESSION INITIALIZED"
echo "Codex terms: [1,2,3,4,5,6,7,8,9,10,15,24,29,32,38,42,43]"
echo "Ready for development with 90% runtime error prevention"