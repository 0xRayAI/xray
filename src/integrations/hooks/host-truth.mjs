/**
 * What each chat can actually do.
 * Friend line first. Hook names are labels, not the sentence.
 *
 * stopsTool — the host can refuse a tool before it runs.
 * noticesDeath — a crush/compact hook runs.
 * note — what comes back into the chat: none, one-line, or the whole card.
 */

export const HOST_TRUTH = [
  {
    id: 'cursor',
    name: 'Cursor',
    stopsTool: true,
    noticesDeath: true,
    note: 'one-line',
    hooks: 'preToolUse, preCompact',
    line: 'Cursor can stop a tool. When the chat dies, it can leave one line in the next message. The rest of the card is a file. Read it.',
  },
  {
    id: 'grok',
    name: 'Grok',
    stopsTool: true,
    noticesDeath: true,
    note: 'none',
    hooks: 'PreToolUse, PreCompact',
    line: 'Grok can stop a tool. When the chat dies, the hook still writes the file, and the host throws the note away. Read the file.',
  },
  {
    id: 'grok-bot',
    name: 'Grok Bot',
    stopsTool: false,
    noticesDeath: false,
    note: 'none',
    hooks: 'none',
    line: 'Grok Bot cannot stop a tool and cannot leave a note. The house is how a team shares rules there.',
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    stopsTool: true,
    noticesDeath: false,
    note: 'none',
    hooks: 'PreToolUse',
    line: 'OpenClaw can stop a tool. It has no hook for when the chat dies, and it does not leave a note.',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    stopsTool: true,
    noticesDeath: false,
    note: 'none',
    hooks: 'pre_tool_call',
    line: 'Hermes can stop a tool. It does not register a hook for when the chat dies, and it does not leave a note.',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    stopsTool: true,
    noticesDeath: false,
    note: 'whole-card',
    hooks: 'tool.execute.before',
    line: 'OpenCode can stop a tool. It does not register a hook for when the chat dies. When the card file exists, the whole card is already in the prompt.',
  },
];

export function hostTruthById(id) {
  return HOST_TRUTH.find((row) => row.id === id) ?? null;
}

/** The card a person reads. One paragraph per chat. */
export function hostTruthCard() {
  return HOST_TRUTH.map((row) => row.line).join('\n\n');
}
