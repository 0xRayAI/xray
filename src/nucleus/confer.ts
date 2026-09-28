/**
 * Confer — mandatory 3-agent quorum SSOT (researcher / architect-tools / code-review).
 * Triggered automatically at synthesis checkpoint; records consult receipts + plan todos.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MANDATORY_MAJOR_CONSULTS } from './autonomy-kernel.js';
import {
  areSynthesisConsultTodosComplete,
  getNextRequiredTodo,
  getSynthesisConsultTodos,
  isSynthesisRealignmentPlan,
  loadPersistedLeadDevPlan,
  updatePlanTodoStatus,
  type PersistedLeadDevPlan,
} from './lead-dev-plan-persistence.js';
import {
  buildReceiptFromConsultOutput,
  consultVerdictAllowsTodoCompletion,
  listUnreviewedSynthesisConsultReceipts,
  tryRecordSynthesisConsultReceipt,
  parseConsultVerdictFromText,
  type SynthesisConsultReceipt,
  type SynthesisConsultVerdict,
} from './synthesis-consult-receipt.js';
import { isSynthesisCheckpointDue } from './synthesis.js';
import { conferDefaultForProfile, resolveRuntimeSuitProfile } from './suit-temperament.js';

export const CONFER_AGENTS = [...MANDATORY_MAJOR_CONSULTS] as const;

export interface ConferConfig {
  enabled: boolean;
  on_synthesis: boolean;
}

export interface ConferCheckpointState {
  version: 1;
  sessionId: string;
  triggeredAt: string;
  dueReason: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAgents: string[];
  lastError?: string;
}

export interface ConferAgentResult {
  todoId: string;
  subagent: string;
  outputText: string;
  receiptRecorded: boolean;
  todoCompleted: boolean;
  verdict: SynthesisConsultReceipt['verdict'] | null;
  error?: string;
}

export interface ConferQuorumResult {
  status: 'completed' | 'partial' | 'skipped' | 'failed';
  agents: ConferAgentResult[];
  message: string;
}

const STATE_VERSION = 1 as const;

export function conferCheckpointPath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, '.xray', 'state', 'confer-checkpoint.json');
}

export function defaultConferConfig(): ConferConfig {
  return { enabled: true, on_synthesis: true };
}

export function loadConferConfig(projectRoot = process.cwd()): ConferConfig {
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  const profile = resolveRuntimeSuitProfile(projectRoot);
  if (profile === 'strict') {
    return { enabled: true, on_synthesis: true };
  }
  if (!fs.existsSync(featuresPath)) {
    return conferDefaultForProfile(profile)
      ? defaultConferConfig()
      : { enabled: false, on_synthesis: false };
  }
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      multi_agent_orchestration?: {
        confer?: Partial<ConferConfig>;
        confer_on_synthesis?: boolean;
      };
    };
    const orch = data.multi_agent_orchestration ?? {};
    const raw = orch.confer ?? {};
    if (profile === 'frontier') {
      const optedIn = raw.enabled === true || orch.confer_on_synthesis === true;
      return { enabled: optedIn, on_synthesis: optedIn };
    }
    return {
      enabled: raw.enabled !== false && orch.confer_on_synthesis !== false,
      on_synthesis: raw.on_synthesis !== false && orch.confer_on_synthesis !== false,
    };
  } catch {
    return conferDefaultForProfile(profile)
      ? defaultConferConfig()
      : { enabled: false, on_synthesis: false };
  }
}

export function isConferEnabled(projectRoot = process.cwd()): boolean {
  return loadConferConfig(projectRoot).enabled;
}

export function loadConferCheckpoint(
  projectRoot = process.cwd(),
): ConferCheckpointState | null {
  const statePath = conferCheckpointPath(projectRoot);
  if (!fs.existsSync(statePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as ConferCheckpointState;
  } catch {
    return null;
  }
}

export function saveConferCheckpoint(
  state: ConferCheckpointState,
  projectRoot = process.cwd(),
): string {
  const statePath = conferCheckpointPath(projectRoot);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return statePath;
}

export function triggerConferCheckpoint(
  sessionId: string,
  dueReason: string | null,
  projectRoot = process.cwd(),
): ConferCheckpointState {
  const state: ConferCheckpointState = {
    version: STATE_VERSION,
    sessionId,
    triggeredAt: new Date().toISOString(),
    dueReason,
    status: 'pending',
    completedAgents: [],
  };
  saveConferCheckpoint(state, projectRoot);
  return state;
}

export function isConferPending(
  projectRoot = process.cwd(),
  sessionId?: string | null,
): boolean {
  const plan = loadPersistedLeadDevPlan(projectRoot);
  if (!plan || !isSynthesisRealignmentPlan(plan)) return false;
  if (areSynthesisConsultTodosComplete(plan)) return false;
  if (sessionId && isSynthesisCheckpointDue(projectRoot, sessionId)) return true;
  const state = loadConferCheckpoint(projectRoot);
  if (!state || state.status === 'completed') return false;
  if (sessionId && state.sessionId !== sessionId) return false;
  return true;
}

export function buildConferPrompt(
  subagent: string,
  todoTask: string,
  collocatedText: string,
  dueReason: string | null,
): string {
  const reasonLine = dueReason ? `Due: ${dueReason}\n\n` : '';
  return `${reasonLine}## Confer quorum — ${subagent}

${todoTask}

Review the collocated synthesis context and return a structured verdict.

**Required in your response:**
- Verdict: PASS | CONDITIONAL | FAIL
- Top risks (bulleted)
- Hardening note / recommendations

---

${collocatedText}`;
}

/** Map confer subagent → MCP server + tool. */
export function conferAgentMcpTarget(subagent: string): {
  server: string;
  tool: string;
  args: (prompt: string, projectRoot: string) => Record<string, unknown>;
} {
  switch (subagent) {
    case 'architect-tools':
      return {
        server: 'architect-tools',
        tool: 'architecture-assessment',
        args: (prompt, projectRoot) => ({
          projectRoot,
          assessmentType: 'comprehensive',
          focusMetrics: ['complexity', 'coupling', 'cohesion', 'testability', 'scalability'],
          conferPrompt: prompt,
        }),
      };
    case 'researcher':
      return {
        server: 'researcher',
        tool: 'analyze_proposal',
        args: (prompt) => ({
          proposalTitle: 'Synthesis confer — researcher',
          proposalDescription: prompt,
          proposalType: 'synthesis-confer',
          evidence: [],
        }),
      };
    case 'code-review':
    default:
      return {
        server: 'code-review',
        tool: 'analyze_proposal',
        args: (prompt) => ({
          proposalTitle: 'Synthesis confer — code-review',
          proposalDescription: prompt,
          proposalType: 'synthesis-confer',
          evidence: [],
        }),
      };
  }
}

