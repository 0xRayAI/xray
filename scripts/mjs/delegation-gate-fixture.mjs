/**
 * Shared 4/4 delegation gate fixture — seeds consumer tmp workspace.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const FIXTURE_SESSION_ID = 'verify-gate';

export function seedDelegationGateFixture(tmp) {
  mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
  writeFileSync(
    join(tmp, '.xray', 'features.json'),
    JSON.stringify({
      multi_agent_orchestration: {
        enabled: true,
        lead_dev_mode: true,
        auto_chain_delegations: true,
      },
    }),
  );
  writeFileSync(
    join(tmp, '.xray', 'state', 'lead-dev-plan.json'),
    JSON.stringify({
      active: true,
      persistedAt: new Date().toISOString(),
      phases: [],
    }),
  );
  writeFileSync(
    join(tmp, '.xray', 'state', 'pending-delegations.json'),
    JSON.stringify({
      sessionId: FIXTURE_SESSION_ID,
      createdAt: new Date().toISOString(),
      ttlMs: 14400000,
      delegations: [
        {
          id: 'del-verify',
          taskId: 'impl-1',
          agent: 'backend-engineer',
          taskDescription: 'implement',
          taskType: 'implement',
          sessionId: FIXTURE_SESSION_ID,
          planTodoId: '2.1',
          planTodoTask: 'swap deps',
          matchMethod: 'agent-only',
          matchConfidence: 0.5,
          status: 'pending',
          createdAt: new Date().toISOString(),
          satisfiedAt: null,
          spawnHint: {
            tool: 'Task',
            subagent_type: 'backend-engineer',
            description: 'Lead-dev delegation 2.1',
            planTodoId: '2.1',
            delegationId: 'del-verify',
          },
        },
      ],
    }),
  );
}

export function seedSpawnTodoPlan(tmp) {
  writeFileSync(
    join(tmp, '.xray', 'state', 'lead-dev-plan.json'),
    JSON.stringify({
      active: true,
      persistedAt: new Date().toISOString(),
      phases: [
        {
          id: 'phase-2',
          todos: [
            {
              id: '2.1',
              task: 'swap deps',
              subagent: 'backend-engineer',
              status: 'pending',
            },
          ],
        },
      ],
    }),
  );
}