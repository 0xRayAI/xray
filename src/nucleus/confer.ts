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
  consultVerdictBlocksCompletion,
  loadSynthesisConsultReceipt,
  tryRecordSynthesisConsultReceipt,
  parseConsultVerdictFromText,
  type SynthesisConsultReceipt,
} from './synthesis-consult-receipt.js';
import { formatGovernanceVoteText, localConferVote } from '../governance/local-confer.js';
import { isSynthesisCheckpointDue } from './synthesis.js';
import {
  InProcessConferHost,
  SessionConferHost,
  type ConferHostPort,
  type ConferHostSeat,
} from './confer-host.js';

export { InProcessConferHost, SessionConferHost };
export type { ConferHostPort, ConferHostSeat };

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
  status: 'completed' | 'partial' | 'skipped' | 'failed' | 'pending';
  agents: ConferAgentResult[];
  message: string;
}

const STATE_VERSION = 1 as const;

export function conferCheckpointPath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, '.xray', 'state', 'confer-checkpoint.json');
}

export function defaultConferConfig(): ConferConfig {
  return { enabled: false, on_synthesis: false };
}

/** Fixture PASS is a test harness. Live orchestrate-task and XRAY_CONFER_FIXTURE cannot reach it. */
export const CONFER_FIXTURE_UNREACHABLE = 'Confer fixture is unreachable outside tests';

export function conferFixtureAllowed(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
}

