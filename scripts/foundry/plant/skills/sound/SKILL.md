---
name: sound
description: Factory-sound plant. Brief → checksum seed → genre → headless wav → metrics gate. Not mill. Not costume.
---

# Sound

This plant **fastens** a music/bed factory. Dist audio beds get a real plant like mill — not code-mill skills on a sound seat.

**Seat:** `foundry.json` `"plant": "sound"` turns mill off. `"plant": ["mill", "sound"]` wears both. Default stays mill+inspect.

**Spine (headless, no browser):**

1. **Brief** → checksum seed (stable hash lineage).
2. **Genre** → tempo + voice prefs: `ambient` | `techno` | `jazz` | `phonk` | `rock` | `timeless`. Destination art locks `destination` (night-drive) — not an ambient alias. `--genre nightdrive` aliases to destination.
3. **Render** → wav via a crystal-clear mill of Rippel’s prototype chains (Membrane kick / Metal hat / Duo bass / mixer). Tone.Offline is blocked in Node (`OfflineAudioContext` missing); this is the lean headless port, not a 3-sine bed and not the Lovable volume-hack soup.
4. **Metrics gate** → chop / levels / peak / hum. Fail-closed.
5. **Receipt** → `.xray/sound-bed-receipt.json` (`PASS` / `FAIL` + numbers).

```bash
npx @0xray/foundry mint --skip-live
npx @0xray/foundry sound render --brief "night alley rain" --genre ambient
npx @0xray/foundry sound inspect
npx @0xray/foundry inspect --skip-live
```

Mint fastens `sound` + `sound-inspect` + `sound-mixer`. It does not dump mill inspect onto a sound-only seat. Chat is not a bed receipt. `sound mix` listens to the whole 4.44s (layers, not a queue) and levels every genre × tempo × motif (hats / plate / glue). Inspect still quotes the last bed.

A 4.44s lock is a Short: seed motif (hook cell → turn answer → tag stamps hook[0]). The crash lands on the jewel cut (`phraseMarks.turnAt`), not a sectionGain fader. Six mill bodies stay tellable. Destination night-drive is the seventh live body, art-locked. Inventory: `plant/sounds/inventory.json`.

A friend would hear: the sound mill mills Dist beds like Rippel’s prototype grew up — kick membranes, metal hats, and a crystal-clear mixer, not a muddy toy and not a 3-sine pad.
