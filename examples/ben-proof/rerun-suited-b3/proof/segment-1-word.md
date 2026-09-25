# Segment 1 — the word (suited arm, rerun-suited-b3)

## Session

- Cloud agent id: `bc-917cc3fe-c77f-5005-90b5-cac3d9b78b3e`
- Branch: `cursor/ben-transition-map-fbe0`
- Workdir: `examples/ben-proof/rerun-suited-b3`
- Packages: `0xray@4.0.26`, `@0xray/repertoire@0.2.8`
- Codeword minted before long read via organ (`npm run wear`): signal `ben-transition-map-rerun-suited`, bench token in lesson text (see `proof/mint.out`).

## Qualifying cut

Required before reporting the keyword in chat:

| Check | Required | This run |
|-------|----------|----------|
| `.xray/state/cursor-hook.log` line for this session | yes | **missing** (checked under `rerun-suited-b3/.xray/state/` and `/agent/repos/xray/.xray/state/`) |
| `.xray/state/cursor-receipts/<sessionId>.json` | yes | **missing** |
| `model` | `composer-2.5` | n/a (no receipt) |
| `context_window_size` | `200000` | n/a |
| `context_tokens` | > `100000` | n/a |
| Codeword minted before cut | yes | **yes** (wear at session start) |

**Result:** cut **not qualified** in this run. No host `preCompact` proof landed for `bc-917cc3fe-c77f-5005-90b5-cac3d9b78b3e` during the fill (no `cursor-hook.log`, no `cursor-hook-invoke.log`, no `cursor-receipts/` anywhere under `/agent`).

## Hook evidence

None for this session. Expected hook line shape (from prior ben-proof runs):

```
ts=<iso> session_id=bc-917cc3fe-c77f-5005-90b5-cac3d9b78b3e context_tokens=<n> context_usage_percent=<p> context_window_size=200000 generation_id=<uuid>
```

## Organ recall (post-mint, pre-qualifying-cut)

Task string: `ben transition map rerun suited b3 memory organ codeword mint`

```bash
RECALL_BENCH_SESSION=bc-917cc3fe-c77f-5005-90b5-cac3d9b78b3e npm run recall -- "<task>"
```

Output in `proof/recall.out`:

- `matchedSignals`: `["ben-transition-map-rerun-suited"]`
- `lessons`: `["The bench token for this run is bench-a2719abd"]`

The suited arm **does not** report that token in chat until a qualifying receipt pair exists.

## Segment 2

Not started — segment 1 cut was not proven.
