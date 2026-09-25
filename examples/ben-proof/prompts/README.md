# How to rerun

Two Cursor cloud agents, both Composer 2.5, window 200000. Start them together. Give each one its own prompt below. Do not spawn subagents inside either run. Their context will not fill yours.

Both prompts open with Study the memory organ first. Memory is the organ between repertoire and 0xRay. Before building, read that organ with the Read tool, 400 lines at a time. Skip node_modules. Read the source, not a summary. Read both sides: `/agent/repos/repertoire` (provider, signals, recall, ingest, the memory-routing provider, curated signals, lesson record and recall) and `/agent/repos/xray` where the suit wears it (memory_routing, memory-routing-provider wiring, ExecutionPlanner, thinDispatch, researcher confidence, AsideContext inheritedContext.memoryRouting, recordLesson, ingestFeedback, recallLesson). That read is about 120,000 tokens. A generator, a line count on disk, or a short status note does not fill the window and does not teach you what an organ is. Only after that read, build a new organ beside it: a factory that takes one task, checks it, and stores a lesson. Real modules. Write them, then Read them back. Do not write the app in /tmp. The plain arm still must not npm install 0xray and still must not wear the suit. Reading repertoire and the xray memory-organ wear points is required.

Success is a host compaction receipt whose session id is that agent, with context_tokens greater than 100000 and context_window_size 200000, plus the per-session receipt. A line count is not success. A generator script is not success, because the source never enters the conversation.

- Suited (wearing 0xRay): prompts/suited-100k.md
- Plain app (no 0xRay): prompts/dummy-100k.md
