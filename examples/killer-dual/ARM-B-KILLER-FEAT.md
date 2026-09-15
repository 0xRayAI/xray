# ARM-B killer feat — mill inspect forge GO (harness receipt)

## One-liner

**Forge GO mill:** `npx @0xray/foundry inspect --go --require-harness=bare|suited` — shop-style harness receipt so dual-cloud A/B is mill, not chat.

## Why this, not another HOST-FIRE

Arm S (suited) is likely to stay on exo: Station heat, preCompact, Repertoire fasten. Recent `main` is already that (PRs #45–#53). Arm B is **bare** and must not reinstall hooks.

The stack already says:

- Groover `0xray-suit` mint requires `inspect.ok` + inventory DNA (`factory-parity.md`).
- Grok-bot cloud continuity: forge returns a **shop-style** packet; chat is not proof.
- Inspect already mills six plant checks and **cannot see** whether Cursor/Grok hooks are bound, whether Repertoire is fastened, or whether Station exists.

Without a mill organ, KILLER-DUAL A/B is two agents arguing “I was bare / I was suited” in prose.

## What mill does (not PPE, not an 8th MCP)

Same `inspect` CLI. Seventh check is **observational** by default:

| Signal | Fastened / bound | Not counted |
|--------|------------------|-------------|
| Hooks | project `.cursor/hooks.json` or `.grok/plugins/0xray/hooks/hooks.json` with a real `command` | hook scripts on disk without binding JSON |
| Repertoire | `node_modules/@0xray/repertoire` or `.xray/state/repertoire/` | `vendor/@0xray/repertoire` source; `features.json` `memory_routing` declaration |
| Station | `.xray/state/STATION.md` | session-boot.json alone |

Profiles: `bare` (none) · `suited` (hooks **and** Repertoire) · `partial` (anything else, including Station-only).

`--go` adds `{ kind: "forge-go", profile, hooksBound, repertoireFastened, stationPresent, goal, repo }`. `--require-harness=` fails the mill when the live plant disagrees. Does **not** fasten.

## Why it is the next Blaze GO

Factory `/suit` cannot claim `0xray-suit` until inspect is a receipt Groover can hash. Dual-cloud is the first consumer of that receipt. Hangar already has shop receipts; mill did not. This is the mill analogue of Clearing’s `paymentId` — one object, replayable, not a paragraph.

## Verify

```bash
npx @0xray/foundry inspect --skip-live --go --require-harness=bare --goal='KILLER-DUAL Arm B'
# mill-ci: npx vitest run src/__tests__/unit/foundry-mill.test.ts
```
