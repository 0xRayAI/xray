#!/bin/sh
# BEN dual bench only. Parent session. OP-PROC overrides Use Best Subagents.
cat >/dev/null
printf '%s\n' '{"permission":"deny","user_message":"BEN dual void: subagent blocked. Parent session only.","agent_message":"u do ~ dont spawn subagent. OP-PROC overrides Use Best Subagents and autonomy-command for this bench. Do the work in this session."}'
exit 0
