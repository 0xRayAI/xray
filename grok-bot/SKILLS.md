# SKILLS.md — @0xray/grok-bot

A new fleet runs [stand-up-fleet](skills/stand-up-fleet/SKILL.md) once. That pass is the house, the board routes, then one suit per seat. The kit names are `stand-up-fleet` and `setup-house`. Marketplace names `fleet-stand-up` and `fleet-getting-started` are not in this package. The NEAR path there is foundry, pay, cap, escrow, the Grok Bot one-click, and the CLI.

Primary scripts for agents. Run in order for **each** key agent.

| Skill | When to use |
|-------|-------------|
| [fasten-suit-per-agent](skills/fasten-suit-per-agent/SKILL.md) | Create/fasten a mill+inspect suit for one agent project |
| [groover-factory-parity](skills/groover-factory-parity/SKILL.md) | Register → mint → pin identity for that agent |
| [setup-ows-pay](skills/setup-ows-pay/SKILL.md) | Local OWS wallet + pay hangar/Clearing 402s |
| [plant-hangar-shops](skills/plant-hangar-shops/SKILL.md) | Plant hangar shops and verify a paid call |
| [seat-label](skills/seat-label/SKILL.md) | This seat sets its own profile title. Run it in that seat’s chat |

## NEAR path

| Skill | When |
|-------|------|
| [near-seat](skills/near-seat/SKILL.md) | NEAR testnet account. The full-access key stays sealed |
| [foundry-create](skills/foundry-create/SKILL.md) | Create the foundry. This runs near-seat |
| [near-mill](skills/near-mill/SKILL.md) | Pay, cap, escrow, the listing check, `near-1click`, `near-mailbox`, and `near-status`. The one-click runs `foundry-create` and `near-status` only |
| [ai-agent-on-near](skills/ai-agent-on-near/SKILL.md) | Create an AI agent on NEAR testnet from a signed note. Copy `templates/near-agent/` beside the house template |
| [near-audit](skills/near-audit/SKILL.md) | Review a NEAR Rust contract before a deploy. Links the official checklist and the extra checks |

## Fleet / OS skills (reference)
| Skill | When |
|-------|------|
| [ship-ready-mill-gate](skills/ship-ready-mill-gate/SKILL.md) | Strict ship checklist. Reviewer proof card is a short note |
| [codex-fleet-constitution](skills/codex-fleet-constitution/SKILL.md) | Token discipline / fit-for-purpose |
| [survive-compact](skills/survive-compact/SKILL.md) | After long wakes / before coding — re-read disk; chat may lose early turns |
| [board-prompt](skills/board-prompt/SKILL.md) | Pointer to station. Not a second boot |
| [setup-house](skills/setup-house/SKILL.md) | No `house/` folder yet — `grok-bot house init` copies `templates/house/` and refuses to overwrite |
| [station](skills/station/SKILL.md) | Boot hook. Light on every turn. Full after a summary, a wake, or a gate |
| [seat-github-key](skills/seat-github-key/SKILL.md) | `~/bin/gh-<seat>` mints a fresh App token every call. Never plain `gh` |
| [fasten-suit-and-hangar](skills/fasten-suit-and-hangar/SKILL.md) | Legacy combined fasten (prefer per-agent skill above) |

## Board
When `LIVE_URL` is unset, read the hand-kept board `house/WAVEBOARD.md` and `house/ATTENTION_STATE.md` first. When `LIVE_URL` is set, read Bifrost cards (`GET /cards`) and `house/ATTENTION_STATE.md`. If a file is missing, use the same name under `templates/house/`.

## Ops reference
Longer notes under `ops/` stay in the git repo and are not in the npm package.

Same problem or open PR? Resume that cloud. After a long chat or before coding: `survive-compact` — read disk, then continue. Do not launch a duplicate.

## Not in the npm package
These skills name one team's people and accounts. They stay in the git repo:
- `skills/enterprise-cos-wave-loop/`
- `skills/synaptical-comms/`
- the public-post skill (account-specific)

Use them from the repo, not from the installed package.
