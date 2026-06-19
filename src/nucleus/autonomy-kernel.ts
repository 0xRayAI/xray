/**
 * Lead-dev plan builder — internal implementation for orchestrator + hooks.
 * Config: features.json → multi_agent_orchestration (lead_dev_mode), NOT a separate surface.
 */

import * as fs from 'fs';
import * as path from 'path';
import { featuresConfigLoader } from '../core/features-config.js';
import type { MultiAgentOrchestrationConfig } from '../core/features-config.js';
import { scoreComplexity } from './thin-dispatch.js';

export const LEAD_DEV_RULES = [
  'Phased plan + detailed todos; assign best subagent; monitor output; iterate fully',
  'Lead dev takes helm — loop test fix until complete; no permission pings',
  'Per-suite test triage after major changes; full suite only when individuals pass',
  'Lead stays main thread; subagents execute; update todos continuously',
  'Read all console and test output; triage fix rerun',
  'Never defer errors as pre-existing — add todo and resolve',
  'Resolve all errors before phase completion',
] as const;

export const SYNTHESIS_REALIGNMENT_PHASE_ID = 'phase-synthesis';

export const MANDATORY_MAJOR_CONSULTS = [
  'researcher',
  'architect-tools',
  'code-review',
] as const;

export type SubagentRoute =
  | 'strategist'
  | 'architect-tools'
  | 'researcher'
  | 'backend-engineer'
  | 'frontend-engineer'
  | 'bug-triage'
  | 'code-review'
  | 'security-audit'
  | 'enforcer';