function extractMcpText(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> })?.content;
  if (Array.isArray(content)) {
    return content.map((c) => c.text ?? '').join('\n');
  }
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

export async function invokeConferAgent(
  subagent: string,
  prompt: string,
  projectRoot = process.cwd(),
): Promise<string> {
  const { mcpClientManager } = await import('../mcps/mcp-client.js');
  const target = conferAgentMcpTarget(subagent);
  const args = target.args(prompt, projectRoot);
  const result = await mcpClientManager.callServerTool(target.server, target.tool, args);
  const text = extractMcpText(result);
  if (!text.trim()) {
    throw new Error(`Empty confer response from ${subagent}`);
  }
  if (!parseConsultVerdictFromText(text)) {
    throw new Error(
      `Confer response from ${subagent} missing parseable verdict (expected a final Verdict: PASS|CONDITIONAL|FAIL or DECISION: approve|reject|abstain line)`,
    );
  }
  return text;
}

export function applyConferConsultResult(
  todoId: string,
  subagent: string,
  sessionId: string,
  outputText: string,
  projectRoot = process.cwd(),
): ConferAgentResult {
  const receipt = tryRecordSynthesisConsultReceipt(
    todoId,
    subagent,
    sessionId,
    outputText,
    projectRoot,
  );
  let todoCompleted = false;
  if (receipt && consultVerdictAllowsTodoCompletion(receipt.verdict, projectRoot)) {
    todoCompleted = updatePlanTodoStatus(todoId, 'completed', projectRoot);
  }
  return {
    todoId,
    subagent,
    outputText,
    receiptRecorded: receipt != null,
    todoCompleted,
    verdict: receipt?.verdict ?? buildReceiptFromConsultOutput(todoId, subagent, sessionId, outputText)?.verdict ?? null,
  };
}

