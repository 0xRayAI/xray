# SKILLS.md — @0xray/grok-bot

Primary scripts for agents. Run in order for **each** key agent.

| Skill | When to use |
|-------|-------------|
| [fasten-suit-per-agent](skills/fasten-suit-per-agent/SKILL.md) | Create/fasten a mill+inspect suit for one agent project |
| [groover-factory-parity](skills/groover-factory-parity/SKILL.md) | Register → mint → pin identity for that agent |
| [setup-ows-pay](skills/setup-ows-pay/SKILL.md) | Local OWS wallet + pay hangar/Clearing 402s |
| [plant-hangar-shops](skills/plant-hangar-shops/SKILL.md) | Plant hangar shops and verify a paid call |

## Fleet / OS skills (reference)
| Skill | When |
|-------|------|
| [ship-ready-mill-gate](skills/ship-ready-mill-gate/SKILL.md) | Strict ship checklist. Reviewer proof card is a short note |
| [codex-fleet-constitution](skills/codex-fleet-constitution/SKILL.md) | Token discipline / fit-for-purpose |
| [survive-compact](skills/survive-compact/SKILL.md) | After long wakes / before coding — re-read disk; chat may lose early turns |
| [setup-house](skills/setup-house/SKILL.md) | No `house/` folder yet — copy `templates/house/` and fill HOUSE.md |
| [fasten-suit-and-hangar](skills/fasten-suit-and-hangar/SKILL.md) | Legacy combined fasten (prefer per-agent skill above) |

## Board
Read `house/WAVEBOARD.md` and `house/ATTENTION_STATE.md` first. If a file is missing, use the same name under `templates/house/`.

## Ops reference
Longer notes under `ops/` stay in the git repo and are not in the npm package.

Same problem or open PR? Resume that cloud. After a long chat or before coding: `survive-compact` — read disk, then continue. Do not launch a duplicate.

## Not in the npm package
These skills name one team's people and accounts. They stay in the git repo:
- `skills/enterprise-cos-wave-loop/`
- `skills/synaptical-comms/`
- the public-post skill (account-specific)

Use them from the repo, not from the installed package.