/** A suit profile does not enable Confer. Missing confer key stays off, including strict. */
export function loadConferConfig(projectRoot = process.cwd()): ConferConfig {
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) return defaultConferConfig();
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      multi_agent_orchestration?: {
        confer?: Partial<ConferConfig>;
        confer_on_synthesis?: boolean;
      };
    };
    const orch = data.multi_agent_orchestration ?? {};
    const raw = orch.confer ?? {};
    const optedIn = raw.enabled === true || orch.confer_on_synthesis === true;
    return {
      enabled: optedIn,
      on_synthesis: optedIn && raw.on_synthesis !== false,
    };
  } catch {
    return defaultConferConfig();
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
        server: 'xray-architect-tools',
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
        server: 'xray-researcher',
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
        server: 'xray-code-review',
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

function conferHostSeat(
  subagent: string,
  prompt: string,
  projectRoot: string,
  sessionId: string,
  todoId: string,
  dueReason: string | null,
): ConferHostSeat {
  const target = conferAgentMcpTarget(subagent);
  return {
    todoId,
    subagent,
    server: target.server,
    tool: target.tool,
    args: target.args(prompt, projectRoot),
    sessionId,
    prompt,
    dueReason,
  };
}

export async function invokeConferAgent(
  subagent: string,
  prompt: string,
  projectRoot = process.cwd(),
  host: ConferHostPort = new SessionConferHost(),
  sessionId = '',
  todoId = subagent,
  dueReason: string | null = null,
): Promise<string> {
  const call = await host.call(
    conferHostSeat(subagent, prompt, projectRoot, sessionId, todoId, dueReason),
    projectRoot,
  );
  if (call.status === 'pending') {
    throw new Error(`Confer ask pending for ${subagent} at ${call.askPath}`);
  }
  const text = call.text;
  if (!text.trim()) {
    throw new Error(`Empty confer response from ${subagent}`);
  }
  if (!parseConsultVerdictFromText(text)) {
    throw new Error(
      `Confer response from ${subagent} missing parseable verdict (expected an explicit Verdict: PASS|CONDITIONAL|FAIL|UNREVIEWED line, or DECISION: approve|reject|abstain)`,
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
  if (receipt && !consultVerdictBlocksCompletion(receipt.verdict)) {
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

export function buildFixtureConferOutput(
  subagent: string,
  verdict: SynthesisConsultReceipt['verdict'] = 'PASS',
  noLlm = false,
): string {
  if (noLlm) {
    const role = subagent === 'code-review' ? 'code-review' : 'researcher';
    return formatGovernanceVoteText(localConferVote({ role, llmConfigured: false }));
  }
  return `Verdict: ${verdict}\nTop risks: none\nHardening: confer fixture quorum for ${subagent}`;
}

export function writeFixtureConferReceipt(
  todoId: string,
  subagent: string,
  sessionId: string,
  projectRoot = process.cwd(),
  verdict: SynthesisConsultReceipt['verdict'] = 'PASS',
  noLlm = false,
): ConferAgentResult {
  return applyConferConsultResult(
    todoId,
    subagent,
    sessionId,
    buildFixtureConferOutput(subagent, verdict, noLlm),
    projectRoot,
  );
}

export async function runConferQuorum(
  projectRoot = process.cwd(),
  sessionId: string,
  options: {
    collocatedText?: string;
    dueReason?: string | null;
    fixture?: boolean;
    /** Used only when fixture is true. Defaults to PASS. FAIL and UNREVIEWED do not complete the todo. */
    fixtureVerdict?: SynthesisConsultReceipt['verdict'];
    /** Fixture text is the real no-model localConferVote (UNREVIEWED), not a hardcoded PASS. */
    fixtureNoLlm?: boolean;
    /** Used only when fixture is true. Replaces the generated fixture text for every consult. */
    fixtureOutput?: string;
    /** Live path. Default writes an ask for the wearing TUI and does not spawn a server. */
    host?: ConferHostPort;
  } = {},
): Promise<ConferQuorumResult> {
  if (options.fixture && !conferFixtureAllowed()) {
    return {
      status: 'failed',
      agents: [],
      message: CONFER_FIXTURE_UNREACHABLE,
    };
  }

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

  if (areSynthesisConsultTodosComplete(plan) && consultReceiptsAreRealApproves(plan, sessionId, projectRoot)) {
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
    if (todo.status === 'completed' && consultReceiptIsRealPass(todo.id, sessionId, plan, projectRoot)) {
      continue;
    }
    if (todo.status === 'completed') {
      updatePlanTodoStatus(todo.id, 'pending', projectRoot);
    }

    try {
      let agentResult: ConferAgentResult;
      if (options.fixture) {
        agentResult =
          options.fixtureOutput !== undefined
            ? applyConferConsultResult(
                todo.id,
                todo.subagent,
                sessionId,
                options.fixtureOutput,
                projectRoot,
              )
            : writeFixtureConferReceipt(
                todo.id,
                todo.subagent,
                sessionId,
                projectRoot,
                options.fixtureVerdict ?? 'PASS',
                options.fixtureNoLlm === true,
              );
      } else {
        const prompt = buildConferPrompt(
          todo.subagent,
          todo.task,
          collocated,
          options.dueReason ?? null,
        );
        const host = options.host ?? new SessionConferHost();
        const call = await host.call(
          conferHostSeat(
            todo.subagent,
            prompt,
            projectRoot,
            sessionId,
            todo.id,
            options.dueReason ?? null,
          ),
          projectRoot,
        );
        if (call.status === 'pending') {
          agents.push({
            todoId: todo.id,
            subagent: todo.subagent,
            outputText: '',
            receiptRecorded: false,
            todoCompleted: false,
            verdict: null,
          });
          continue;
        }
        agentResult = applyConferConsultResult(
          todo.id,
          todo.subagent,
          sessionId,
          call.text,
          projectRoot,
        );
      }
      agents.push(agentResult);

      if (agentResult.receiptRecorded && agentResult.todoCompleted) {
        state.completedAgents.push(todo.subagent);
        saveConferCheckpoint(state, projectRoot);
      } else {
        state.status = 'failed';
        state.lastError = consultVerdictBlocksCompletion(agentResult.verdict)
          ? `${agentResult.verdict} blocks ${todo.id}`
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

  if (agents.some((agent) => agent.verdict === null && !agent.receiptRecorded && !agent.error)) {
    state.status = 'pending';
    delete state.lastError;
    saveConferCheckpoint(state, projectRoot);
    return {
      status: 'pending',
      agents,
      message: 'Confer asks written. The wearing TUI calls its MCP servers and records each verdict.',
    };
  }

  const refreshed = loadPersistedLeadDevPlan(projectRoot);
  const done =
    refreshed &&
    isSynthesisRealignmentPlan(refreshed) &&
    areSynthesisConsultTodosComplete(refreshed) &&
    consultReceiptsAreRealApproves(refreshed, sessionId, projectRoot);

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

function consultReceiptIsRealPass(
  todoId: string,
  sessionId: string,
  plan: PersistedLeadDevPlan,
  projectRoot: string,
): boolean {
  const receipt = loadSynthesisConsultReceipt(todoId, projectRoot);
  if (receipt?.verdict !== 'PASS') return false;
  if (sessionId && receipt.sessionId !== sessionId) return false;
  if (plan.consultCycleId && receipt.cycleId !== plan.consultCycleId) return false;
  return true;
}

function consultReceiptsAreRealApproves(
  plan: PersistedLeadDevPlan,
  sessionId: string,
  projectRoot: string,
): boolean {
  const todos = getSynthesisConsultTodos(plan);
  if (todos.length === 0) return false;
  return todos.every((todo) => consultReceiptIsRealPass(todo.id, sessionId, plan, projectRoot));
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