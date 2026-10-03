# BEN dual OP-PROC — parent session

Scope: **compaction survival / BEN dual** runs under `examples/ben-proof/`. Every other seat still follows the constitution and autonomy-command.

## Override

For this bench, **this file wins** over:

- the constitution principle **Use Best Subagents, Reuse Session Context** (`xray/codex.json`)
- `AGENTS.md` **autonomy-command** Task / subagent dispatch (factory `AGENTS.md` and the consumer card wear would write)

Those laws stay on everywhere else. This page does not edit them.

**u do ~ dont spawn subagent.**

Do all the work in the parent session. One continuous session. Never call Task. Never spawn a subagent, explore helper, researcher, or general-purpose agent. A Task call or a subagent spawn **voids that arm**. Log it and stop scoring that arm.

Prompt text that only says "don't spawn" is not this law. The on-disk page is the law, because a plain arm that reads the repo still meets autonomy-command.

## What each arm reads

- Both arms follow this file. The suited seat also reads `suited/AGENTS.md`, which repeats this override.
- Wear (`deployManagedAgents`, then `overlayAgentsCard`) leaves `suited/AGENTS.md` in place when that file has no managed-region comment. The consumer card, including autonomy-command, is written beside it as `AGENTS.md.0xray-new`. That sidecar is not the page.
- A suited tree with no `AGENTS.md` before wear receives the consumer card, and autonomy-command becomes the page. Keep the overlay in the tree before wear.

## Host gate

A Task call or a spawned helper **voids that arm** even if the helper keeps running. A `subagentStart` report of deny is not the block.

`suited/.cursor/hooks.json` denies the Task tool for this bench:

- `preToolUse` matcher `Task` → `.cursor/hooks/deny-task-tool.sh` with `failClosed: true`

`subagentStart` → `.cursor/hooks/deny-subagent.sh` may report deny. That report does not stop the helper. If the helper still runs, the arm is void.

Cursor loads `.cursor/hooks.json` from the **workspace root**. The Task deny binds when `examples/ben-proof/suited` is that root. A cloud whose workspace is the factory checkout loads the factory hooks, which do not deny Task. A spawn is still a void arm under this page.

Factory `.cursor/hooks.json` stays without `subagentStart`. Do not copy this deny onto it.

## Acceptance

This override wins over `AGENTS.md` autonomy-command for the compaction-survival / BEN dual path. The constitution principle Use Best Subagents stays in force for every other path.
