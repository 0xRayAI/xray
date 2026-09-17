---
name: sound-inspect
description: Inspect the last factory-sound bed — loudness/smoothness gates, not code-mill diffs. Not costume.
---

# Sound inspect

This is the **bed** inspect, not mill inspect. Open the receipt. Quote the numbers. Do not invent a pass.

`npx @0xray/foundry inspect` reports sound plant present plus last bed `PASS`/`FAIL`. `npx @0xray/foundry sound inspect` is the same bed check.

## Gates (fail-closed)

Missing wav, unreadable wav, or a thrown metric is **FAIL**. Never pass on silence.

1. **Chop.** Mean |ΔRMS| over 0.25s windows ≪ 0.1 (strong ≤ 0.05).
2. **Levels.** Body / intro mean RMS ratio ~1.5–3.0. Body min RMS ≥ 0.05 (exclude the final 1s fade).
3. **Peak.** Max |sample| < 0.95.
4. **Hum.** No continuous near-constant drone (dominant-bin share over the piece).

Receipt: `.xray/sound-bed-receipt.json`. Wav default: `.xray/sound/bed.wav`.

```bash
npx @0xray/foundry sound render --brief "warm basement pad" --genre jazz
npx @0xray/foundry sound inspect
```

Plant-vs-worn allowlists `sound` + `sound-inspect` + `sound-mixer` when `"plant": "sound"`. They are not a costume dump. Mill may be off on this seat. Mixer is the variation tuner (`sound mix`); this skill still quotes the last bed.
