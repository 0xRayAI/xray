# Friend test — HARD GATE (all fleet comms)

**Law (Blaze 2026-09-14):** if a friend outside the fleet cannot get the point in ~3 seconds, **do not send**. Rewrite first.

A stamped “Friend-test: PASS” with no proof is **not** a gate.

## Two lanes (Blaze 2026-09-14 — token save)

| Lane | Audience | Style |
|------|----------|-------|
| **H — Human / public** | Blaze, Dist/X, public PRs/docs, board when human must act | Friend-test HARD. Proof line **A friend would hear:** … |
| **B — Bot internal** | seat↔seat eng/dist/ops (no human action needed) | **Compressed synaptical** — short, stamped, Done/Verify/Next in few tokens. Skip essay English. |

Lane B is an experiment to save tokens. It does **not** waive Lane H. If a human must act, use Lane H.


## Applies to (all of these)
- Public Dist (X, site, email)
- PRs + `grok-bot/` / OS docs (public on GitHub)
- Board / WAVEBOARD / status when a human must act
- CoS → Blaze chat
- Seat → seat packets humans can see (eng/dist/ops rooms)
- Shop receipts / critic cards that close a beat

**Exempt (still prefer plain):** pure machine tokens (bc- ids, SHAs, JSON schemas) and one-line quiet FYIs that only repeat known state (those stay quiet anyway).

## Checklist (required before send)
- [ ] Plain meaning first (what it is)
- [ ] What you get / what changed
- [ ] How to try or what to do next (one clear step) — or “no action”
- [ ] Jargon glossed or cut
- [ ] Not fleet-ops theater / filler

## Proof line (required on material sends)
Include one of:
- **A friend would hear:** …
- **Plain:** … (same idea)

If you cannot write that line without fleet slang, rewrite the whole message.

## Refuse (hard)
| Who | Must refuse |
|-----|-------------|
| **Herald** | Dist EXECUTE missing proof line or using Dist filler slang |
| **Critic** | PR/docs that fail friend test (Strict or when asked) |
| **Forge** | Opening a PR whose description/body is gibberish — rewrite first |
| **CoS** | Sending Blaze or Dist packets that fail the checklist |
| **Any seat** | Room posts / cards that a sharp friend wouldn’t get |

Refuse = rewrite ask, not “post anyway.”

## Banned filler (cut or gloss)
`op proc` · `dialect` · `friend-test` as a product · `synaptical` (unglossed) · bare mill/suit/hangar/wave/card/seat without plain words · “copy that” · “noted” · “multiverse noted” · essay status with no Done/Verify/Next

## Fail examples (never ship)
- “grow the op proc without inventing a fifth dialect”
- “Friend-test stays the bar”
- “Multiverse noted”

## Owners
Author self-checks every material send. Peer refuse is a feature. CoS glimpse-reviews Dist + human board.

## Cloud prompts = Lane H (HARD)
Cursor cloud / Claude cloud instances are **not** Lane B. Bot↔bot compression stays in eng/dist rooms. Every CloudAgent launch/follow-up prompt must pass friend-test (plain mission first). Gibberish assignment = defect.
