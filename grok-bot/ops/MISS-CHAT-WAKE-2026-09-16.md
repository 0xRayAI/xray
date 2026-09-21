# MISS — CoS chat wake looked dead (2026-09-16)

**A friend would hear:** Blinky went quiet when Blaze poked him. Two causes stacked: the chat itself was too fat to wake reliably, and eng-intake kept replaying finished work so “ignore stale” looked like ignoring Blaze.

## Dual cause
| Layer | What |
|-------|------|
| **Grok Bot (platform)** | Long 1:1 server transcript → tail `ECONNRESET` / `ETIMEDOUT`. Bot/routine pings still woke; Blaze messages often did not. |
| **House op proc** | Eng signal intake handed every PR push as “parent must tell Blaze.” After #71 merged, backlog wakes kept firing. Wake-hygiene quiet-on-stale was correct for spam, fatal next to a Blaze poke in the same turn. |

## Defect class
Not capital. Not secrets. **Process + product wake limits.** Same miss family as PLAYBOOK “seats without live routines = dead chat” — inverted: **live routines without self-quiet = zombie chat.**

## Immediate mitigation (done)
1. Eng signal intake **PAUSED**
2. Intake prompt patched: self-quiet if PR already MERGED/CLOSED or ATTENTION marks beat closed
3. ATTENTION/WAVEBOARD scrubbed to live truth
4. STATION parachute + recovery note (`ops/recovery/BLINKY-CHAT-WAKE-2026-09-16.md`)
5. Cover CoS spun down when blinky answering

## Standing law (encode)
See `OPS-SPEC.md` § Wake hygiene · `enterprise-cos-wave-loop` · `ROUTINES-INVENTORY.md`.

## Avoid
- Never quiet on Blaze `stat` / `you there` / `fix yourself` / any 1:1 poke — even if a stale routine shares the wake
- Eng intake must read ATTENTION first; closed beats → persist quiet, **no parent handoff**
- New 1:1 if wakes stay sticky (nuclear for bloated transcript)
- Cover CoS only when 1:1 proven dead; park when primary answers
- Do not rearm eng intake until one clean fire on a **new** open PR

## Related
- Recovery: `ops/recovery/BLINKY-CHAT-WAKE-2026-09-16.md`
- Auto Review capital: `AUTO-REVIEW-POLICY.md` (separate track)

## Addendum — slow 1:1 reply (same day, later)

**A friend would hear:** Even when blinky eventually answered, Blaze waited too long because bots and tools ran first.

### Extra causes
| Layer | What |
|-------|------|
| **Turn order** | CoS batched seat cards / disk reads / GitHub before the first chat reply. |
| **Agent wake storm** | forge + critic + New Bot + herald pings piled into one turn and delayed Blaze. |
| **Failed Dist routines** | Dist grok watch / reply monitor / mail digest / ops mirror failing → noise + spin-down feel. |

### Fix (standing)
1. **First tool on a Blaze 1:1 turn = chat reply.** No seat cards, no long reads, no GitHub before that first line.
2. **Park agent work** until after Blaze is answered when his message is in the turn.
3. Dist reply monitor: self-delete or stay quiet on fail — never block CoS wake.
4. Keep Dist grok watch lean; pause health/monitor if failing and not needed.
5. Fresh chat still the nuclear if transcript stays sticky.

