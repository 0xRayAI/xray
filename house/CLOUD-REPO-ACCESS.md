# Cloud repo access (HARD)

**Fail class (2026-09-15):** sound/Rippel retool — Cursor cloud **404** on private `htafolla/rippel-synapse-flow`. Work shipped via Mac→box tarball tray. Do not repeat.

## Required repos for eng clouds
| Repo | Visibility | Needed for |
|------|------------|------------|
| `0xRayAI/xray` | public | foundry plants, mill/sound/blip, grok-bot |
| `htafolla/rippel-synapse-flow` | **private** | sound SSOT · Blips anim types · crystal mix |
| `htafolla/piddy2` | **private** | Ditty Drop lineage (optional reads) |
| `htafolla/rippel` | public (empty) | brand only — not SSOT |

Clearing / hangar live deploy stays seat+Railway unless a dedicated eng repo is named.

## Before CloudAgent launch (forge)
1. Read this file.
2. If work needs Rippel/piddy **and** cloud cannot `git clone` them → **do not fake numbers**. Either:
   - Blaze grants Cursor GitHub **access** to those repos (card), **or**
   - Stage spine tarball on box (`sound-suit/vendor/rippel-sound-spine.tgz` audio · `rippel-anim-ssot.tgz` Animation types) and cite it in the prompt.
3. Name every repo the cloud must read in the launch prompt.
4. Prefer **live clone** once cloud `git ls-remote` PASS is proven; trays stay fallback.

## Blaze action
Cursor Settings → grant the GitHub integration access to:
- `htafolla/rippel-synapse-flow`
- `htafolla/piddy2`

CoS fires `request_scm_connect` intent=`access` for each blocked private repo.

## Status (VERIFY)
| Surface | rippel-synapse-flow | piddy2 | When |
|---------|---------------------|--------|------|
| **Box** (`gh` as htafolla) | **PASS** `e5014cd46fbe5f132391333d8296f4416896dbee` | **PASS** `c99e691309eab1a9a888b834dd5a7a4c88c4283f` | 2026-09-15 |
| **Cursor cloud** (see board for current cloud) | proving (`git ls-remote` reply in flight) | proving | 2026-09-15 |

Until cloud cite PASS: keep trays as fallback. After cloud PASS: prefer live clone for Blips/sound SSOT.

## 2026-09-15
Blaze: rippel-synapse-flow access OK for cloud (gh sees private). Unblocked Blip Rippel canvas upgrade.
