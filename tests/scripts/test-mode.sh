# Test mode switching
echo 'Current mode:'
jq '.mode.current' OpenCode.json
echo ''
echo 'Active agents in current mode:'
CURRENT_MODE=$(jq -r '.mode.current' OpenCode.json)
jq ".mode.available_modes[\"$CURRENT_MODE\"].active_agents[]" OpenCode.json
echo ''
echo 'Mode description:'
jq ".mode.available_modes[\"$CURRENT_MODE\"].description" OpenCode.json
