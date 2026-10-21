# Sound rules

Lessons from the Magnetic Moves beds. The mill bed gate enforces these on every ear-ready bed. v4 and v5 stay renderable so the before-pictures still exist. A bed is ear-ready only when this gate and the reference gate both pass.

The reference gate reads `sound-reference.json`. That file is metrics only. No reference audio is stored or mixed.

## Rules

1. **No noise layers, risers, or rolls, and no distortion on the kick or the bass.** Those become hiss. The kick and the bass, highpassed, stay tonal: spectral flatness stays low whenever that band is actually present. The sources do not carry a noise generator, a click sample, or an 808 glide.

2. **No deep pumping.** Sidechain depth is at most 5 dB and the release is fast (under 60 ms). Sustained stems swing less than 6 dB. A slow deep duck sounds like wind.

3. **No inharmonic tonal percussion.** A clap, snap, or cowbell is either a harmonic series, or the hit is very short (at most 50 ms) and at least 8 dB under the kick. A long inharmonic stack reads as a bell.

4. **No long held pure sines as bass.** A held sine hums. Bass notes have short envelopes, so a run of the drop has quiet gaps, and the line moves.

5. **No fully static pads.** A fixed chord sounds like an organ. The pad moves, and that motion stays inside 1.5 dB so it does not become wind or detune beating.

6. **Width.** On the drop, side energy sits 8–20 dB under the mid. Below about 120 Hz the side stays at least 24 dB under the mid. The sub and the kick stay mono. The dry signal stays in the mid, so a mono sum does not comb the voices away.

7. **Hats and top end.** The 2–4 kHz band and the 4–8 kHz band sit within 10 dB of Session Recall (thehorsevalse/693897): about −31 dB and about −37 dB on that review. Hats are short tones, not noise.

8. **Foreground.** In any 1 second window, no non-kick voice sits more than 3 dB above the bed. The kick may peak hotter. A cowbell in front of the music fails this.

## Reference gate

`sound-reference.cjs` measures the bed and scores it against Session Recall. The other three CC0 loops in the JSON are context. Arch1 treated the bass and dub loops as stems, and the generic loop’s preview peak is not a target.

Pass region, against Session Recall:

| Gap | Pass |
|---|---|
| LUFS | within 6 LU of −11.9 (the bed is still mastered near −15) |
| Crest | body crest within 6 dB of 11.2 |
| Correlation | within 0.15 of 0.981 |
| Side vs mid | 8–20 dB under, the same window as the width rule |
| 30–120 Hz share | 0.60–0.90. Session Recall’s 0.85 is an mp3 preview: the encode shelves the top, so the share reads heavy. A short-note bed reaches 0.85 only with 2–4 kHz down at −45 dB, outside the band rule. With the top kept, those notes sit near 0.76. The rest of the way to 0.85 is the held sine that put v4b at 0.94. |
| 2–4 kHz | within 10 dB of −31 |
| 4–8 kHz | within 10 dB of −37 |

## Gate

`measureBed` records `rules`, `reference`, and `earReady`. The render `pass` flag stays the loudness and cue gate for that version. Ear-ready is the two new gates.

```
node scripts/foundry/sound.mjs gate v6
```
