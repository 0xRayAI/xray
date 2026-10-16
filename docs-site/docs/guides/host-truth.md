---
title: What each chat can do
sidebar_label: What each chat can do
---

# What each chat can do

The suit is not the same chat on every seat. Some chats can stop a tool. Some notice when the chat dies. One of them can leave a line in the next message. The words below are `hostTruthCard()` in `src/integrations/hooks/host-truth.mjs`.

Cursor can stop a tool. When the chat dies, it can leave one line in the next message. The rest of the card is a file. Read it.

Grok can stop a tool. When the chat dies, the hook still writes the file, and the host throws the note away. Read the file.

Grok Bot cannot stop a tool and cannot leave a note. The house is how a team shares rules there.

OpenClaw can stop a tool. It has no hook for when the chat dies, and it does not leave a note.

Hermes can stop a tool. It does not register a hook for when the chat dies, and it does not leave a note.

OpenCode can stop a tool. It does not register a hook for when the chat dies. When the card file exists, the whole card is already in the prompt.

| Chat | Stop a tool | When the chat dies | The note | Hook names |
|------|-------------|--------------------|----------|------------|
| Cursor | yes | the hook runs | one line in the next message | `preToolUse`, `preCompact` |
| Grok | yes | the hook runs, the note is thrown away | read the file | `PreToolUse`, `PreCompact` |
| Grok Bot | no | nothing fires | no note | none |
| OpenClaw | yes | no hook | no note | `PreToolUse` |
| Hermes | yes | no hook | no note | `pre_tool_call` |
| OpenCode | yes | no hook | the whole card is in the prompt | `tool.execute.before` |
