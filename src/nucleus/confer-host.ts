/**
 * Confer host port. The wearing TUI already spawned the MCP servers.
 * This port writes the ask or returns the host's answer. It does not spawn a server.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ConferHostSeat {
  todoId: string;
  subagent: string;
  server: string;
  tool: string;
  args: Record<string, unknown>;
  sessionId: string;
  prompt: string;
  dueReason: string | null;
}

export type ConferHostCall =
  | { status: 'pending'; askPath: string }
  | { status: 'answered'; text: string };

export interface ConferHostPort {
  call(seat: ConferHostSeat, projectRoot: string): Promise<ConferHostCall>;
}

export function conferAskPath(todoId: string, projectRoot: string): string {
  return path.join(projectRoot, '.xray', 'state', `confer-ask-${todoId}.json`);
}

/** Evidence for the host model. The schema line is not a vote. */
export function buildHostConferEvidence(role: string, evidence: string): string {
  const body = evidence.trim();
  return [
    `## Confer evidence — ${role}`,
    '',
    body || 'No local evidence. The wearing TUI has the confer ask.',
    '',
    'The wearing TUI writes the verdict on its own line after this evidence.',
    '',
    'Verdict: PASS | CONDITIONAL | FAIL',
    '- Top risks (bulleted)',
    '- Hardening note / recommendations',
  ].join('\n');
}

export class SessionConferHost implements ConferHostPort {
  async call(seat: ConferHostSeat, projectRoot: string): Promise<ConferHostCall> {
    const askPath = conferAskPath(seat.todoId, projectRoot);
    fs.mkdirSync(path.dirname(askPath), { recursive: true });
    const payload = {
      todoId: seat.todoId,
      subagent: seat.subagent,
      server: seat.server,
      tool: seat.tool,
      args: seat.args,
      sessionId: seat.sessionId,
      prompt: seat.prompt,
      dueReason: seat.dueReason,
    };
    fs.writeFileSync(askPath, `${JSON.stringify(payload, null, 2)}\n`);
    return { status: 'pending', askPath };
  }
}

export class InProcessConferHost implements ConferHostPort {
  constructor(private readonly answers: Record<string, string>) {}

  async call(seat: ConferHostSeat): Promise<ConferHostCall> {
    const text = this.answers[seat.todoId] ?? this.answers[seat.subagent];
    if (text === undefined) {
      return { status: 'pending', askPath: '' };
    }
    return { status: 'answered', text };
  }
}
