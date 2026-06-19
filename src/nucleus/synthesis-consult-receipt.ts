/**
 * Synthesis consult receipt SSOT — outcome-based completion for s.N todos.
 * Receipts live at `.xray/state/synthesis-consult-{todoId}.json`.
 */

import * as fs from 'fs';
import * as path from 'path';


export type SynthesisConsultVerdict = 'PASS' | 'CONDITIONAL' | 'FAIL';

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
  return value === 'PASS' || value === 'CONDITIONAL' || value === 'FAIL';
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

export function parseConsultVerdictFromText(text: string): SynthesisConsultVerdict | null {
  const normalized = text.toUpperCase();
  if (/\bCONDITIONAL(\s+PASS)?\b/.test(normalized)) return 'CONDITIONAL';
  if (/\b(?:PASS|SHIP)\b/.test(normalized)) return 'PASS';
  if (/\bFAIL\b/.test(normalized)) return 'FAIL';
  return null;
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