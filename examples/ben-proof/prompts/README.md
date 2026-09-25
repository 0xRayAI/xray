# How to rerun

Two Cursor cloud agents, both Composer 2.5, window 200000. Start them together. Give each one its own prompt below. Do not spawn subagents inside either run. Their context will not fill yours.

Success is a host compaction receipt whose session id is that agent, with context_tokens greater than 100000 and context_window_size 200000, plus the per-session receipt. A line count is not success. A generator script is not success, because the source never enters the conversation.

- Suited (wearing 0xRay): prompts/suited-100k.md
- Plain app (no 0xRay): prompts/dummy-100k.md
