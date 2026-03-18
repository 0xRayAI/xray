#!/bin/bash
# Git hook for auto-updating AGENTS.md when agent files change
# Install: ln -s ../../scripts/git-hooks/post-commit-agent-sync.sh .git/hooks/post-commit

set -e

echo "🔄 Checking for agent-related changes..."

# Get the root of the git repository
GIT_ROOT=$(git rev-parse --show-toplevel)
cd "$GIT_ROOT"

# Files that trigger AGENTS.md update
AGENT_PATTERNS=(
  ".opencode/agents/*.yml"
  ".opencode/agents/*.yaml"
  "src/agents/**/*.ts"
  "AGENTS.md"
  ".opencode/strray/routing-mappings.json"
)

# Check if any agent-related files changed
CHANGED_AGENT_FILES=""
for pattern in "${AGENT_PATTERNS[@]}"; do
  # Get files that match this pattern and are tracked by git
  CHANGED=$(git diff --name-only HEAD~1 --cached "$pattern" 2>/dev/null || true)
  CHANGED_UNSTAGED=$(git diff --name-only HEAD~1 -- "$pattern" 2>/dev/null || true)
  
  if [ -n "$CHANGED" ]; then
    CHANGED_AGENT_FILES="$CHANGED_AGENT_FILES $CHANGED"
  fi
  if [ -n "$CHANGED_UNSTAGED" ]; then
    CHANGED_AGENT_FILES="$CHANGED_AGENT_FILES $CHANGED_UNSTAGED"
  fi
done

# Remove duplicates
CHANGED_AGENT_FILES=$(echo "$CHANGED_AGENT_FILES" | tr ' ' '\n' | sort -u | grep -v '^$')

if [ -n "$CHANGED_AGENT_FILES" ]; then
  echo "📝 Agent-related files changed:"
  echo "$CHANGED_AGENT_FILES" | sed 's/^/   /'
  echo ""
  
  # Check if auto-update is enabled
  if [ "$ENABLE_AGENTS_AUTO_UPDATE" = "true" ] || [ "$ENABLE_AGENTS_AUTO_UPDATE" = "always" ]; then
    echo "🔄 Running AGENTS.md sync..."
    node "$GIT_ROOT/scripts/node/enforce-agents-md.js" --generate || {
      echo "⚠️ AGENTS.md sync failed, but continuing..."
    }
    
    # Stage the changes if auto-generated
    if git diff --quiet "$GIT_ROOT/AGENTS.md" 2>/dev/null; then
      # No changes, skip
    else
      echo "📦 Staging auto-generated AGENTS.md changes..."
      git add "$GIT_ROOT/AGENTS.md"
    fi
  else
    echo "💡 To auto-update AGENTS.md, run: ENABLE_AGENTS_AUTO_UPDATE=true npm run post-commit"
    echo "   Or set ENABLE_AGENTS_AUTO_UPDATE=always in your environment"
  fi
else
  echo "✅ No agent-related changes detected"
fi
