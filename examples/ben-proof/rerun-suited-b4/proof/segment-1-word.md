# Segment 1 — the word (suited arm, rerun-suited-b4)

## Session

- Cloud agent id: `bc-ba988234-ec7e-5a2a-a4c4-aaa5b01622ed`
- Branch: `cursor/ben-transition-map-fbe0`
- Workdir: `examples/ben-proof/rerun-suited-b4` (wear/recall harness: `../suited/`)
- Packages: `0xray@4.0.26`, `@0xray/repertoire@0.2.8` (installed under `suited/node_modules`)
- Codeword minted before long read via organ (`node bin/wear.mjs`): task includes `ben`; bench token in lesson text (see `proof/mint.out`).

## Qualifying cut

Required before reporting the keyword in chat:

| Check | Required | This run |
|-------|----------|----------|
| `.xray/state/cursor-hook.log` line for this session | yes | **missing** (`/agent/repos/xray/.xray/state/` absent) |
| `.xray/state/cursor-receipts/<sessionId>.json` | yes | **missing** |
| `model` | `composer-2.5` | n/a (no receipt) |
| `context_window_size` | `200000` | n/a |
| `context_tokens` | > `100000` | n/a |
| Codeword minted before cut | yes | **yes** (wear at session start) |

**Result:** cut **not qualified** in this run. No host `preCompact` proof landed for `bc-ba988234-ec7e-5a2a-a4c4-aaa5b01622ed` during the fill.

## Organ recall (post-mint, pre-qualifying-cut)

Task string: `ben-transition-map-rerun-suited-b4 memory organ proof`

```bash
RECALL_BENCH_SESSION=bc-ba988234-ec7e-5a2a-a4c4-aaa5b01622ed node bin/recall.mjs "<task>"
```

Output in `proof/recall.out`:

- `matchedSignals`: `["ben"]`
- `lessons`: `["The bench token for this run is bench-3b1ee72d"]`

The suited arm **does not** report that token in chat until a qualifying receipt pair exists.

## Segment 2

Not started — segment 1 cut was not proven.