export interface LeadDevTodo {
  id: string;
  task: string;
  subagent: SubagentRoute;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface LeadDevPhase {
  id: string;
  name: string;
  goal: string;
  definitionOfDone: string;
  todos: LeadDevTodo[];
}

export interface LeadDevPlanTaskInput {
  description: string;
  type?: string;
}

export interface LeadDevPlan {
  active: boolean;
  rules: readonly string[];
  codexTerms: [59, 67, 68, 69];
  description: string;
  complexity: number;
  requiresPhasedPlan: boolean;
  recommendedStrategy: string;
  mandatoryConsults: string[];
  phases: LeadDevPhase[];
  testProtocol: { perSuiteFirst: boolean; fullSuiteGate: boolean; hint: string };
}

const TASK_TYPE_ROUTES: Record<string, SubagentRoute> = {
  plan: 'strategist',
  architecture: 'architect-tools',
  research: 'researcher',
  implement: 'backend-engineer',
  frontend: 'frontend-engineer',
  test: 'bug-triage',
  review: 'code-review',
  security: 'security-audit',
  governance: 'enforcer',
};

function orchestrationConfig(): MultiAgentOrchestrationConfig {
  try {
    return featuresConfigLoader.loadConfig().multi_agent_orchestration;
  } catch {
    return { enabled: true } as MultiAgentOrchestrationConfig;
  }
}

export function isLeadDevModeActive(): boolean {
  const cfg = orchestrationConfig();
  return cfg.enabled && cfg.lead_dev_mode !== false;
}

export function routeSubagent(taskType: string): SubagentRoute {
  return TASK_TYPE_ROUTES[taskType.toLowerCase().trim()] ?? 'backend-engineer';
}

export function shouldFlagFullTestSuite(command: string): boolean {
  const cfg = orchestrationConfig();
  if (!cfg.enabled || cfg.per_suite_test_triage === false) return false;
  const cmd = command.toLowerCase();
  const isTest =
    /\b(npm\s+(run\s+)?test|vitest\s+run|pnpm\s+test|yarn\s+test)\b/.test(cmd);
  const hasFocusedTarget =
    /--\s+\S+\.test/.test(cmd) ||
    /vitest\s+run\s+\S+\.test/.test(cmd) ||
    /\btest:\w+/.test(cmd);
  return isTest && !hasFocusedTarget;
}

function buildImplementationTodos(
  description: string,
  taskTypes: string[],
  taskInputs: LeadDevPlanTaskInput[],
  idPrefix: string,
): LeadDevTodo[] {
  if (taskInputs.length > 0) {
    return taskInputs.map((t, i) => ({
      id: `${idPrefix}.${i + 1}`,
      task: t.description.slice(0, 200),
      subagent: routeSubagent(t.type ?? 'implement'),
      status: 'pending' as const,
    }));
  }
  return taskTypes.map((type, i) => ({
    id: `${idPrefix}.${i + 1}`,
    task: description.slice(0, 200),
    subagent: routeSubagent(type),
    status: 'pending' as const,
  }));
}

/** Mandatory-consult plan for synthesis checkpoint realignment (no implementation phase). */
export function buildSynthesisCheckpointPlan(dueReason: string | null): LeadDevPlan | null {
  if (!isLeadDevModeActive()) return null;

  const cfg = orchestrationConfig();
  const mandatoryConsults =
    cfg.auto_consult_major_work !== false ? [...MANDATORY_MAJOR_CONSULTS] : [];

  if (mandatoryConsults.length === 0) return null;

  const reasonSuffix = dueReason ? ` (${dueReason})` : '';

  return {
    active: true,
    rules: LEAD_DEV_RULES,
    codexTerms: [59, 67, 68, 69],
    description: `Synthesis checkpoint: reflect and realign${reasonSuffix}`,
    complexity: 30,
    requiresPhasedPlan: true,
    recommendedStrategy: 'sequential',
    mandatoryConsults,
    phases: [
      {
        id: SYNTHESIS_REALIGNMENT_PHASE_ID,
        name: 'Reflect & realign',
        goal: 'Review collocated context and mandatory consults before resuming execution',
        definitionOfDone:
          'researcher + architect-tools + code-review consulted; todos realigned',
        todos: mandatoryConsults.map((subagent, i) => ({
          id: `s.${i + 1}`,
          task: `Synthesis consult ${subagent}: review checkpoint context and realign plan`,
          subagent: subagent as SubagentRoute,
          status: 'pending' as const,
        })),
      },
    ],
    testProtocol: {
      perSuiteFirst: cfg.per_suite_test_triage !== false,
      fullSuiteGate: false,
      hint: 'Synthesis checkpoint — consult mandatory agents before resuming gated work',
    },
  };
}

export function buildLeadDevPlan(
  description: string,
  taskTypes: string[] = ['implement'],
  taskInputs: LeadDevPlanTaskInput[] = [],
  mcpOverallComplexity?: number,
): LeadDevPlan | null {
  if (!isLeadDevModeActive()) return null;

  const cfg = orchestrationConfig();
  const threshold = cfg.phased_plan_threshold ?? 25;
  const score = scoreComplexity(description, { taskTypes });
  const mcpScore =
    mcpOverallComplexity !== undefined && Number.isFinite(mcpOverallComplexity)
      ? Math.round(mcpOverallComplexity)
      : 0;
  const complexity = Math.max(score.score, mcpScore);
  const requiresPhasedPlan = complexity > threshold || taskInputs.length > 1;

  const mandatoryConsults =
    cfg.auto_consult_major_work !== false && requiresPhasedPlan
      ? [...MANDATORY_MAJOR_CONSULTS]
      : [];

  const phases: LeadDevPhase[] = requiresPhasedPlan
    ? [
        {
          id: 'phase-1',
          name: 'Research & architecture',
          goal: 'Understand scope before edits',
          definitionOfDone: 'researcher + architect-tools + code-review consulted',
          todos: mandatoryConsults.map((subagent, i) => ({
            id: `1.${i + 1}`,
            task: `Consult ${subagent} on: ${description.slice(0, 120)}`,
            subagent: subagent as SubagentRoute,
            status: 'pending' as const,
          })),
        },
        {
          id: 'phase-2',
          name: 'Implementation',
          goal: 'Execute with best subagent per todo',
          definitionOfDone: 'Affected per-suite tests green',
          todos: buildImplementationTodos(description, taskTypes, taskInputs, '2'),
        },
        {
          id: 'phase-3',
          name: 'Verification',
          goal: 'Per-suite triage then full suite gate',
          definitionOfDone: 'Full test suite green; zero open errors',
          todos: [
            {
              id: '3.1',
              task: 'Run affected test files individually; triage and fix',
              subagent: 'bug-triage',
              status: 'pending',
            },
            {
              id: '3.2',
              task: 'Run full test suite gate',
              subagent: 'bug-triage',
              status: 'pending',
            },
          ],
        },
      ]
    : [
        {
          id: 'phase-1',
          name: 'Direct execution',
          goal: description.slice(0, 120),
          definitionOfDone: 'Task complete with tests green',
          todos: buildImplementationTodos(description, taskTypes, taskInputs, '1'),
        },
      ];

  return {
    active: true,
    rules: LEAD_DEV_RULES,
    codexTerms: [59, 67, 68, 69],
    description,
    complexity,
    requiresPhasedPlan,
    recommendedStrategy: score.recommendedStrategy,
    mandatoryConsults,
    phases,
    testProtocol: {
      perSuiteFirst: cfg.per_suite_test_triage !== false,
      fullSuiteGate: true,
      hint: 'After major changes: npm test -- path/to/file.test.ts → fix → repeat → full npm test last',
    },
  };
}

export function buildSessionBootContext(): Record<string, unknown> {
  if (!isLeadDevModeActive()) {
    return { lead_dev_mode: false, reason: 'multi_agent_orchestration.lead_dev_mode=false' };
  }
  return {
    lead_dev_mode: true,
    codexTerms: [67, 68],
    rules: LEAD_DEV_RULES,
    mcpBoot: 'xray-orchestrator → analyze-complexity (includes lead-dev plan when active)',
    message:
      '[0xRay] Lead dev mode ON — phased todos, subagent dispatch, loop until green.',
  };
}

/** Persist plan for PreToolUse spawn_subagent gate */
export function persistLeadDevPlan(plan: LeadDevPlan, projectRoot = process.cwd()): string {
  const stateDir = path.join(projectRoot, '.xray', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  const planPath = path.join(stateDir, 'lead-dev-plan.json');
  const payload = { ...plan, persistedAt: new Date().toISOString() };
  fs.writeFileSync(planPath, JSON.stringify(payload, null, 2));
  return planPath;
}

/** @deprecated Use isLeadDevModeActive */
export const isAutonomyKernelActive = isLeadDevModeActive;
/** @deprecated Use buildLeadDevPlan */
export const buildAutonomyIntake = buildLeadDevPlan;
export const AUTONOMY_RULES = LEAD_DEV_RULES;