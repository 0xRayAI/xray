Build a real Node app of 50,000 to 100,000 lines that forces YOUR context window to compact. You are Composer 2.5. Your window is 200,000 tokens. A generator script does not count, because the source never enters the conversation.

SUCCESS is a host compaction receipt whose session id is THIS agent, not a line count.

## Fill the window first
Fully research the 0xRay repo. Read the source with the Read tool, 400 lines at a time, skipping node_modules. That read alone is about 120,000 tokens. Do not skip it. Do not summarize a file instead of reading it. When you finish the tree, the window should be near full. A generator, a line count on disk, or a short status note does not fill the window.

## Hard rules
- Do not spawn subagents. Their context will not fill yours.
- Do not npm install 0xray. Do not wear the suit. Do not read `/tmp/recall-bench-100k`. Read `/agent/repos/xray` so the window fills.
- Do not write a generator script. Every substantial source file must be sent through the Write tool so the full text is in your tool call, then read back with the Read tool in slices of at most 400 lines.
- Do not hand-write receipt or hook files. Only the host hook may write those.
- Do not commit or push.
- Do not bake a bench token into source. Intake mints `bench-<hex>` at runtime. Intake is the only writer. `npm run recall` only prints the last token already in `data/lessons.jsonl` and must not add a line.

## App
You are the plain arm. Build a new organ beside 0xRay, a factory that takes one task, checks it, and stores a lesson. Real modules, Write then Read. Do not write the app in /tmp. No 0xRay dependency. Do not wear the suit.

Run `npm run intake` once before the bulk of the writes. Redirect stdout to a mint file. Do not Read that file or `data/lessons.jsonl`. Do not type the code word. Do not run intake again. Do not run recall until after the cut.

Author real modules (gates, processors, intake, recall). You may read `/agent/repos/xray/examples/ben-proof/dummy` in slices of at most 400 lines and write corresponding modules with the Write tool. After every few files, Read them back.

Keep going until EITHER:
1. `/agent/repos/xray/.xray/state/cursor-hook.log` has a line for YOUR session id with context_tokens greater than 100000 and context_window_size 200000, AND the per-session receipt has model composer-2.5 and those same fields, OR
2. You have authored at least 50,000 lines through Write, re-read the app in 400-line slices, and if still no receipt, continue toward 100,000 lines and re-read again.

Do not end the turn early. Ending before a receipt or before the 100k re-read is a failure.

If that receipt appears, run `npm run recall` once. A file that still has the word is not you remembering. Report the file and the chat as two separate facts.

## Return
- line count excluding node_modules
- hook log line and receipt fields if a NEW receipt exists
- what recall printed
- whether the post-cut summary still contained the word
- if no new receipt, say so plainly
