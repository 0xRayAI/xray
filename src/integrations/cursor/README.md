# Cursor cloud hooks (0xRay)

Thin adapter. Repo `.cursor/hooks.json` (schema **version 1**) calls 0xRay gates and the Station PreCompact writer. **sessionStart is not used** — managed Cursor cloud does not fire it.

Repertoire MCP is optional. Station + gates work without a full memory-routing rewire.

## How cloud picks up project hooks

1. Commit `.cursor/hooks.json` at the **project root** (this file, not `~/.cursor/hooks.json`).
2. Cursor Cloud Agent clones the repo and loads **project** hooks. Desktop Agent Chat does the same when the folder is the workspace.
3. Hook names are camelCase: `preToolUse`, `preCompact`, `afterFileEdit`. Commands are shell strings. Stdin is JSON; stdout is JSON.
4. First `preToolUse` or `afterFileEdit` writes `.xray/state/session-boot.json` + `.xray/state/STATION.md`. After a compact, **Read STATION.md**. The host does not inject it.
5. `preCompact` is observational (cannot block). It merges Station (stock heat updates; ticket / seed / Durable / unfinished keys stay).

Copy the consumer template from `src/integrations/cursor/hooks/hooks.json` (dist paths under `node_modules/0xray`) when wearing the published package. This exo repo wears `src/integrations/cursor/hooks/*.js` so a cloud can run before `npm run build`.

## Contracts

| Hook | Stdin | Stdout |
|------|--------|--------|
| `preToolUse` | Cursor tool event (`tool_name`, `tool_input`, `cwd`, `workspace_roots`, `conversation_id`) | `{ "permission": "allow" \| "deny" }` plus `user_message` / `agent_message` on deny |
| `preCompact` | `{ trigger, context_tokens, … }` | `{ "user_message": "…" }` after Station write |
| `afterFileEdit` | file event | `{}` — boots Station only |

`preCompact` labels `event_class`:

- `cursor-host-precompact` — Cursor actually fired the hook
- `cursor-precompact-synthetic` — script invoked with `--event-class=cursor-precompact-synthetic` (Path C fallback)
- `cursor-host-precompact-FAIL` — HOST-FIRE fill ran; host did not spawn `preCompact` (see `RECEIPT-HOST-PRECOMPACT.md`, `-2.md`, `-3.md`)

## Real usage (replace FILL)

Do **not** prove window pressure with UTF-8 chars÷4. `src/integrations/cursor/hooks/cursor-usage-receipt.js` (`writeCursorUsageReceipt`) writes `.xray/state/cursor-usage-receipt.json` + Station `Compact:` / `Usage:` rows. No `dist` required (unlike the constitution gate).

| Cite | Valid? |
|------|--------|
| `preCompact` stdin `context_tokens` / `context_usage_percent` / `context_window_size` | yes |
| `cursor-cloud` `run-info` / `get-events` / dashboard (model, bc-id, window) | yes — token MISS is honest |
| chars÷4, fill-only, `fillBytes` | **forbidden** (`ok: false`) |

Host `preCompact` fire is counted from `.xray/state/cursor-hook-invoke.log` (`event=preCompact`). Do not hand-invoke `pre-compact.js` to mint that Y.

Arm S landscape + receipt: `examples/killer-dual/`.

## Friend test

From the repo root, after `npm run build` (or from `src/` on this exo):

```bash
echo '{"tool_name":"Read","tool_input":{"path":"README.md"},"cwd":"'"$PWD"'"}' \
  | node src/integrations/cursor/hooks/pre-tool-use.js
# → {"permission":"allow"}

echo '{"hook_event_name":"preCompact","trigger":"auto","context_tokens":1}' \
  | node src/integrations/cursor/hooks/pre-compact.js --event-class=cursor-precompact-synthetic
# → user_message includes event_class=cursor-precompact-synthetic
# → Read .xray/state/STATION.md
```

Path C seed + receipt: `examples/cursor-cloud-compact/`. Suited Arm S (real usage, no FILL): `examples/killer-dual/`.
