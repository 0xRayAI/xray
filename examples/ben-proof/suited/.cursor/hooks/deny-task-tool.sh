#!/bin/sh
# BEN dual bench only. Deny the Task tool. Every other tool stays allowed.
input=$(cat)
case "$input" in
  *'"tool_name":"Task"'*|*'"tool_name": "Task"'*)
    printf '%s\n' '{"permission":"deny","user_message":"BEN dual void: Task spawn blocked. Parent session only.","agent_message":"u do ~ dont spawn subagent. OP-PROC overrides Use Best Subagents and autonomy-command for this bench. Do the work in this session."}'
    ;;
  *)
    printf '%s\n' '{"permission":"allow"}'
    ;;
esac
exit 0
