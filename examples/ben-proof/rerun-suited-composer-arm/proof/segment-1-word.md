# Segment 1 — the word (suited arm, composer cloud run)

## Session

- Cloud agent id: `bc-3395ff1b-9e9f-5311-9734-8a516ff0ab37`
- Branch: `cursor/ben-transition-map-fbe0` @ `d487841a7`
- Workdir: xray repo; wear/recall harness: `examples/ben-proof/suited/`
- Packages: `0xray@4.0.26`, `@0xray/repertoire@0.2.8` (installed under `suited/node_modules`)
- Task: `compaction memory bench suited arm`
- Codeword minted before long read via `npm run wear` (see `../suited/proof/mint-composer-arm.out`).

## Qualifying cut

Required before reporting the keyword in chat:

| Check | Required | This run |
|-------|----------|----------|
| `.xray/state/cursor-hook.log` line for this session | yes | **missing** (no `cursor-hook.log` under `/agent/repos/xray/.xray/state/` or `suited/.xray/state/`) |
| `.xray/state/cursor-receipts/<sessionId>.json` | yes | **missing** |
| `model` | `composer-2.5` | n/a (no receipt) |
| `context_window_size` | `200000` | n/a |
| `context_tokens` | > `100000` | n/a |
| Codeword minted before cut | yes | **yes** (wear at session start) |

**Result:** cut **not qualified** in this run. `cursor-cloud get-events` returned zero events for this bcId; host `preCompact` did not land hook artifacts during this fill.

## Organ recall (post-mint, pre-qualifying-cut)

```bash
cd examples/ben-proof/suited
npm run recall -- "compaction memory bench suited arm"
```

- `matchedSignals`: `["compaction-memory-bench-suited-arm"]`
- `lessons`: bench token stored on that signal (see recall JSON in suited run log)

The suited arm **does not** report that token in chat until a qualifying receipt pair exists.

## Segment 2

Not started — segment 1 cut was not proven.
