# Push fleet ops to 0xRay git

**Remote home:** `0xRayAI/xray` → `grok-bot/`  
**Working copy:** the Grok Bot computer (`ops/` + skill workflows)

0xRay is the OS. Product repos (Groover, etc.) are not where fleet procedures live.

## When to mirror
Open or update a PR when **material** procedures or skills change (review levels, cloud rules, seats, ship spine, skill recipes).

## When not to
Board noise, one-off receipts, product-only docs, tiny typos you will batch later.

## How
1. Diff working copy vs `grok-bot/` on main.
2. Copy only the SSOT ops + skill files.
3. **Friend test** every changed file (`GIBBERISH-CHECK.md`) before open.
4. PR — usually Normal (CI + short note). Strict only if ship/security/live-agent rules change.
5. Merge when green.

Seats first. Cloud only if the diff is heavy.

## Weekday cadence (Blaze 2026-09-14)
**Weekdays ~11:28 America/Chicago** — CoS routine cards forge to mirror material ops/skills into `grok-bot/`.
Empty diff → quiet. Material → Normal PR + friend-test proof line. Not weekends unless Blaze asks.
