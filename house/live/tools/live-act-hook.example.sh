#!/usr/bin/env bash
# Example agent hook (#281): emit turn start/end and prompts automatically, so the seat never goes dark.
# Source paste-block.sh (or builder-cloud-setup.sh) first, then wire this into the agent's hook config, e.g.
#   on prompt submit -> live-act-hook.example.sh prompt   on stop -> live-act-hook.example.sh stop
# It sends ids and seat names only: never the prompt text. Failures are ignored so a hook never blocks a turn.
case "${1:-}" in
  prompt) live_act received prompt "${LIVE_PROMPT_FROM:-Lead}" >/dev/null 2>&1
          live_act start turn "${LIVE_TURN_TAG:-turn}" >/dev/null 2>&1 ;;
  stop)   live_act end turn "${LIVE_TURN_TAG:-turn}" >/dev/null 2>&1 ;;
  *)      echo "usage: $0 prompt|stop" >&2; exit 2 ;;
esac
exit 0
