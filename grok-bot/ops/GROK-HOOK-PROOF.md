# Grok PreToolUse proof — cold seat (2026-09-13)

Seat: cold `alpha` project fastened via `@0xray/grok-bot` path.

## Questions
1. Does fasten plant Grok plugin hooks?
2. Does `pre-tool-use.js` run and return a decision?
3. Does Grok Bot chat auto-invoke those hooks on every tool?

## Results

| Check | Result |
|-------|--------|
| Planted `.grok/plugins/0xray/hooks/hooks.json` | **YES** — PreToolUse, PostToolUse, SessionStart, and related |
| `grok_postprocessor_light` in features | **YES** (true) |
| Synthetic stdin → `pre-tool-use.js` | **YES** — `{"decision":"allow"}` exit 0 |
| Session boot written | **YES** — `.xray/state/session-boot.json` source `0xray/grok-pre-tool-use-boot` |
| Grok Bot *assistant* auto-fires hooks on tool use | **NOT PROVEN / host-dependent** — hooks belong to the **Grok CLI plugin** loader of `hooks.json`. Chat agents are not that host. Do not invent a fifth wear floor here. |

## Conclusion
- **Facility exists when a suit is fastened** (files + runnable gate).
- **Necessary fix is not** “build PreToolUse inside Grok Bot chat.”
- **Necessary** is: wear the suit so the **plugin host** can load hooks; use skills + Strict review + mill gates where the host does not call hooks.

## Command used
```bash
export XRAY_ROOT=/path/to/cold-project
export XRAY_AI_PATH=$XRAY_ROOT/node_modules/0xray
echo '{"toolName":"Shell","toolInput":{"command":"echo hook-probe"},"workspaceRoot":"'"$XRAY_ROOT"'","cwd":"'"$XRAY_ROOT"'","sessionId":"hook-probe"}' \
  | node $XRAY_AI_PATH/dist/integrations/grok/hooks/pre-tool-use.js
```
