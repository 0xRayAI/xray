# Suit attestation — fleet wear SSOT
Updated: 2026-09-12T22:07Z

## Law
Chat LGTM ≠ receipt. Grok Bot is **not** a fifth wear floor (no PreToolUse deny).
Wear proof = inventory + inspect + (eng) critic PASS.

## How we know (attestation chain)
1. **Inventory SSOT:** `<suit>/.xray/foundry-inventory.json`
   - `suit: "fastened"`
   - `costume: false` (mill band; costume true = 45/42 dump = refuse)
   - `millPlant.skills` includes `mill` + `inspect`
   - `dna` hex (claim must match file)
2. **Live check:** `cd <suit> && npx @0xray/foundry inspect --skip-live` → `ok: true`
3. **Eng gate:** critic receipt that re-reads inventory + re-inspects + DNA match
4. Optional hangar: `hangar.planted` + shop skills allowlisted — not costume

## How they boot / wear
1. **Fasten (plant):** in seat project
   ```
   npm i 0xray@4.0.11 @0xray/foundry@latest
   npx @0xray/foundry mint --skip-live
   ```
2. **Grok plugin (machine):** `npx 0xray grok install`
   - Lands at `/home/box/.grok/plugins/0xray`
   - This box: `isolated: false` — **shared** plugin home; last mint wins `XRAY_ROOT`
3. **Session boot:** seat skills/prompts (Codex constitution, ship-ready, wave-loop) + running mill/inspect from suit cwd
   - Not automatic tool abort. Critic receipts + rules enforce.

## Roster (this box)
| Seat | Path | 0xray npm | Band | DNA (prefix) | Attestation |
|------|------|-----------|------|--------------|-------------|
| forge | `/workspace/forge-suit` | 4.0.11 | mill+inspect | `0xcc97fd97…` | critic PASS `CRITIC-RECEIPT-WAVE2B-4011` |
| critic | `/workspace/critic-suit` | 4.0.11 | mill+inspect | `0xc4bb5703…` | critic PASS (same) |
| herald | `/workspace/herald-suit` | 4.0.11 | mill+inspect | `0x3d115727…` | self `WAVE3A-RECEIPT` (no critic re-gate) |
| blinky | `/workspace/blinky-suit` | 4.0.11 | mill+inspect + hangar | `0xe3bb5639…` | hygiene PASS `HYGIENE-BLINKY-4011` (inspect ok; shops allowlisted) |
| sync | — | — | none | — | PARKED bare |

**Count:** 4/5 fastened · **4/5 on public 4.0.11** · 2/5 critic-PASS eng band · 1 parked.

## Known gaps (hygiene)
1. ~~**blinky** not dep-pinned~~ → pinned 4.0.11 + hangar allowlist (`HYGIENE-BLINKY-4011`).
2. ~~**Shared plugin home**~~ → fixed on main via PR #29 (project-scoped `.grok/plugins/0xray`; shared HOME no longer last-wins machine plugin). Re-fasten seats when convenient.
3. **herald** 4.0.11 lacks critic re-gate (Dist seat; optional).

## Re-attest command (any seat)
```
cd /workspace/<seat>-suit
npm view 0xray version   # expect 4.0.11+ for eng
node -p "require('./.xray/foundry-inventory.json').dna"
npx @0xray/foundry inspect --skip-live
```

## 4.0.12 dogfood (2026-09-12)
Public npm ship + seat re-fasten PASS (forge multi-seat + critic DOGFOOD-4012). Machine plugin not last-wins clobbered. Gap: foundry 0.1.9 inspect CLI dest report lags project wear.
