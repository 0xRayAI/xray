# v7c stems

Each file is one v7c source across the full 22.87 s bed, with silence where that source is silent.
The mp3 is peak-normalized to about −6 dBFS so the tone can be heard.
Level vs mix is that source after its mix gain, the bed fit gain, and the master fade, against the finished v7c mix.
RMS is over 5.5–15.4 s. Peak is the source peak against the mix peak. Both are before the bus glue. Glue on v7c is about 1 dB.

There is no detune stack, no riser, and no noise shimmer in this render.
Pad motion is the 0.07 Hz weight crossfade and the slow lowpass drift, not a separate oscillator.
Blaze has listened to `kick-tick` and it is not the cricket or bell.

Rebuild check: pad 7.66e-15, kick 5.55e-17, hat 0.00e+0, pluck 0.00e+0, stab 4.39e-15, side scale delta 0.00e+0.

| Name | Code | Onsets | Peak Hz | Centroid Hz | Hit | RMS vs mix | Peak vs mix | Flag |
|---|---|---|---:|---:|---:|---:|---:|---|
| pad-voice-1 | sound-magnetic.cjs renderPad / chordSines. Four exact sines, no detune. Lowpass near 980 Hz, ±40 Hz at 0.05 Hz. Weights crossfade at 0.07 Hz. | 48 hits, first 1.064s, 1.534s, 2.004s, 2.474s, …, median gap 470 ms | 261 | 262 | 450 ms | -9.6 dB | -15.9 dB | — |
| pad-voice-2 | sound-magnetic.cjs renderPad / chordSines. Four exact sines, no detune. Lowpass near 980 Hz, ±40 Hz at 0.05 Hz. Weights crossfade at 0.07 Hz. | 48 hits, first 1.041s, 1.510s, 1.981s, 2.450s, …, median gap 471 ms | 312 | 311 | 450 ms | -16.2 dB | -22.3 dB | — |
| pad-voice-3 | sound-magnetic.cjs renderPad / chordSines. Four exact sines, no detune. Lowpass near 980 Hz, ±40 Hz at 0.05 Hz. Weights crossfade at 0.07 Hz. | 47 hits, first 1.237s, 1.708s, 2.177s, 2.646s, …, median gap 471 ms | 415 | 415 | 450 ms | -23.1 dB | -27.9 dB | — |
| pad-voice-4 | sound-magnetic.cjs renderPad / chordSines. Four exact sines, no detune. Lowpass near 980 Hz, ±40 Hz at 0.05 Hz. Weights crossfade at 0.07 Hz. | 48 hits, first 1.200s, 1.670s, 2.140s, 2.610s, …, median gap 470 ms | 622 | 622 | 450 ms | -34 dB | -39 dB | — |
| pad-side | sound-magnetic.cjs unisonSide(pad, 13 ms, 19 ms), then the 200 Hz side highpass | 50 hits, first 0.644s, 0.665s, 1.148s, 1.593s, …, median gap 484 ms | 261 | 277 | 450 ms | -15.2 dB | -18.4 dB | — |
| bass-sub | sound-pro.cjs renderBassNote sub. sound-magnetic.cjs renderBassPattern. Off-beat 16ths, 90 ms, pitch drift. | 97 hits, first 5.327s, 5.449s, 5.571s, 5.815s, …, median gap 122 ms | 754 | 51 | 81 ms | -6.4 dB | -5.6 dB | — |
| bass-mid | sound-pro.cjs renderBassNote mid. Odd harmonics, cutoff falls from about 160 Hz toward 70 Hz. | 97 hits, first 5.325s, 5.447s, 5.569s, 5.813s, …, median gap 122 ms | 129 | 48 | 80 ms | -25.6 dB | -26 dB | — |
| overlay-sub | sound-magnetic.cjs renderV7c. sound-elementary.mjs renderLibBass sub, lowpassed at 100 Hz, phase-aligned, from 7.0 s. | 86 hits, first 7.058s, 7.291s, 7.412s, 7.534s, …, median gap 124 ms | 291 | 48 | 79 ms | -19.1 dB | -18 dB | — |
| overlay-mid | sound-magnetic.cjs renderV7c. Elementary harmonic mid, highpassed at 100 Hz, same delay as the sub. | 141 hits, first 7.049s, 7.126s, 7.293s, 7.368s, …, median gap 81 ms | 151 | 146 | 28 ms | -20 dB | -13.8 dB | — |
| kick-body | sound-pro.cjs renderKickBody. Sine falling to 44 Hz, lowpass 160 Hz. | 34 hits, first 5.212s, 5.700s, 6.188s, 6.675s, …, median gap 488 ms | 116 | 44 | 277 ms | -3.5 dB | -3.4 dB | — |
| kick-tick | sound-pro.cjs addKickTick via renderKickFull. 2.8 kHz sine, about 4 ms. Blaze has rejected this as the cricket. | 34 hits, first 5.201s, 5.688s, 6.176s, 6.664s, …, median gap 488 ms | 2756 | 2797 | 3 ms | -42.1 dB | -23.4 dB | buried |
| clap | sound-pro.cjs renderSnap. 210 Hz plus two harmonics, 4 ms flam, lowpass 700 Hz. Every 2 beats from 7.7 s. | 15 hits, first 7.706s, 8.681s, 9.657s, 10.633s, …, median gap 976 ms | 215 | 226 | 30 ms | -30.1 dB | -17.4 dB | — |
| hat-closed | sound-pro.cjs renderHatSoft(false). FM sine, carrier 5800 Hz, modulator 8100 Hz, index 0.4, 11 ms, band 3.8–7.8 kHz. | 40 hits, first 11.031s, 11.275s, 11.518s, 11.762s, …, median gap 244 ms | 5771 | 5798 | 8 ms | -26.5 dB | -9.8 dB | tick, bell |
| hat-open | sound-pro.cjs renderHatSoft(true). Carrier 4600 Hz, modulator 6400 Hz, 28 ms. Only on some peak 8ths. | 2 hits, first 14.446s, 15.421s, median gap 976 ms | 4608 | 4601 | 21 ms | -30.6 dB | -6.7 dB | bell |
| hat-side | sound-magnetic.cjs hatPingSide. Same hats, highpass 300 Hz, sign flips each 8th. | 42 hits, first 11.031s, 11.275s, 11.518s, 11.762s, …, median gap 244 ms | 4608 | 4601 | 7 ms | -26.4 dB | -8.3 dB | tick, bell |
| pluck | sound-pro.cjs renderFmPluck. Dark moving lowpass, harmonicity 2, index 4.2 falling. From 2.6 s. | 37 hits, first 3.174s, 3.540s, 4.150s, 4.516s, …, median gap 609 ms | 393 | 447 | 88 ms | -14.8 dB | -8.3 dB | — |
| pluck-fm | sound-pro.cjs renderFmPluck, FM tone minus the settled sine. Already contained in pluck, not a second mix layer. | 37 hits, first 3.174s, 3.540s, 4.150s, 4.516s, …, median gap 610 ms | 388 | 1038 | 30 ms | -14.8 dB | -2.9 dB | — |
| pluck-side | sound-magnetic.cjs unisonSide(pluck, 7 ms, 11 ms) | 37 hits, first 3.185s, 3.551s, 4.158s, 4.527s, …, median gap 586 ms | 393 | 416 | 79 ms | -20 dB | -12.5 dB | — |
| stab-voice-1 | sound-pro.cjs renderWarmStab. Four chord tones, harmonics 1, 0.5, 0.22, 0.09, lowpass 980 Hz, 80 ms. | 17 hits, first 7.705s, 8.680s, 9.656s, 10.631s, …, median gap 976 ms | 248 | 312 | 61 ms | -34.6 dB | -22.9 dB | — |
| stab-voice-2 | sound-pro.cjs renderWarmStab. Four chord tones, harmonics 1, 0.5, 0.22, 0.09, lowpass 980 Hz, 80 ms. | 17 hits, first 7.706s, 8.680s, 9.655s, 10.631s, …, median gap 976 ms | 291 | 365 | 60 ms | -34.7 dB | -22.8 dB | — |
| stab-voice-3 | sound-pro.cjs renderWarmStab. Four chord tones, harmonics 1, 0.5, 0.22, 0.09, lowpass 980 Hz, 80 ms. | 17 hits, first 7.705s, 8.681s, 9.657s, 10.632s, …, median gap 976 ms | 388 | 467 | 61 ms | -35 dB | -23.8 dB | — |
| stab-voice-4 | sound-pro.cjs renderWarmStab. Four chord tones, harmonics 1, 0.5, 0.22, 0.09, lowpass 980 Hz, 80 ms. | 17 hits, first 7.704s, 8.680s, 9.656s, 10.632s, …, median gap 976 ms | 592 | 644 | 62 ms | -35.6 dB | -24.8 dB | — |
| stab-side | sound-magnetic.cjs unisonSide(stab, 11 ms, 17 ms) | 17 hits, first 7.723s, 8.706s, 9.682s, 10.658s, …, median gap 976 ms | 592 | 479 | 61 ms | -34.3 dB | -20.6 dB | — |
| room-pluck | sound-pro.cjs shortReverb of the pluck send (0.55). Combs 31/37/41/47 ms, damp 3200 Hz, highpass 220 Hz. Mix gain room 0.06. | 40 hits, first 3.237s, 3.611s, 4.197s, 4.554s, …, median gap 383 ms | 393 | 516 | 95 ms | -41.6 dB | -34.8 dB | — |
| room-stab | sound-pro.cjs shortReverb of the stab send (0.7). Same combs. | 17 hits, first 7.756s, 8.738s, 9.713s, 10.689s, …, median gap 976 ms | 393 | 547 | 84 ms | -45.2 dB | -33.2 dB | — |
| room-side | sound-magnetic.cjs unisonSide(room, 23 ms, 31 ms) | 54 hits, first 3.268s, 3.645s, 4.228s, 4.594s, …, median gap 343 ms | 296 | 655 | 75 ms | -45.5 dB | -39.4 dB | — |
| echo-mid | sound-magnetic.cjs pingPong(pluck, 0.75 beat, feedback 0.12, damp 2400 Hz), mid. Mix gain echo 0.07. | 37 hits, first 3.539s, 3.907s, 4.516s, 4.882s, …, median gap 368 ms | 393 | 445 | 87 ms | -33.7 dB | -27 dB | — |
| echo-side | Same pingPong side, gain echo × 1.35, then the bus side scale. | 37 hits, first 3.539s, 3.906s, 4.516s, 4.881s, …, median gap 366 ms | 393 | 447 | 86 ms | -33 dB | -24.8 dB | — |

