#!/bin/bash

START_TIME=$(date +%s)

# Get script directory for robust path handling
SCRIPT_DIR=$(dirname "$(realpath "$0")")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/..")

LOG_FILE="$PROJECT_ROOT/.opencode/logs/strray-init-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$PROJECT_ROOT/.opencode/logs"

log() {
    echo "$@" | tee -a "$LOG_FILE"
}

# ASCII Art Header with Purple Coloring
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}//═══════════════════════════════════════════════════════//${NC}" && sleep 0.1
echo -e "${PURPLE}//                                                       //${NC}" && sleep 0.1
echo -e "${PURPLE}//   ███████╗████████╗██████╗ ██████╗  ██████╗ ██╗   ██╗  //${NC}" && sleep 0.1
echo -e "${PURPLE}//   ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗╚██╗ ██╔╝  //${NC}" && sleep 0.1
echo -e "${PURPLE}//   ███████╗   ██║   ██████╔╝██████╔╝███████║ ╚████╔╝   //${NC}" && sleep 0.1
echo -e "${PURPLE}//   ╚════██║   ██║   ██╔══██╗██╔══██╗██╔══██║  ╚██╔╝    //${NC}" && sleep 0.1
echo -e "${PURPLE}//   ███████║   ██║   ██║  ██║██║  ██║██║  ██║   ██║     //${NC}" && sleep 0.1
echo -e "${PURPLE}//   ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝     //${NC}" && sleep 0.1
echo -e "${PURPLE}//                                                       //${NC}" && sleep 0.1
echo -e "${PURPLE}//        ⚡ Precision-Guided AI Development ⚡          //${NC}" && sleep 0.1
echo -e "${PURPLE}//          Platform • 99.6% Error Prevention            //${NC}" && sleep 0.1
echo -e "${PURPLE}//                                                       //${NC}" && sleep 0.1
echo -e "${PURPLE}//═══════════════════════════════════════════════════════//${NC}" && sleep 0.2
echo -e "${PURPLE}//   🚀 Initializing...                                    //${NC}" && sleep 0.3
echo -e "${PURPLE}//═══════════════════════════════════════════════════════//${NC}" && sleep 0.2

# Quick status - count MCP servers, agents, skills
HOOKS_COUNT=$(ls -1 "$PROJECT_ROOT/.opencode/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
MCPS_COUNT=$(ls -1 "$PROJECT_ROOT/dist/mcps/"*.server.js 2>/dev/null | wc -l | tr -d ' ')
if [ "$MCPS_COUNT" -eq 0 ]; then
    MCPS_COUNT=$(ls -1 "$PROJECT_ROOT/node_modules/strray-ai/dist/mcps/"*.server.js 2>/dev/null | wc -l | tr -d ' ')
fi
AGENTS_COUNT=$(ls -1 "$PROJECT_ROOT/.opencode/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
SKILLS_COUNT=$(ls -1 "$PROJECT_ROOT/.opencode/skills/" 2>/dev/null | wc -l | tr -d ' ')

# Plugin status
if [ -f "$PROJECT_ROOT/.opencode/plugins/strray-codex-injection.ts" ]; then
    PLUGIN_STATUS="✅"
else
    PLUGIN_STATUS="❌"
fi

# Framework config check
if [ ! -f "$PROJECT_ROOT/.opencode/enforcer-config.json" ]; then
    echo -e "${PURPLE}//   ❌ Framework configuration not found                     //${NC}"
    exit 1
fi

echo ""
echo "🤖 Agents: $AGENTS_COUNT | ⚙️ MCPs: $MCPS_COUNT | 💡 Skills: $SKILLS_COUNT"

# BootOrchestrator check (with fixed path)
if command -v node &> /dev/null && ([ -f "$PROJECT_ROOT/src/core/boot-orchestrator.ts" ] || [ -f "$PROJECT_ROOT/node_modules/strray-ai/src/core/boot-orchestrator.ts" ] || [ -f "$PROJECT_ROOT/node_modules/strray-ai/dist/mcps/boot-orchestrator.server.js" ]); then
    echo "⚙️ BootOrchestrator: ✅"
fi

echo "✅ Framework ready"
echo "🔌 Plugin: $PLUGIN_STATUS"

INIT_TIME=$(($(date +%s) - START_TIME))
log "StrRay initialized in ${INIT_TIME}s"

sleep 1
exit 0
