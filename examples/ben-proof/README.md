# Two-agent compaction proof

This folder is the code and the run files for the finished score. The side-by-side story is in `examples/killer-dual/TRANSITION.md`. Leave that file where it is.

Two Cursor cloud agents. Both Composer 2.5. The window is 200000 tokens. A counted cut needs `context_tokens` greater than 100000.

`suited/` is the agent wearing 0xRay. Memory is 0xRay. `dummy/` is a plain app with no 0xRay. The code word lives in a file there.

## How to run it

The rerun instructions are in `prompts/README.md`.

Mint the code word before you fill the window. Read real source in slices of at most 400 lines. Do not generate files to fill the window. Do not spawn subagents during the fill.

A cut counts only when that same session has both of these, and both say the model is `composer-2.5` with a nonzero token count:

- a line in `cursor-hook.log`
- a receipt at `.xray/state/cursor-receipts/<sessionId>.json`

A line with zero tokens does not count. A different model does not count.

### Suited (wearing 0xRay)

From `suited/`:

```bash
npm run wear -- "compaction memory bench suited arm"
```

Later, after the cut:

```bash
npm run recall -- "compaction memory bench suited arm"
```

The copied `suited/package.json` records what the last proof used: `0xray` 4.0.26 and `@0xray/repertoire` 0.2.8. A rerun should install those pinned versions before `npm run wear`.

### Dummy (plain app)

From `dummy/`:

```bash
npm run intake
```

`npm run intake` is the only writer. `npm run recall` is read-only and must not mint.

The last run's plain app did not remember the word in the chat. The word was still in `data/lessons.jsonl`, and a later read printed that file. A file read is not memory.

## What the last run left on disk

Suited session `bc-24e5e7e5-a924-554c-9294-ba9d813d0958`. The wear at `2026-09-24T20:34:29.210Z` stored `bench-5679e6fb` for the task "compaction memory bench suited arm". That line is the last row of `suited/proof/feedback-2026-09-24.jsonl`. The cut line is `proofs/bc-24e5e7e5-a924-554c-9294-ba9d813d0958.hook-line.txt`: `2026-09-24T20:38:43.090Z`, 182938 tokens, 91.469 percent of 200000, generation `8fda442f-d9fa-4218-8cc0-7d59899c696e`. After the cut, the first answer in the chat was `bench-5679e6fb`.

`suited/proof/recall.out` is an earlier recall that printed no lessons. `suited/proof/recall2.out` lists four earlier words and does not contain `bench-5679e6fb`. The chat answer is the one in the transition map.

Dummy session `bc-9893bcfe-a184-5028-a277-0eb943c6c6cf`. The last line of `dummy/proof/lessons.jsonl` saved `bench-4b80c22a6bea282336f10e74aab9e122` at `2026-09-24T20:34:17.813Z`. The cut line is `proofs/bc-9893bcfe-a184-5028-a277-0eb943c6c6cf.hook-line.txt`: `2026-09-24T20:39:48.500Z`, 187858 tokens, 93.929 percent of 200000, generation `d32499d0-b576-458e-a24c-2e20344e6419`. Earlier hook lines for this same session said zero tokens. Those do not count. The chat did not come back with the word.

When this folder was packed, `.xray/state/cursor-receipts/` did not still hold a json file for either of those two session ids. The only receipt left there was a later parent session, so it was not copied. The two hook lines above are the lines that were still on disk.

## What to record for the report

Write these down for each arm:

- session id
- model
- `context_tokens`
- `context_window_size`
- `context_usage_percent`
- `generation_id`
- hook log timestamp
- receipt timestamp
- the code word and the timestamp it was written
- the exact recall output after the cut
