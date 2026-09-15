# SKILLS.md — @0xray/grok-bot

Primary scripts for agents. Run in order for **each** key agent.

Prove a seat first: `npx grok-bot ready` (alias `doctor`) — mill plant on disk, then hangar/Clearing next steps. **A friend would hear:** it tells you if the suit is planted and what shop/pay step is next.

| Skill | When to use |
|-------|-------------|
| [fasten-suit-per-agent](skills/fasten-suit-per-agent/SKILL.md) | Create/fasten a mill+inspect suit for one agent project |
| [groover-factory-parity](skills/groover-factory-parity/SKILL.md) | Register → mint → pin identity for that agent |
| [setup-ows-pay](skills/setup-ows-pay/SKILL.md) | Local OWS wallet + pay hangar/Clearing 402s |
| [plant-hangar-shops](skills/plant-hangar-shops/SKILL.md) | Plant hangar shops and verify a paid call |

## Fleet / OS skills (reference)
| Skill | When |
|-------|------|
| [ship-ready-mill-gate](skills/ship-ready-mill-gate/SKILL.md) | Strict ship checklist |
| [codex-fleet-constitution](skills/codex-fleet-constitution/SKILL.md) | Token discipline / fit-for-purpose |
| [enterprise-cos-wave-loop](skills/enterprise-cos-wave-loop/SKILL.md) | Coordinator wave loop |
| [synaptical-comms](skills/synaptical-comms/SKILL.md) | Friend-test house comms |
| [survive-compact](skills/survive-compact/SKILL.md) | After long wakes / before coding — keep mind across compaction |
| [fasten-suit-and-hangar](skills/fasten-suit-and-hangar/SKILL.md) | Legacy combined fasten (prefer per-agent skill above) |

Compact **before/after** quiz (not FILL): `ops/COMPACT-QUIZ.md` — `npx grok-bot compact-snapshot` then `compact-quiz`.

## Ops reference
`ops/THREE-LAYERS.md` · `ops/SUIT-ATTESTATION.md` · `ops/LEAN-COMPUTE.md` · `ops/CLOUD-CONTINUITY.md` · `ops/COMPACT-QUIZ.md`

Same problem or open PR? Resume that cloud (`ops/CLOUD-CONTINUITY.md`). After a long chat or before coding: `survive-compact` — read disk, then continue. Do not launch a duplicate.

## Catalog (2026-09-14)

- `skills/dist-0xrayai-publish/` — Dist posts as @0xRayAI (friend-test + cadence)
- `ops/OPS-CATALOG.md` — start-here index for op proc + Dist docs + LEXICON
- `ops/SYNAPTICAL-LANES.md` — H (human/public) vs B (bot-internal) speaking lanes
