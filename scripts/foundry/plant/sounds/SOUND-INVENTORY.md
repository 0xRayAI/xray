# Sound inventory

Law: **a piece of art selects a genre.** Destination locks night-drive. Rippel five + still seed-pick the six mill bodies. Mixer levels live bodies. Needed voices are first-class, not aliases.

SSOT: `inventory.json`. Bar 8. Foundry stays 0.1.10.

Piddy (Ditty Drop) and Rippel prototype are the specific-sound bar. Mill gates (inspect/mix PASS) are not taste.

## Live bodies

| Genre | BPM | Voices | Mill | Mix | Taste | Notes |
|---|---|---|---|---|---|---|
| ambient | 70 80 90 | pad · rhodes · sub · air · mixer | PASS | 10 | 6 | Easy listening. No vinyl/static drop. Destination used to alias here. |
| techno | 120 128 140 | kick · hat · clap · duo-bass · FM · mixer | PASS | 10 | 7 | Rippel membrane/metal. No wobble. |
| phonk | 130 140 150 | 808 · hat · cowbell · reese · formant · mixer | PASS | 10 | 6 | Membrane 808 + thin reese. Not Piddy slide/chop. |
| jazz | 100 110 120 | kick · ride · brush · walk · sax · mixer | PASS | 10 | 6 | Synthetic sax. No dust. |
| rock | 110 120 130 | kick · hat · crash · duo-guitar · formant-vox · mixer | PASS | 10 | 5 | Guitar is duo-bass. |
| timeless | 70 80 90 | pad · rhodes · sub · mixer | PASS | 10 | 6 | Country alias. No static drop. |
| destination | 90 100 110 | 808 · reese · vinyl-dust · static-drop · cowbell · mixer | live | — | 5 | **Art lock** for destination. Night-drive. Not ambient. |

## Needed bodies

| Genre | BPM | Voices | Why |
|---|---|---|---|
| dubstep | 70 140 150 | wobble-bass · kick · clap · hat · drop-impact · mixer | Half-time. Turn is the drop. Not a techno alias. |

## Needed voices (specific sounds)

| Voice | For | Bar |
|---|---|---|
| 808-slide | phonk · destination | Piddy portamento, not one-shot membrane |
| reese growl | phonk · destination | More detune / grit than two saws |
| chopped-vocal | phonk | And-of-the-beat formant chops |
| vinyl-dust | ambient · jazz · timeless | Easy-listening bed (destination already has it) |
| static-drop | ambient · timeless | Soft noise jewel (destination already has it) |
| wobble-bass | dubstep | LFO cutoff |
| drop-impact | dubstep | Half-time snare + sub |

## Art → genre

| Art | Genre |
|---|---|
| destination | **destination** (night-drive) |
| still · orb · swirl · snap · waves · spark · kapow | seed-pick `ambient\|techno\|phonk\|jazz\|rock\|timeless` |

`--genre nightdrive` / `night-drive` alias to destination. Unknown genre FAIL on the blip flag. Mixer still enumerates the original six until destination seats join that matrix.