## Flagged, kick tick excluded

- `hat-closed` (tick, bell, RMS -26.5 dB, peak -9.8 dB, tone 5771 Hz, centroid 5798 Hz, 8 ms)
- `hat-open` (bell, RMS -30.6 dB, peak -6.7 dB, tone 4608 Hz, centroid 4601 Hz, 21 ms)
- `hat-side` (tick, bell, RMS -26.4 dB, peak -8.3 dB, tone 4608 Hz, centroid 4601 Hz, 7 ms)

## Files

- STEM-v7c-pad-voice-1.mp3
- STEM-v7c-pad-voice-2.mp3
- STEM-v7c-pad-voice-3.mp3
- STEM-v7c-pad-voice-4.mp3
- STEM-v7c-pad-side.mp3
- STEM-v7c-bass-sub.mp3
- STEM-v7c-bass-mid.mp3
- STEM-v7c-overlay-sub.mp3
- STEM-v7c-overlay-mid.mp3
- STEM-v7c-kick-body.mp3
- STEM-v7c-kick-tick.mp3
- STEM-v7c-clap.mp3
- STEM-v7c-hat-closed.mp3
- STEM-v7c-hat-open.mp3
- STEM-v7c-hat-side.mp3
- STEM-v7c-pluck.mp3
- STEM-v7c-pluck-fm.mp3
- STEM-v7c-pluck-side.mp3
- STEM-v7c-stab-voice-1.mp3
- STEM-v7c-stab-voice-2.mp3
- STEM-v7c-stab-voice-3.mp3
- STEM-v7c-stab-voice-4.mp3
- STEM-v7c-stab-side.mp3
- STEM-v7c-room-pluck.mp3
- STEM-v7c-room-stab.mp3
- STEM-v7c-room-side.mp3
- STEM-v7c-echo-mid.mp3
- STEM-v7c-echo-side.mp3

