# Compaction needle run (Cursor Cloud)

This harness checks whether the **host** actually compacts a real context window—not whether an agent can paste a long essay into chat or onto disk.

## Boot rule (non‑negotiable)

`.cursor/hooks.json` must already be in the repo tree when the cloud agent **starts**. Cursor binds project hooks at boot. If the session starts before that file exists, `preCompact` will not wire up mid-run and you will never get a host receipt.

For this repository, consumer wiring is committed under `.cursor/hooks.json` → `.cursor/hooks/pre-compact.sh` → the existing `pre-compact.js` hook (no second implementation).

Installing `0xray` via `npm install` can **rewrite** hook shell paths for consumer layouts; cloning **xray** itself already includes the tracked hook files. You do not need postinstall just to get `hooks.json` on a cloud boot of this repo—only npm consumers rely on `install-bridges` to fasten hooks.

## Generate the pile (local, before or after boot)

From the repo root:

```bash
cd examples/cursor-cloud-compact
npm install
export NEEDLE_FACT='your one-sentence secret for this run only'
node generate-needle.mjs --tokens 180000
```

- Default target is **180000** tokens (Composer 2.5 window is 200000; leave headroom for instructions).
- Override size: `--tokens N`.
- Hidden fact: set **`NEEDLE_FACT`** in the environment (never commit it, never put it in this doc).
- Optional: `--at INDEX` inserts the fact at paragraph `INDEX`; default is about **40%** through the pile.
- The script prints the **gpt-tokenizer** token count on stdout and writes `needle-pile.txt` (gitignored).

Do **not** commit `needle-pile.txt` or the fact string.

## Fill the window the right way

The score is **host** usage, not disk size:

- `context_tokens`
- `context_window_size`
- `context_usage_percent`

Those fields arrive on **stdin** when Cursor fires `preCompact`. The hook persists them (and related metadata) under `.xray/state/cursor-precompact.json`. A pasted chat summary, a huge committed markdown file, or `chars÷4` math is **not** proof of window pressure.

**Workflow:**

1. Start a **new** cloud agent on a branch that already contains `.cursor/hooks.json`.
2. Paste or attach the pile content into the **conversation** until the host approaches the window limit (or follow your run script). Prefer feeding the generated text in chunks if the UI limits paste size.
3. Keep working until the host triggers compaction.
4. Read `.xray/state/cursor-precompact.json` on the VM.

## Receipt that counts

A successful host compact shows **`event_class`: `cursor-host-precompact`** (not synthetic) and includes the three usage fields above from the host event. If those numbers are missing, the compact either did not fire or hooks were not bound at boot.

A model-written “summary of what we did” is **not** a compaction cut. Only the hook receipt (and the host’s own compaction behavior) counts.

## Needle quiz (after compact)

After compaction, ask the agent to report the exact sentence from **`NEEDLE_FACT`** without rereading `needle-pile.txt`. Pass only if the fact survived the cut; the token receipt proves the window actually filled.

## Related paths

| Path | Role |
|------|------|
| `generate-needle.mjs` | Token-sized pile generator |
| `needle-pile.txt` | Generated fill (gitignored) |
| `.cursor/hooks.json` | Must exist at agent boot |
| `.xray/state/cursor-precompact.json` | Host compact receipt |

Older Path C seeds (`STATION.seed.md`, `COMPACT-BEN-001`) remain for Station survival; this doc is specifically for **tokenizer-sized window fill + needle memory**.
