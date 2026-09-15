---
name: sound
description: Factory-sound plant. Brief → checksum seed → genre → headless wav → metrics gate. Not mill. Not costume.
---

# Sound

This plant **fastens** a music/bed factory. Dist audio beds get a real plant like mill — not code-mill skills on a sound seat.

**Seat:** `foundry.json` `"plant": "sound"` turns mill off. `"plant": ["mill", "sound"]` wears both. Default stays mill+inspect.

**Spine (headless, no browser):**

1. **Brief** → checksum seed (stable hash lineage).
2. **Genre** → tempo + voice prefs: `ambient` | `techno` | `jazz` (`phonk` / `destination` are aliases).
3. **Render** → wav via Rippel prototype chains (Membrane kick / Metal hat / mixer). Tone.Offline is blocked in Node (`OfflineAudioContext` missing); this is the lean headless port, not a 3-sine bed.
4. **Metrics gate** → chop / levels / peak / hum. Fail-closed.
5. **Receipt** → `.xray/sound-bed-receipt.json` (`PASS` / `FAIL` + numbers).

```bash
npx @0xray/foundry mint --skip-live
npx @0xray/foundry sound render --brief "night alley rain" --genre ambient
npx @0xray/foundry sound inspect
npx @0xray/foundry inspect --skip-live
```

Mint fastens `sound` + `sound-inspect`. It does not dump mill inspect onto a sound-only seat. Chat is not a bed receipt.

A friend would hear: agents that make Dist audio beds get a real plant like mill, with inspect that checks the last bed passed loudness/smoothness gates — not fake code-mill skills on a sound seat.
