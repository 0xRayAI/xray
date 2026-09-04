---
name: inspect
description: Inspect AI work — diffs, tool traces, mill receipts, CI. Factory mill plant. Not 45/42 costume.
---

# Inspect

This mill **fastens** a suit for **inspecting AI work**. Not an empty suit. Not a copy of 0xRay's 45/42 costume.

Use this when an agent (or a mill) just wrote, minted, or shipped something. Read the work. Do not trust the receipt until you have opened the files.

## What to inspect

1. **Diff.** What actually changed. Ignore the agent's summary if the diff disagrees.
2. **Plant vs worn.** `src/skills`, `src/opencode/agents`, `xray/*.json` vs `.opencode/skills`, `.opencode/agents`, `.xray/`. Same name: plant should win. Costume dump (45 skills / 42 agents they did not plant) is a fail unless `foundry.json` has `"costume": true`.
3. **Mill receipt.** `.xray/foundry-inventory.json` — mill name/version, `garment` (`mill-fill` / `overlay`), `millPlant.skills` should include `mill` and `inspect`.
4. **CI.** GitHub mill CI and mill-monitor report, not just a green check in chat.
5. **Live PUT.** `npm view <pkg> version` and HTTP 200 on the `.tgz`. Metadata without a tarball is not shipped.
6. **Machine hangar.** Isolated HOME last-mile must not clobber `~/.grok/plugins/0xray`.

## How to work

- Open the files. Quote paths. Do not invent a pass.
- Constitution stays on (Codex 11 / 69 / destructive). Inspecting is not a license to add an 8th MCP.
- Factory Repertoire is the organ, not the inspection.
- Fasten their plant on top; do not dump our costume.

```bash
npx @0xray/foundry mint
npx @0xray/foundry ci --report
```
