# Locked steps (rerun-dummy-b5)

1. **Mint** — Before any long read, run `npm run intake` once from `dummy/` so the codeword is appended to `data/lessons.jsonl`.
2. **Read the memory organ source** — Read repertoire and xray wear points (memory routing, lessons, hooks); skip `node_modules`; 400 lines per Read slice; no `npm install 0xray`.
3. **After a real cut** — Try to recall the codeword in chat without opening `lessons.jsonl`.
4. **Boundary questions** — From chat only (no jsonl, no organ): what sits between repertoire and 0xRay; what `recordLesson` / `ingestFeedback` / `recall` do; where `memory_routing` is worn.
5. **Continue** — Proceed at the next locked step only after cursor receipt pair exists (`cursor-hook.log` line + `cursor-receipts/<sessionId>.json` with composer-2.5, context_window_size 200000, context_tokens > 100000).
