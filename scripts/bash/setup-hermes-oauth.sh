#!/usr/bin/env bash
set -euo pipefail

# setup-hermes-oauth.sh — Install Hermes Agent and configure xAI OAuth
# for use with 0xray MCP governance servers.
#
# Usage: bash scripts/bash/setup-hermes-oauth.sh
#
# Prerequisites: curl, bash 4+
#
# After this script completes, start a second SSH session with port forwarding:
#   ssh -N -L 56121:127.0.0.1:56121 user@your-server
# Then open the printed URL in your local browser to authorize.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== 0xray MCP — Hermes xAI OAuth Setup ==="
echo ""

# --- Check if Hermes is already installed ---
if command -v hermes &>/dev/null; then
  echo "[ok] Hermes already installed: $(hermes --version 2>/dev/null || echo 'version unknown')"
else
  echo "[...] Installing Hermes Agent..."
  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
  echo ""
  if ! command -v hermes &>/dev/null; then
    echo "[error] Hermes install failed. Please install manually:"
    echo "  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash"
    exit 1
  fi
  echo "[ok] Hermes installed: $(hermes --version 2>/dev/null || echo 'version unknown')"
fi

echo ""

# --- Check for existing xAI OAuth ---
if hermes doctor 2>/dev/null | grep -q "xai-oauth.*authenticated"; then
  echo "[ok] xAI OAuth is already authenticated."
  echo ""
  echo "Your MCP governance servers will use Hermes' xAI OAuth token automatically."
  exit 0
fi

# --- Initiate OAuth login ---
echo "[...] Starting xAI OAuth login..."
echo ""
echo "After the URL appears below, open a SECOND terminal on YOUR LOCAL MACHINE and run:"
echo ""
echo "  ssh -N -L 56121:127.0.0.1:56121 user@your-server"
echo ""
echo "Then open the URL in your local browser and authorize."
echo ""

hermes auth add xai-oauth --no-browser

echo ""
echo "=== Setup complete ==="
echo ""
echo "To verify:"
echo "  hermes doctor"
echo ""
echo "The 0xray MCP servers will now automatically discover and use the"
echo "xAI OAuth token for governance LLM calls."
