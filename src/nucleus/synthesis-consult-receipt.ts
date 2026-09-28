/**
 * Synthesis consult receipt SSOT — outcome-based completion for s.N todos.
 * Receipts live at `.xray/state/synthesis-consult-{todoId}.json`.
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveRuntimeSuitProfile } from './suit-temperament.js';


export type SynthesisConsultVerdict = 'PASS' | 'CONDITIONAL' | 'FAIL' | 'UNREVIEWED';

export interface SynthesisConsultReceipt {
  sessionId: string;
  subagent: string;
  verdict: SynthesisConsultVerdict;
  topRisks: string[];
  hardeningNote: string;
  todoId?: string;
  recordedAt?: string;
}

const CONSULT_TODO_PATTERN = /^s\.\d+$/;

export function isSynthesisConsultTodoId(todoId: string): boolean {
  return CONSULT_TODO_PATTERN.test(todoId);
}

export function synthesisConsultReceiptPath(
  todoId: string,
  projectRoot = process.cwd(),
): string {
  return path.join(projectRoot, '.xray', 'state', `synthesis-consult-${todoId}.json`);
}

export function loadSynthesisConsultReceipt(
  todoId: string,
  projectRoot = process.cwd(),
): SynthesisConsultReceipt | null {
  const receiptPath = synthesisConsultReceiptPath(todoId, projectRoot);
  if (!fs.existsSync(receiptPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(receiptPath, 'utf8')) as SynthesisConsultReceipt;
  } catch {
    return null;
  }
}

export function writeSynthesisConsultReceipt(
  todoId: string,
  receipt: SynthesisConsultReceipt,
  projectRoot = process.cwd(),
): string {
  const receiptPath = synthesisConsultReceiptPath(todoId, projectRoot);
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  const payload: SynthesisConsultReceipt = {
    ...receipt,
    todoId,
    recordedAt: receipt.recordedAt ?? new Date().toISOString(),
  };
  fs.writeFileSync(receiptPath, JSON.stringify(payload, null, 2));
  return receiptPath;
}

function normalizeSubagent(agent: string): string {
  const key = agent.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'bug-triage-specialist': 'bug-triage',
    'code-reviewer': 'code-review',
  };
  return aliases[key] ?? key;
}

function subagentsAlign(expected: string, actual: string): boolean {
  const e = normalizeSubagent(expected);
  const a = normalizeSubagent(actual);
  return e === a || e.includes(a) || a.includes(e);
}

function isValidVerdict(value: unknown): value is SynthesisConsultVerdict {
  return value === 'PASS' || value === 'CONDITIONAL' || value === 'FAIL' || value === 'UNREVIEWED';
}

/**
 * FAIL always blocks consult-todo completion.
 * UNREVIEWED blocks only when suit_temperament.profile is strict.
 * Guided, frontier, and missing temperament still complete the todo.
 */
export function consultVerdictAllowsTodoCompletion(
  verdict: SynthesisConsultVerdict,
  projectRoot = process.cwd(),
): boolean {
  if (verdict === 'FAIL') return false;
  if (verdict === 'UNREVIEWED' && resolveRuntimeSuitProfile(projectRoot) === 'strict') {
    return false;
  }
  return true;
}

export function validateSynthesisConsultReceipt(
  receipt: SynthesisConsultReceipt,
  todoId: string,
  expected?: { sessionId?: string | null; subagent?: string },
): boolean {
  if (!receipt.sessionId || !receipt.subagent || !isValidVerdict(receipt.verdict)) {
    return false;
  }
  if (!Array.isArray(receipt.topRisks)) return false;
  if (typeof receipt.hardeningNote !== 'string') return false;
  if (expected?.sessionId && receipt.sessionId !== expected.sessionId) return false;
  if (expected?.subagent && !subagentsAlign(expected.subagent, receipt.subagent)) {
    return false;
  }
  if (receipt.todoId && receipt.todoId !== todoId) return false;
  return true;
}

export function hasValidSynthesisConsultReceipt(
  todoId: string,
  projectRoot = process.cwd(),
  expected?: { sessionId?: string | null; subagent?: string },
): boolean {
  const receipt = loadSynthesisConsultReceipt(todoId, projectRoot);
  if (!receipt) return false;
  return validateSynthesisConsultReceipt(receipt, todoId, expected);
}

const VERDICT_LINE = /^\s*(?:[-*•]\s*)?Verdict:\s*(.+)$/i;
const DECISION_LINE = /^\s*(?:[-*•]\s*)?DECISION:\s*(.+)$/i;

function verdictsMentioned(body: string): Set<SynthesisConsultVerdict> {
  const upper = body.toUpperCase();
  const found = new Set<SynthesisConsultVerdict>();
  if (/\bUNREVIEWED\b/.test(upper)) found.add('UNREVIEWED');
  if (/\bCONDITIONAL\b/.test(upper)) found.add('CONDITIONAL');
  if (/\b(?:FAIL|REJECT(?:ED)?)\b/.test(upper)) found.add('FAIL');
  if (/\b(?:PASS|SHIP|APPROVED?)\b/.test(upper)) found.add('PASS');
  return found;
}

function singleExplicitVerdict(body: string): SynthesisConsultVerdict | null {
  if (body.includes('|')) return null;
  const found = verdictsMentioned(body);
  if (
    found.size === 2 &&
    found.has('CONDITIONAL') &&
    found.has('PASS') &&
    /\bCONDITIONAL\s+PASS\b/i.test(body)
  ) {
    return 'CONDITIONAL';
  }
  if (found.size !== 1) return null;
  return [...found][0] ?? null;
}

