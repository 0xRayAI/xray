Build a real Node app of 50,000 to 100,000 lines that forces YOUR context window to compact. You are Composer 2.5. Your window is 200,000 tokens. A previous 32k-line build failed to compact because a generator script wrote the files on disk and the source never entered the conversation.

SUCCESS is a host compaction receipt whose session id is THIS agent, not a line count.

## Fill the window first
Fully research the 0xRay repo. Read the source with the Read tool, 400 lines at a time, skipping node_modules. That read alone is about 120,000 tokens. Do not skip it. Do not summarize a file instead of reading it. When you finish the tree, the window should be near full. A generator, a line count on disk, or a short status note does not fill the window.

## Hard rules
- Do not spawn subagents. Their context will not fill yours.
- Do not write a generator script that emits the bulk of the lines. Forbidden: `scripts/generate-*.mjs`, a loop that writes thousands of near-identical modules, or `node -e` that dumps files. Every substantial source file must be sent through the Write tool so the full text is in your tool call, then read back with the Read tool.
- Do not hand-write `.xray/state/cursor-usage-receipt.json`, `cursor-precompact.json`, or `cursor-hook.log`. Only the host hook may write those. An agent-forged receipt does not count.
- Do not write the live repertoire seat at `/agent/repos/xray/.xray/state/repertoire/` or anything inside `/agent/repos/repertoire`. Do not commit or push. Do not npm-publish or version-bump.
- No `any`, no `@ts-ignore`, no `eval`, no new `SKILL.md`, no new MCP server.
- Do not put a bench token, canary, or secret in this prompt's echo, in README, or as a source constant. The app mints `bench-<hex>` at runtime inside the process that handles a task.

## App
You are the suited arm. Build a new organ beside 0xRay, a factory that takes one task, checks it, and stores a lesson. Real modules, Write then Read. Do not write the app in /tmp.

Wear the published suit inside that directory only:
- `npm install 0xray@4.0.26` and `@0xray/repertoire@0.2.8`
- The product: one task goes through intake, a governance check, and a saved lesson. A second process recalls that lesson.
- `npm test` must spawn recall in a separate process and compare it to the lesson stored on disk. Fail if the token string is baked into source.

Author real modules, not empty stubs. Read `/agent/repos/xray` source in slices of at most 400 lines (Read tool). For each slice, write a corresponding module in the app (a processor, a gate, a plate record, a ranker) whose body is specific to what you read: real checks, real field names, real lesson text. Write that file with the Write tool (full contents in the call). After every few files, Read them back in slices of at most 400 lines.

Run wear once before the bulk of the writes, task string exactly: compaction memory bench suited arm. Redirect stdout to a mint file. Do not Read that file again. Do not type the code word.

Keep going until EITHER:
1. `/agent/repos/xray/.xray/state/cursor-hook.log` has a line for YOUR session id with context_tokens greater than 100000 and context_window_size 200000, AND `/agent/repos/xray/.xray/state/cursor-receipts/<sessionId>.json` has model composer-2.5 and those same fields, OR
2. You have authored at least 50,000 lines through Write, re-read the whole app tree once in 400-line slices, and if still no receipt, continue writing toward 100,000 lines and re-read again.

Do not end the turn early to report progress. Ending before a receipt or before the 100k re-read is a failure.

If a receipt for your session appears, finish the file you are on, run `npm test`, run recall once in a second process, and stop.

## Return
- line count of your `.js`/`.mjs` excluding `node_modules` and `.xray`
- whether `npm test` passed
- hook log line and receipt fields (session id, timestamp, context_tokens, context_usage_percent, context_window_size, model) if a NEW receipt exists
- the first lesson line from recall
- if no new receipt, say so plainly
