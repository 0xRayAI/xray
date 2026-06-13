#!/bin/bash

# Get script directory for robust path handling
SCRIPT_DIR=$(dirname "$(realpath "$0")")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR")
if [ -f "$SCRIPT_DIR/package.json" ] && [ -d "$SCRIPT_DIR/.opencode" ]; then
    PROJECT_ROOT="$SCRIPT_DIR"
else
    PROJECT_ROOT=$(realpath "$SCRIPT_DIR/..")
fi

# Detect mode: dev (xray repo) vs consumer (npm dependency)
# - Dev: PROJECT_ROOT has src/core/boot-orchestrator.ts (xray source)
# - Consumer: node_modules/0xray/package.json exists
# - Fallback: no xray found at all
NODE_MODULES_PACKAGE_JSON="$PROJECT_ROOT/node_modules/0xray/package.json"

if [ -f "$PROJECT_ROOT/src/core/boot-orchestrator.ts" ]; then
    # Development mode: running inside the xray repo itself
    FRAMEWORK_ROOT="$PROJECT_ROOT"
elif [ -f "$NODE_MODULES_PACKAGE_JSON" ]; then
    # Consumer mode: 0xray installed as npm dependency
    FRAMEWORK_ROOT="$PROJECT_ROOT/node_modules/0xray"
else
    FRAMEWORK_ROOT="$PROJECT_ROOT"
fi

# 0xRay Framework Version - read from FRAMEWORK_ROOT (already resolved above)
# FRAMEWORK_ROOT correctly picks source in dev mode, node_modules in consumer mode
FRAMEWORK_VERSION=$(node -e "console.log(require('$FRAMEWORK_ROOT/package.json').version)" 2>/dev/null || echo "unknown")

# Dedup guard — prevent duplicate runs during startup
# Uses a TTL lockfile (10s window) since OpenCode may trigger config hook
# from multiple plugin copies in quick succession
# Key by PROJECT_ROOT (md5) so all invocations in the same project share one lock
LOCK_KEY=$(echo -n "$PROJECT_ROOT" | md5 | cut -c1-16)
LOCK_FILE="/tmp/xray-init-${LOCK_KEY}.lock"
LOCK_TTL=10
if [ -f "$LOCK_FILE" ]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK_FILE" 2>/dev/null || stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))
    if [ "$LOCK_AGE" -lt "$LOCK_TTL" ]; then
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"

START_TIME=$(date +%s)

LOG_FILE="$PROJECT_ROOT/.opencode/logs/xray-init-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$PROJECT_ROOT/.opencode/logs"

log() {
    echo "$@" | tee -a "$LOG_FILE"
}

# ASCII Art Header with Purple Coloring
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}//═══════════════════════════════════════════════════════//${NC}" && sleep 0.1
echo -e "${PURPLE}//                                                       //${NC}" && sleep 0.1
echo -e "${PURPLE}//      ██████╗ ██╗  ██╗██████╗  █████╗ ██╗   ██╗        //${NC}" && sleep 0.1
echo -e "${PURPLE}//      ██╔══██╗╚██╗██╔╝██╔══██╗██╔══██╗╚██╗ ██╔╝        //${NC}" && sleep 0.1
echo -e "${PURPLE}//      ██║  ██║ ╚███╔╝ ██████╔╝██║  ██║ ╚████╔╝         //${NC}" && sleep 0.1
echo -e "${PURPLE}//      ██║  ██║ ██╔██╗ ██╔══██╗███████║  ╚██╔╝          //${NC}" && sleep 0.1
echo -e "${PURPLE}//      ╚█████╔╝██╔╝ ██╗██║  ██║██╔══██║   ██║           //${NC}" && sleep 0.1
echo -e "${PURPLE}//       ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝           //${NC}" && sleep 0.1
echo -e "${PURPLE}//                                                       //${NC}" && sleep 0.1
echo -e "${PURPLE}//      ⚡ 0xRay: Self-Healing AI Governance OS          //${NC}" && sleep 0.1
echo -e "${PURPLE}//      42 agents · 44 skills · 39 MCP servers           //${NC}" && sleep 0.1
echo -e "${PURPLE}//═══════════════════════════════════════════════════════//${NC}" && sleep 0.2
echo -e "${PURPLE}//              🚀 Initializing...                          //${NC}" && sleep 0.3
echo -e "${PURPLE}//═══════════════════════════════════════════════════════//${NC}" && sleep 0.2