function isAbstainWithoutModel(text: string): boolean {
  return /nested LLM not configured/i.test(text);
}

function verdictFromDecisionToken(
  token: string,
  fullText: string,
): SynthesisConsultVerdict | null {
  if (token === 'approve' || token === 'approved' || token === 'pass' || token === 'ship') {
    return 'PASS';
  }
  if (token === 'reject' || token === 'rejected' || token === 'fail') return 'FAIL';
  if (token === 'abstain') {
    return isAbstainWithoutModel(fullText) ? 'UNREVIEWED' : 'CONDITIONAL';
  }
  if (token === 'needs_revision' || token === 'conditional' || token === 'revise') {
    return 'CONDITIONAL';
  }
  return null;
}

function classifyVerdictLine(line: string): SynthesisConsultVerdict | null {
  const match = VERDICT_LINE.exec(line);
  if (!match?.[1]) return null;
  return singleExplicitVerdict(match[1].trim());
}

function classifyDecisionLine(line: string, fullText: string): SynthesisConsultVerdict | null {
  const match = DECISION_LINE.exec(line);
  if (!match?.[1]) return null;
  const body = match[1].trim();
  if (body.includes('|')) return null;
  const words =
    body
      .match(
        /\b(approve|approved|pass|reject|rejected|fail|abstain|needs_revision|conditional|revise|ship)\b/gi,
      )
      ?.map((word) => word.toLowerCase()) ?? [];
  if (new Set(words).size !== 1) return null;
  return verdictFromDecisionToken(words[0] ?? '', fullText);
}

/**
 * Last explicit `Verdict:` or `DECISION:` line wins.
 * A line that lists several options (the confer prompt echo) is not a verdict.
 * Abstain with no governance model is UNREVIEWED; other abstains stay CONDITIONAL.
 */
export function parseConsultVerdictFromText(text: string): SynthesisConsultVerdict | null {
  let found: SynthesisConsultVerdict | null = null;
  for (const line of text.split('\n')) {
    const fromVerdict = classifyVerdictLine(line);
    if (fromVerdict) {
      found = fromVerdict;
      continue;
    }
    const fromDecision = classifyDecisionLine(line, text);
    if (fromDecision) found = fromDecision;
  }
  return found;
}

export function listUnreviewedSynthesisConsultReceipts(
  projectRoot = process.cwd(),
): SynthesisConsultReceipt[] {
  const dir = path.join(projectRoot, '.xray', 'state');
  if (!fs.existsSync(dir)) return [];
  const receipts: SynthesisConsultReceipt[] = [];
  for (const name of fs.readdirSync(dir)) {
    const match = /^synthesis-consult-(s\.\d+)\.json$/.exec(name);
    const todoId = match?.[1];
    if (!todoId) continue;
    const receipt = loadSynthesisConsultReceipt(todoId, projectRoot);
    if (receipt?.verdict === 'UNREVIEWED') receipts.push(receipt);
  }
  return receipts;
}

export function extractTopRisksFromText(text: string, max = 5): string[] {
  const risks: string[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(?:[-*•]|\d+\.)\s*(?:risk|top\s*risk)/i.test(trimmed)) {
      risks.push(trimmed.replace(/^[-*•\d.]+\s*/i, '').slice(0, 240));
    } else if (/^risk\s*:/i.test(trimmed)) {
      risks.push(trimmed.replace(/^risk\s*:\s*/i, '').slice(0, 240));
    }
    if (risks.length >= max) break;
  }
  return risks;
}

export function extractHardeningNoteFromText(text: string, maxChars = 500): string {
  const match = text.match(/(?:hardening|recommend(?:ation)?s?)\s*[:\n]([\s\S]{0,800})/i);
  if (match?.[1]) return match[1].trim().slice(0, maxChars);
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines.slice(-3).join(' ').slice(0, maxChars);
}

export function coerceToolOutputText(output: unknown): string {
  if (typeof output === 'string') return output;
  if (output == null) return '';
  if (typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.content === 'string') return obj.content;
    if (typeof obj.message === 'string') return obj.message;
    try {
      return JSON.stringify(output);
    } catch {
      return String(output);
    }
  }
  return String(output);
}

export function buildReceiptFromConsultOutput(
  todoId: string,
  subagent: string,
  sessionId: string,
  outputText: string,
): SynthesisConsultReceipt | null {
  const text = outputText.trim();
  if (!text) return null;

  const verdict = parseConsultVerdictFromText(text);
  if (!verdict) return null;

  return {
    sessionId,
    subagent,
    verdict,
    topRisks: extractTopRisksFromText(text),
    hardeningNote: extractHardeningNoteFromText(text),
    todoId,
  };
}

export function tryRecordSynthesisConsultReceipt(
  todoId: string,
  subagent: string,
  sessionId: string,
  output: unknown,
  projectRoot = process.cwd(),
): SynthesisConsultReceipt | null {
  const receipt = buildReceiptFromConsultOutput(
    todoId,
    subagent,
    sessionId,
    coerceToolOutputText(output),
  );
  if (!receipt || !validateSynthesisConsultReceipt(receipt, todoId, { sessionId, subagent })) {
    return null;
  }
  writeSynthesisConsultReceipt(todoId, receipt, projectRoot);
  return receipt;
}