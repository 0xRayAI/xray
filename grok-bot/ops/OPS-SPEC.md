# Fleet operating spec

How this Grok Bot fleet runs on 0xRay. Plain roles; seat names in `SEATS.md`.

## North star
Wear a thin mill suit. Agents execute and prove. Humans approve money, public posts, and credentials.

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

Stay quiet on repeat acks. Coordinator does not deploy or implement.

## Ship (Strict products)
PR + CI · pack proof when needed · core docs · live agent docs when agents must read them · reviewer proof · gate/verify-only · implementer publish/deploy · live verify

## Human gates
External send · spend · deletes · taste calls · mint/rotate publish tokens

## Fit for purpose
Surgical. No rabbit holes. No enterprise-from-day-one. Codex enforces the stop.

## Friend test — HARD GATE (all comms)
See `GIBBERISH-CHECK.md`. Every material send needs a plain proof line (“A friend would hear: …”). Stamped PASS alone is invalid. Herald/critic/forge/CoS refuse jargon.