# Quick status - count MCP servers, agents, skills (check both dev and consumer paths)
HOOKS_COUNT=$(ls -1 "$PROJECT_ROOT/.opencode/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')

# MCP servers - check dist, then node_modules
MCPS_COUNT=$(ls -1 "$PROJECT_ROOT/dist/mcps/"*.server.js 2>/dev/null | wc -l | tr -d ' ')
if [ "$MCPS_COUNT" -eq 0 ]; then
    MCPS_COUNT=$(ls -1 "$PROJECT_ROOT/node_modules/0xray/dist/mcps/"*.server.js 2>/dev/null | wc -l | tr -d ' ')
fi

# Agents - check .opencode/agents (.yml files), then node_modules
AGENTS_COUNT=$(ls -1 "$PROJECT_ROOT/.opencode/agents/"*.yml 2>/dev/null | wc -l | tr -d ' ')
if [ "$AGENTS_COUNT" -eq 0 ]; then
    AGENTS_COUNT=$(ls -1 "$PROJECT_ROOT/node_modules/0xray/.opencode/agents/"*.yml 2>/dev/null | wc -l | tr -d ' ')
fi

# Skills - check .opencode/skills, then .xray/skills (Hermes), then node_modules
SKILLS_COUNT=$(ls -1d "$PROJECT_ROOT/.opencode/skills/"* 2>/dev/null | wc -l | tr -d ' ')
if [ "$SKILLS_COUNT" -eq 0 ]; then
    SKILLS_COUNT=$(ls -1d "$PROJECT_ROOT/.xray/skills/"* 2>/dev/null | wc -l | tr -d ' ')
fi
if [ "$SKILLS_COUNT" -eq 0 ]; then
    SKILLS_COUNT=$(ls -1d "$PROJECT_ROOT/node_modules/0xray/.opencode/skills/"* 2>/dev/null | wc -l | tr -d ' ')
fi

# Plugin status (check dev dist, then .opencode, then consumer)
PLUGIN_DEV_DIST="$PROJECT_ROOT/dist/plugin/xray-codex-injection.js"
PLUGIN_DEV_OPENCODE="$PROJECT_ROOT/.opencode/plugin/xray-codex-injection.js"
PLUGIN_DEV_OPENCODE_PLURAL="$PROJECT_ROOT/.opencode/plugins/xray-codex-injection.js"
PLUGIN_CONSUMER="$PROJECT_ROOT/node_modules/0xray/.opencode/plugin/xray-codex-injection.js"
PLUGIN_CONSUMER_PLURAL="$PROJECT_ROOT/node_modules/0xray/.opencode/plugins/xray-codex-injection.js"

if [ -f "$PLUGIN_DEV_DIST" ]; then
    PLUGIN_STATUS="✅"
elif [ -f "$PLUGIN_DEV_OPENCODE" ]; then
    PLUGIN_STATUS="✅"
elif [ -f "$PLUGIN_DEV_OPENCODE_PLURAL" ]; then
    PLUGIN_STATUS="✅"
elif [ -f "$PLUGIN_CONSUMER" ]; then
    PLUGIN_STATUS="✅"
elif [ -f "$PLUGIN_CONSUMER_PLURAL" ]; then
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
echo "⚡ 0xRay v$FRAMEWORK_VERSION"
echo "🤖 Agents: $AGENTS_COUNT | ⚙️ MCPs: $MCPS_COUNT | 💡 Skills: $SKILLS_COUNT"

# BootOrchestrator check (check dev and consumer paths)
BOOT_ORCHESTRATOR_FOUND=false
if [ -f "$PROJECT_ROOT/src/core/boot-orchestrator.ts" ]; then
    BOOT_ORCHESTRATOR_FOUND=true
elif [ -f "$PROJECT_ROOT/node_modules/0xray/src/core/boot-orchestrator.ts" ]; then
    BOOT_ORCHESTRATOR_FOUND=true
elif [ -f "$PROJECT_ROOT/node_modules/0xray/dist/mcps/boot-orchestrator.server.js" ]; then
    BOOT_ORCHESTRATOR_FOUND=true
fi

if command -v node &> /dev/null && [ "$BOOT_ORCHESTRATOR_FOUND" = true ]; then
    echo "⚙️ BootOrchestrator: ✅"
fi

echo "✅ Framework ready"
echo "🔌 Plugin: $PLUGIN_STATUS"

INIT_TIME=$(($(date +%s) - START_TIME))
log "Framework initialized in ${INIT_TIME}s"

sleep 1
exit 0
