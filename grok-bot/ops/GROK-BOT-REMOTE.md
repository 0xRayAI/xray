# Grok Bot ops → 0xRay remote

**Remote SSOT:** `0xRayAI/xray` → `grok-bot/`  
**Working copy:** this computer (`/workspace/blinky-suit/ops/`, `/home/box/agent-data/workflows/`)

0xRay is the OS stack. Groover and other repos are products — do not park fleet op procedures there.

## When the implementer mirrors
Open or update a PR to `grok-bot/` when **material** fleet procedure or skill text changes:
- review levels, cloud-vs-seats, three layers, seats/roles, release spine, suit attestation
- shared skill recipes under `workflows/`

## When not to
- WAVEBOARD, attention noise, proof cards, E2E receipts, one-off handoffs
- Product docs that belong in groover/chrono/etc.
- Tiny typos you will batch into the next material PR

## How
1. Diff working copy vs `grok-bot/` on main (or last mirror PR).
2. Copy only SSOT ops + skill `SKILL.md` files (same allowlist as the first mirror).
3. PR on `0xRayAI/xray` — usually **Normal** (CI + short attest). **Strict** only if the change alters ship/publish/security/live-agent rules.
4. Merge when green; confirm paths on main.

Seats-first. Cloud only if the diff is heavy. No scheduled spam — event-driven on material change.
