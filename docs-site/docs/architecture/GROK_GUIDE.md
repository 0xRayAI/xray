---
sidebar_label: Grok floor
---

# Grok floor

**4.0** — a suit that survives the context window

Grok Build wears the same exo as OpenCode, Hermes, and OpenClaw. Constitution always on. Temperament on this floor is **frontier** when `suit_temperament.profile` is `auto`. Codex 11 / 29 / 69 still **deny**. Spawn-without-plan **warns**.

Grok does **not** inject `.xray/state/STATION.md`. Read the card after compact or host-swap. Do not thicken the Grok exo.

## Wear

```bash
npm install 0xray
npx 0xray grok install --force   # plugin + 7 MCP + skills
npx 0xray status
```

Installs:

- Plugin `~/.grok/plugins/0xray` and project `.grok/plugins/0xray`
- Seven MCP servers via `npx -y 0xray mcp <cmd>`
- Skills to `~/.grok/plugins/0xray/skills/` and `~/.grok/skills/`
- `autonomy-command` as the default operating model

## Station card

Before other work:

```bash
# Read, don't reinvent
cat .xray/state/STATION.md
```

Compaction and host change are the same cut. Continue the card.

## Temperament

| Profile | Grok (`auto` → frontier) |
|---------|--------------------------|
| Spawn without plan | **warn** |
| Codex 11 / 29 / 69 | **deny** |
| Confer | off unless `confer.enabled: true` |

See [Suit temperament](../guides/v3-temperament.md).

## Repertoire

Shipped `memory_routing.enabled: true` with vendored `@0xray/repertoire@0.2.0`. Extra host MCP `repertoire`, not an eighth `xray-*`. Opt out: `"enabled": false, "provider": "repertoire"`.

## Related

- [Getting started](../guides/getting-started.md)
- [Integrations](../guides/integrations.md)
- [4.0 vision](./v4-vision.md)
- [Autonomy command](../guides/autonomy-command.md)