function fixtureConsultOutput(verdict: SynthesisConsultVerdict, subagent: string): string {
  if (verdict === 'UNREVIEWED') {
    return [
      'DECISION: abstain',
      'CONFIDENCE: 0.58',
      `REASONING: Local confer (${subagent}); nested LLM not configured.`,
      'Hardening: governance LLM absent — abstain is not a review',
    ].join('\n');
  }
  const riskLine =
    verdict === 'FAIL'
      ? '- Top risk: fixture FAIL must keep the consult todo open'
      : 'Top risks: none';
  return `Verdict: ${verdict}\n${riskLine}\nHardening: confer fixture quorum for ${subagent}`;
}

export function writeFixtureConferReceipt(
  todoId: string,
  subagent: string,
  sessionId: string,
  projectRoot = process.cwd(),
  verdict: SynthesisConsultVerdict = 'PASS',
): ConferAgentResult {
  return applyConferConsultResult(
    todoId,
    subagent,
    sessionId,
    fixtureConsultOutput(verdict, subagent),
    projectRoot,
  );
}

export function conferUnreviewedBootHint(projectRoot = process.cwd()): {
  conferUnreviewed: true;
  conferUnreviewedTodoIds: string[];
  conferUnreviewedHint: string;
} | null {
  const receipts = listUnreviewedSynthesisConsultReceipts(projectRoot);
  if (receipts.length === 0) return null;
  const ids: string[] = [];
  for (const receipt of receipts) {
    if (receipt.todoId) ids.push(receipt.todoId);
  }
  const listed = ids.length > 0 ? ids.join(', ') : 'consult';
  const strict = resolveRuntimeSuitProfile(projectRoot) === 'strict';
  const conferUnreviewedHint = strict
    ? `Confer UNREVIEWED (${listed}): no governance LLM. Strict suit_temperament keeps the todo open.`
    : `Confer UNREVIEWED (${listed}): no governance LLM. Receipt recorded; the todo still completes unless suit_temperament.profile is strict.`;
  return { conferUnreviewed: true, conferUnreviewedTodoIds: ids, conferUnreviewedHint };
}

