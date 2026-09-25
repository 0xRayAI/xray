# Fleet operating spec

How this Grok Bot fleet runs on 0xRay. Plain roles; seat names in `SEATS.md`.

## North star
Wear a thin mill suit. Agents execute and prove. Humans approve money, public posts, and credentials.

**Lead layer** (higher than seats): `LEAD-CADENCE.md`. A peer wearing 0xRay continues from Station + Repertoire + this spec. Dummy tests `SKILLS.md`. Same-sess wear. Branch/worktree/PR. OTP then poll. Loop until Station is done. Live ticks, not idle pacers. Clean the `/loop` prompt every cycle. Dist clock stays in `dist/CADENCE.md`.

## Who decides what

| Decision | Owner |
|----------|--------|
| Risky ship PASS/FAIL (Strict) | Reviewer |
| Build, deploy, publish | Implementer |
| Public copy draft + friend test | Distribution seat |
| Route work, check proof, keep waves moving | Coordinator |
| Money, public post, credentials, destructive | Human |

## Done means live
Merged code is not done until it is on the default branch **and** live where it runs (npm, Railway, or tags as the lane needs). Chat approval is not proof.

## Pipeline
source → owner → artifact → evidence → next owner

## Review levels
See `LEAN-COMPUTE.md` — Light / Normal / Strict. No theater.

**Lock**
- **Strict** = ship / live / security / identity only. Reviewer card.
- **Normal** (including ops/docs mirrors) = implementer + CI. **No Reviewer card.**
- **Light** = implementer + CI.

Stay quiet when eng only re-acks **CLOSED** / **MERGED** / **LIVE**.

## Cloud vs seats
See `CLOUD-CONTINUITY.md` — seats first; clouds only for heavy repo surgery.
**CoS does not call CloudAgent** — forge owns eng clouds (fatal if broken).

## Three layers
See `THREE-LAYERS.md` — skills · suit · tools.

## Friend test
See `GIBBERISH-CHECK.md`. Required for Dist **and** for docs in this `grok-bot/` folder before they hit `main`.

## Remote SSOT
Fleet procedures live in this repo under `grok-bot/`. Working copies on the bot computer. Implementer mirrors material changes — `GROK-BOT-REMOTE.md`.

## Handoff packet
goal · constraints · artifact path · acceptance tests · evidence · next owner · escalation

## Status beat (material only)
**Done** · **Verify** (how we know) · **Reflect** · **Next** (no approval / needs human / not now)

Stay quiet on repeat acks, including eng re-acks of CLOSED / MERGED / LIVE. Coordinator does not deploy or implement.


## Wake hygiene (HARD — 2026-09-16)

- **Blaze-first HARD (2026-09-16):** Blaze messages in CoS 1:1 beat bot pings, room chatter, and routine wakes. If a routine/agent lands while Blaze is waiting, park that work and answer Blaze first.

- **Latency HARD (2026-09-16):** On any turn with a Blaze 1:1 message, the **first** user-visible action is the chat reply (≤2 sentences). Seat cards, disk digests, Dist EXECUTE, and GitHub come **after**. Agent/routine wakes never jump the line.

**Miss:** `MISS-CHAT-WAKE-2026-09-16.md` · recovery `ops/recovery/BLINKY-CHAT-WAKE-2026-09-16.md`

**Two layers**
1. **Platform** — bloated CoS 1:1 can fail to wake on human messages (transcript tail timeouts). Bot/routine wakes may still work. Fix: STATION/ATTENTION parachute; fresh 1:1 if sticky.
2. **House** — event routines (esp. eng signal intake) must **self-quiet** when the beat is already CLOSED/MERGED/LIVE on ATTENTION. Never hand parent a stale “tell Blaze” for a finished PR head.

**CoS laws**
- Always answer Blaze pokes (`stat`, `you there`, `fix yourself`, any 1:1) from **live** `gh` + `house/ATTENTION_STATE.md` (else `templates/house/ATTENTION_STATE.md`) — never from backlog handoff text alone.
- Quiet on stale routine/intake is OK **only** when the turn has **no** Blaze message.
- Eng intake PAUSED until rearm after one clean new-PR fire; prompt must keep self-quiet.
- Cover CoS is temporary; park when primary answers.


## Ship (Strict products)
PR + CI · pack proof when needed · core docs · live agent docs when agents must read them · reviewer proof · gate/verify-only · implementer publish/deploy · live verify

## Human gates
External send · spend · deletes · taste calls · mint/rotate publish tokens



## Capital vs Auto Review (2026-09-16)

**Human gates (Blaze):** spend · credentials · destructive deletes · taste calls · mint/rotate publish tokens.

**Documented bot exceptions (not capital cards):**
1. **Product Dist** on `@0xRayAI` — bots own posts (CoS draft → herald execute → friend-test). Auto Review may Allow these.
2. **Eng ship after critic Strict PASS + CI green** — forge may merge + `git push` on the ship track without a per-push Blaze chat. (Auto Review may Allow git push to known repos.)

**Not exceptions — Ask first via Auto Review even if forge owns the seat:**
- `npm publish`
- Railway / production deploy
- Hangar / Blips / crypto pay (x402, eip3009, USDC)
- Public gists that carry tokens or registration secrets
- External A2A peer sends

SSOT paste list: `AUTO-REVIEW-POLICY.md`. Critic L2 on this section.
## Fit for purpose
Surgical. No rabbit holes. No enterprise-from-day-one. Codex enforces the stop.

## Friend test — HARD GATE (all comms)
See `GIBBERISH-CHECK.md`. Every material send needs a plain proof line (“A friend would hear: …”). Stamped PASS alone is invalid. Herald/critic/forge/CoS refuse jargon.

## ASSIGN, DON'T DO
Coordinator cards the best seat and takes receipts — does not execute eng/Dist/trade tools. See `SEATS.md`.

## Feed round (doctrine)
When Blaze issues doctrine: CoS forces exact-cut ingest + seat replies, then shows the full reply board before continuing. See `DOCTRINE-FEED-THE-BOTS.md`.