export async function runConferQuorum(
  projectRoot = process.cwd(),
  sessionId: string,
  options: {
    collocatedText?: string;
    dueReason?: string | null;
    fixture?: boolean;
    /** Verdict written for every fixture agent. Defaults to PASS. */
    fixtureVerdict?: SynthesisConsultVerdict;
  } = {},
): Promise<ConferQuorumResult> {
  const cfg = loadConferConfig(projectRoot);
  if (!cfg.enabled || !cfg.on_synthesis) {
    return {
      status: 'skipped',
      agents: [],
      message: 'Confer disabled in features.json',
    };
  }

  const plan = loadPersistedLeadDevPlan(projectRoot);
  if (!plan || !isSynthesisRealignmentPlan(plan)) {
    return {
      status: 'skipped',
      agents: [],
      message: 'No synthesis realignment plan — confer not applicable',
    };
  }

  if (areSynthesisConsultTodosComplete(plan)) {
    return {
      status: 'completed',
      agents: [],
      message: 'Confer already complete — all consult todos finished',
    };
  }

  const state = triggerConferCheckpoint(
    sessionId,
    options.dueReason ?? null,
    projectRoot,
  );
  state.status = 'in_progress';
  saveConferCheckpoint(state, projectRoot);

  const collocated =
    options.collocatedText?.trim() ||
    '# Synthesis confer\n\nReview checkpoint context and realign plan.';
  const agents: ConferAgentResult[] = [];

  for (const todo of getSynthesisConsultTodos(plan)) {
    if (todo.status === 'completed') continue;

    try {
      let agentResult: ConferAgentResult;
      if (options.fixture) {
        agentResult = writeFixtureConferReceipt(
          todo.id,
          todo.subagent,
          sessionId,
          projectRoot,
          options.fixtureVerdict ?? 'PASS',
        );
      } else {
        const prompt = buildConferPrompt(
          todo.subagent,
          todo.task,
          collocated,
          options.dueReason ?? null,
        );
        const outputText = await invokeConferAgent(todo.subagent, prompt, projectRoot);
        agentResult = applyConferConsultResult(
          todo.id,
          todo.subagent,
          sessionId,
          outputText,
          projectRoot,
        );
      }
      agents.push(agentResult);

      if (agentResult.receiptRecorded && agentResult.todoCompleted) {
        state.completedAgents.push(todo.subagent);
        saveConferCheckpoint(state, projectRoot);
      } else {
        state.status = 'failed';
        state.lastError =
          agentResult.verdict === 'FAIL' || agentResult.verdict === 'UNREVIEWED'
            ? `Confer ${agentResult.verdict} blocked ${todo.id}`
            : `Receipt or todo completion failed for ${todo.id}`;
        saveConferCheckpoint(state, projectRoot);
        return {
          status: 'partial',
          agents,
          message: state.lastError,
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      state.status = 'failed';
      state.lastError = message;
      saveConferCheckpoint(state, projectRoot);
      agents.push({
        todoId: todo.id,
        subagent: todo.subagent,
        outputText: '',
        receiptRecorded: false,
        todoCompleted: false,
        verdict: null,
        error: message,
      });
      return { status: 'failed', agents, message };
    }
  }

  const refreshed = loadPersistedLeadDevPlan(projectRoot);
  const done =
    refreshed &&
    isSynthesisRealignmentPlan(refreshed) &&
    areSynthesisConsultTodosComplete(refreshed);

  state.status = done ? 'completed' : 'failed';
  if (!done) state.lastError = 'Consult todos remain after confer loop';
  saveConferCheckpoint(state, projectRoot);

  return {
    status: done ? 'completed' : 'partial',
    agents,
    message: done
      ? 'Confer quorum complete — researcher, architect-tools, code-review consulted'
      : (state.lastError ?? 'Confer incomplete'),
  };
}

const CONFER_AGENT_EMOJI: Record<string, string> = {
  researcher: '🔍',
  'architect-tools': '🏗️',
  'code-review': '✅',
  'code-reviewer': '✅',
  architect: '🏗️',
  strategist: '🎯',
};

function conferAgentEmoji(subagent: string): string {
  return CONFER_AGENT_EMOJI[subagent] ?? '🤖';
}

export function formatConferQuorumReport(result: ConferQuorumResult): string {
  if (result.status === 'skipped') {
    return `ℹ️ Confer skipped: ${result.message}`;
  }
  const lines = [
    `## Confer quorum — ${result.status.toUpperCase()}`,
    result.message,
    '',
  ];
  for (const agent of result.agents) {
    const emoji = conferAgentEmoji(agent.subagent);
    lines.push(
      `- ${emoji} **${agent.todoId}** (${agent.subagent}): verdict=${agent.verdict ?? 'n/a'} receipt=${agent.receiptRecorded} todo=${agent.todoCompleted}${agent.error ? ` error=${agent.error}` : ''}`,
    );
  }
  const plan = loadPersistedLeadDevPlan();
  const next = plan ? getNextRequiredTodo(plan) : null;
  if (next) {
    lines.push('', `**Next todo:** ${next.id} (${next.subagent})`);
  }
  return lines.join('\n');
}